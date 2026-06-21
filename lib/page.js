'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Flame, Award, TrendingUp, Target, Brain, BookOpen, Wrench, Eye,
  RotateCcw, LogOut, ChevronRight, CheckCircle2, XCircle, Lightbulb, Gauge
} from 'lucide-react'
import { questionProvider, SUBSKILLS, makeRng } from '../lib/questionEngine'
import {
  storage, blankState, recordAnswer, endSession, readinessScore,
  overallConfidence, domainMastery, subskillMastery, weakAreas,
  buildTargetedSession, recommendations
} from '../lib/learningEngine'

const DOMAIN_ICONS = { mechanical: Wrench, math: TrendingUp, reading: BookOpen, recall: Eye }
const DOMAIN_ACCENT = {
  mechanical: { bg: 'bg-amber-50', ring: 'ring-amber-200', text: 'text-amber-700', bar: 'bg-amber-500' },
  math: { bg: 'bg-sky-50', ring: 'ring-sky-200', text: 'text-sky-700', bar: 'bg-sky-500' },
  reading: { bg: 'bg-violet-50', ring: 'ring-violet-200', text: 'text-violet-700', bar: 'bg-violet-500' },
  recall: { bg: 'bg-rose-50', ring: 'ring-rose-200', text: 'text-rose-700', bar: 'bg-rose-500' },
}

export default function App() {
  const [page, setPage] = useState('login')
  const [userId, setUserId] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [users, setUsers] = useState([])
  const [state, setState] = useState(null)

  // session state
  const [queue, setQueue] = useState([])      // array of generated questions
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [sessionLog, setSessionLog] = useState([]) // {correct, domain, subskill}
  const [sessionLabel, setSessionLabel] = useState('')

  useEffect(() => { setUsers(storage.listUsers()) }, [])

  const persist = (next) => { setState(next); storage.save(next.userId, next) }

  const login = (name) => {
    const id = name.trim()
    if (!id) return
    let s = storage.load(id)
    if (!s) { s = blankState(id); storage.save(id, s) }
    // Heal state if new subskills were added since last save
    const fresh = blankState(id)
    for (const d of Object.keys(fresh.domains))
      for (const sk of Object.keys(fresh.domains[d]))
        if (!s.domains[d]?.[sk]) { s.domains[d] = s.domains[d] || {}; s.domains[d][sk] = fresh.domains[d][sk] }
    setUserId(id); setState(s); setUsers(storage.listUsers()); setPage('dashboard')
  }

  const logout = () => { setUserId(''); setNameInput(''); setState(null); setPage('login') }

  // ---- session builders -----------------------------------------------------
  const startSession = (plan, label) => {
    const rng = makeRng(Date.now())
    const qs = plan.map(p => questionProvider.generate({
      domain: p.domain, subskill: p.subskill, difficulty: p.difficulty, count: 1, rng,
    })[0]).filter(Boolean)
    setQueue(qs); setQIndex(0); setSelected(null); setRevealed(false)
    setSessionLog([]); setSessionLabel(label); setPage('session')
  }

  const startTargeted = () => {
    const plan = buildTargetedSession(state, 10)
    startSession(plan, 'Targeted Practice')
  }

  const startDomain = (domain) => {
    const subs = Object.keys(SUBSKILLS[domain].subskills)
    const plan = Array.from({ length: 10 }, (_, i) => {
      const sk = subs[i % subs.length]
      return { domain, subskill: sk, difficulty: state.domains[domain][sk].difficulty }
    })
    startSession(plan, SUBSKILLS[domain].label)
  }

  const startDiagnostic = () => {
    const plan = []
    for (const d of Object.keys(SUBSKILLS)) {
      const subs = Object.keys(SUBSKILLS[d].subskills)
      for (let i = 0; i < 2; i++) plan.push({ domain: d, subskill: subs[i % subs.length], difficulty: 2 })
    }
    startSession(plan, 'Diagnostic')
  }

  const answer = (idx) => {
    if (revealed) return
    setSelected(idx); setRevealed(true)
    const q = queue[qIndex]
    const correct = idx === q.correct
    const next = { ...state }
    recordAnswer(next, q.domain, q.subskill, correct)
    persist(next)
    setSessionLog(l => [...l, { correct, domain: q.domain, subskill: q.subskill, q }])
  }

  const nextQuestion = () => {
    if (qIndex + 1 < queue.length) {
      setQIndex(qIndex + 1); setSelected(null); setRevealed(false)
    } else {
      const next = { ...state }; endSession(next); persist(next); setPage('results')
    }
  }

  const resetProgress = () => {
    if (typeof window !== 'undefined' && window.confirm('Reset all progress for this profile? This cannot be undone.')) {
      const fresh = blankState(userId); persist(fresh)
    }
  }

  // ============================ LOGIN =======================================
  if (page === 'login') {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-orange-600 grid place-items-center shadow-lg shadow-orange-900/40">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">FCTC Aptitude Trainer</h1>
              <p className="text-neutral-400 text-sm">Adaptive prep that builds skill, not memorized answers</p>
            </div>
          </div>

          <div className="mt-8 bg-neutral-900 rounded-2xl p-6 ring-1 ring-neutral-800">
            <label className="text-sm text-neutral-300">Enter a profile name to begin</label>
            <input
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login(nameInput)}
              placeholder="e.g. your name or badge number"
              className="mt-2 w-full bg-neutral-800 rounded-lg px-4 py-3 outline-none ring-1 ring-neutral-700 focus:ring-orange-500 transition"
            />
            <button
              onClick={() => login(nameInput)}
              className="mt-4 w-full bg-orange-600 hover:bg-orange-500 transition rounded-lg py-3 font-semibold"
            >
              Start training
            </button>

            {users.length > 0 && (
              <div className="mt-6">
                <p className="text-xs uppercase tracking-wide text-neutral-500 mb-2">Continue as</p>
                <div className="flex flex-wrap gap-2">
                  {users.map(u => (
                    <button key={u} onClick={() => login(u)}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm ring-1 ring-neutral-700">
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <p className="text-center text-neutral-600 text-xs mt-6">Progress is saved on this device.</p>
        </div>
      </div>
    )
  }

  // ============================ DASHBOARD ===================================
  if (page === 'dashboard' && state) {
    const ready = readinessScore(state)
    const conf = overallConfidence(state)
    const recs = recommendations(state)
    const weak = weakAreas(state, 4)
    const fresh = state.totalAnswered === 0

    return (
      <div className="min-h-screen bg-neutral-100">
        <header className="bg-neutral-950 text-neutral-100">
          <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-600 grid place-items-center">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold leading-tight">FCTC Aptitude Trainer</p>
                <p className="text-neutral-400 text-xs">Signed in as {userId}</p>
              </div>
            </div>
            <button onClick={logout} className="flex items-center gap-2 text-sm text-neutral-300 hover:text-white">
              <LogOut className="w-4 h-4" /> Switch profile
            </button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-8">
          {/* Readiness hero */}
          <section className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-white rounded-2xl p-6 ring-1 ring-neutral-200">
              <div className="flex items-center gap-2 text-neutral-500 text-sm"><Gauge className="w-4 h-4" /> Readiness score</div>
              <div className="mt-2 flex items-end gap-3">
                <span className="text-6xl font-bold tracking-tight text-neutral-900">{ready}</span>
                <span className="text-neutral-400 mb-2">/ 100</span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-neutral-200 overflow-hidden">
                <div className="h-full bg-orange-600 transition-all" style={{ width: `${ready}%` }} />
              </div>
              <p className="mt-3 text-sm text-neutral-600">
                {fresh ? 'Run the diagnostic so the engine can map your strengths and gaps.'
                  : `Confidence in this estimate: ${conf}%. Readiness weights your weakest domain, so balanced practice moves it fastest.`}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 ring-1 ring-neutral-200 flex flex-col">
              <div className="flex items-center gap-2 text-neutral-500 text-sm"><Target className="w-4 h-4" /> Recommended next</div>
              <div className="mt-3 space-y-2 flex-1">
                {recs.slice(0, 3).map((r, i) => (
                  <div key={i} className="text-sm text-neutral-700 flex gap-2">
                    <Lightbulb className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <span>{r.text}</span>
                  </div>
                ))}
              </div>
              <button onClick={fresh ? startDiagnostic : startTargeted}
                className="mt-4 w-full bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
                {fresh ? 'Start diagnostic' : 'Start targeted practice'} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </section>

          {/* Domains */}
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 mb-3">Train by domain</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {Object.entries(SUBSKILLS).map(([dKey, dDef]) => {
                const Icon = DOMAIN_ICONS[dKey]
                const accent = DOMAIN_ACCENT[dKey]
                const m = Math.round(domainMastery(state, dKey) * 100)
                return (
                  <button key={dKey} onClick={() => startDomain(dKey)}
                    className={`text-left rounded-2xl p-5 ring-1 ${accent.ring} ${accent.bg} hover:shadow-md transition`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-white grid place-items-center ${accent.text}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-900">{dDef.label}</p>
                          <p className="text-xs text-neutral-500">{Object.keys(dDef.subskills).length} subskills</p>
                        </div>
                      </div>
                      <span className={`text-sm font-semibold ${accent.text}`}>{m}%</span>
                    </div>
                    <div className="mt-4 h-1.5 rounded-full bg-white/70 overflow-hidden">
                      <div className={`h-full ${accent.bar} transition-all`} style={{ width: `${m}%` }} />
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Weak areas */}
          {!fresh && (
            <section className="mt-8 bg-white rounded-2xl ring-1 ring-neutral-200 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 mb-4">Focus areas</h2>
              <div className="space-y-3">
                {weak.map((w, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-neutral-800">{w.subskillLabel}
                        <span className="text-neutral-400 font-normal"> · {w.domainLabel}</span></p>
                      <p className="text-xs text-neutral-500">
                        {w.untouched ? 'Not started yet'
                          : w.due ? 'Due for spaced review'
                          : `Mastery ${Math.round(w.mastery * 100)}% · difficulty ${w.difficulty}/5`}
                      </p>
                    </div>
                    <div className="w-24 h-1.5 rounded-full bg-neutral-200 overflow-hidden">
                      <div className="h-full bg-orange-500" style={{ width: `${Math.round(w.mastery * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="mt-8 flex justify-end">
            <button onClick={resetProgress} className="text-xs text-neutral-400 hover:text-rose-600 flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5" /> Reset progress
            </button>
          </div>
        </main>
      </div>
    )
  }

  // ============================ SESSION =====================================
  if (page === 'session' && queue.length) {
    const q = queue[qIndex]
    const accent = DOMAIN_ACCENT[q.domain]
    const progress = ((qIndex + (revealed ? 1 : 0)) / queue.length) * 100
    return (
      <div className="min-h-screen bg-neutral-100">
        <header className="bg-white ring-1 ring-neutral-200 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-neutral-700">{sessionLabel}</span>
              <span className="text-neutral-500">{qIndex + 1} / {queue.length}</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-neutral-200 overflow-hidden">
              <div className="h-full bg-orange-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex items-center gap-2 mb-4">
            <span className={`text-xs px-2 py-1 rounded-full ${accent.bg} ${accent.text} ring-1 ${accent.ring}`}>
              {SUBSKILLS[q.domain].label} · {SUBSKILLS[q.domain].subskills[q.subskill].label}
            </span>
            <span className="text-xs text-neutral-400">Difficulty {q.difficulty}/5</span>
          </div>

          {q.passage && (
            <pre className="whitespace-pre-wrap text-sm bg-neutral-900 text-neutral-100 rounded-xl p-4 mb-5 font-mono leading-relaxed">{q.passage}</pre>
          )}

          <h2 className="text-xl font-semibold text-neutral-900 mb-5">{q.prompt}</h2>

          <div className="space-y-3">
            {q.options.map((opt, idx) => {
              const isCorrect = idx === q.correct
              const isPicked = idx === selected
              let cls = 'border-neutral-200 hover:border-orange-400 hover:bg-orange-50'
              if (revealed && isCorrect) cls = 'border-emerald-500 bg-emerald-50'
              else if (revealed && isPicked && !isCorrect) cls = 'border-rose-500 bg-rose-50'
              else if (revealed) cls = 'border-neutral-200 opacity-60'
              return (
                <button key={idx} disabled={revealed} onClick={() => answer(idx)}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition flex items-center justify-between ${cls}`}>
                  <span className="text-neutral-800"><span className="text-neutral-400 mr-2">{String.fromCharCode(65 + idx)}</span>{opt}</span>
                  {revealed && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  {revealed && isPicked && !isCorrect && <XCircle className="w-5 h-5 text-rose-600" />}
                </button>
              )
            })}
          </div>

          {revealed && (
            <div className="mt-5 bg-white ring-1 ring-neutral-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700 mb-1">
                <Lightbulb className="w-4 h-4 text-orange-500" /> Why
              </div>
              <p className="text-sm text-neutral-700 leading-relaxed">{q.explanation}</p>
              <button onClick={nextQuestion}
                className="mt-4 w-full bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg py-3 font-semibold flex items-center justify-center gap-2">
                {qIndex + 1 < queue.length ? 'Next question' : 'See results'} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </main>
      </div>
    )
  }

  // ============================ RESULTS =====================================
  if (page === 'results' && state) {
    const correct = sessionLog.filter(l => l.correct).length
    const pct = sessionLog.length ? Math.round((correct / sessionLog.length) * 100) : 0
    const ready = readinessScore(state)
    // per-domain breakdown for this session
    const byDomain = {}
    for (const l of sessionLog) {
      byDomain[l.domain] = byDomain[l.domain] || { c: 0, n: 0 }
      byDomain[l.domain].n++; if (l.correct) byDomain[l.domain].c++
    }
    return (
      <div className="min-h-screen bg-neutral-100">
        <main className="max-w-2xl mx-auto px-6 py-12">
          <div className="bg-white rounded-2xl ring-1 ring-neutral-200 p-8 text-center">
            <p className="text-sm text-neutral-500">{sessionLabel} complete</p>
            <p className="text-6xl font-bold text-neutral-900 mt-2">{pct}%</p>
            <p className="text-neutral-600 mt-1">{correct} of {sessionLog.length} correct</p>
            <div className="mt-6 inline-flex items-center gap-2 text-sm bg-neutral-100 rounded-full px-4 py-2">
              <Gauge className="w-4 h-4 text-orange-500" /> Readiness now {ready}/100
            </div>
          </div>

          <div className="mt-6 bg-white rounded-2xl ring-1 ring-neutral-200 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 mb-4">This session by domain</h2>
            <div className="space-y-3">
              {Object.entries(byDomain).map(([d, v]) => {
                const accent = DOMAIN_ACCENT[d]
                const p = Math.round((v.c / v.n) * 100)
                return (
                  <div key={d} className="flex items-center justify-between">
                    <span className="text-sm text-neutral-700">{SUBSKILLS[d].label}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-1.5 rounded-full bg-neutral-200 overflow-hidden">
                        <div className={`h-full ${accent.bar}`} style={{ width: `${p}%` }} />
                      </div>
                      <span className="text-sm text-neutral-500 w-10 text-right">{p}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button onClick={() => setPage('dashboard')}
              className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl py-3 font-semibold">
              Back to dashboard
            </button>
            <button onClick={startTargeted}
              className="flex-1 bg-orange-600 hover:bg-orange-500 text-white rounded-xl py-3 font-semibold">
              Practice weak areas
            </button>
          </div>
        </main>
      </div>
    )
  }

  return null
}
