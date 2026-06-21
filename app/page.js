'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Flame, TrendingUp, Target, BookOpen, Wrench, Eye, Droplet, Wind,
  Users, Heart, CheckCircle2, XCircle, Lightbulb, Gauge, LogOut,
  ChevronRight, RotateCcw, Truck, PlayCircle, Clock, AlertTriangle, ClipboardList
} from 'lucide-react'
import { questionProvider, SUBSKILLS, makeRng } from '../lib/questionEngine'
import {
  storage, blankState, recordAnswer, endSession, readinessScore,
  overallConfidence, domainMastery, subskillMastery, subskillConfidence,
  weakAreas, buildTargetedSession, recommendations,
  commitSessionStats, categoryStats
} from '../lib/learningEngine'
import { generateScenario, generateBoard, generateRecallQuestions } from '../lib/recallScenario'

const DOMAIN_ICONS = { mechanical: Wrench, math: TrendingUp, reading: BookOpen, recall: Eye }
const DOMAIN_ACCENT = {
  mechanical: { soft: 'bg-amber-50', ring: 'ring-amber-200', text: 'text-amber-700', bar: 'bg-amber-500', dot: 'bg-amber-500' },
  math: { soft: 'bg-sky-50', ring: 'ring-sky-200', text: 'text-sky-700', bar: 'bg-sky-500', dot: 'bg-sky-500' },
  reading: { soft: 'bg-violet-50', ring: 'ring-violet-200', text: 'text-violet-700', bar: 'bg-violet-500', dot: 'bg-violet-500' },
  recall: { soft: 'bg-rose-50', ring: 'ring-rose-200', text: 'text-rose-700', bar: 'bg-rose-500', dot: 'bg-rose-500' },
}
const SCENE_ICONS = { truck: Truck, eye: Eye, droplet: Droplet, flame: Flame, users: Users, wind: Wind, heart: Heart, check: CheckCircle2 }

function masteryColor(m) {
  if (m >= 0.8) return 'text-emerald-600'
  if (m >= 0.5) return 'text-amber-600'
  return 'text-rose-600'
}
function barColor(m) {
  if (m >= 0.8) return 'bg-emerald-500'
  if (m >= 0.5) return 'bg-amber-500'
  return 'bg-rose-500'
}

export default function App() {
  const [page, setPage] = useState('login')
  const [userId, setUserId] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [users, setUsers] = useState([])
  const [state, setState] = useState(null)

  const [queue, setQueue] = useState([])
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [sessionLog, setSessionLog] = useState([])
  const [sessionLabel, setSessionLabel] = useState('')

  const [scenario, setScenario] = useState(null)
  const [sceneStep, setSceneStep] = useState(0)
  const [sceneTimeLeft, setSceneTimeLeft] = useState(0)
  const [sceneProgress, setSceneProgress] = useState(0) // 0..1 continuous, drives entrances
  const sceneTimer = useRef(null)

  useEffect(() => { setUsers(storage.listUsers()) }, [])

  const persist = (next) => { setState(next); storage.save(next.userId, next) }

  const login = (name) => {
    const id = name.trim()
    if (!id) return
    let s = storage.load(id)
    if (!s) { s = blankState(id); storage.save(id, s) }
    const fresh = blankState(id)
    for (const d of Object.keys(fresh.domains))
      for (const sk of Object.keys(fresh.domains[d]))
        if (!s.domains[d]?.[sk]) { s.domains[d] = s.domains[d] || {}; s.domains[d][sk] = fresh.domains[d][sk] }
    // Heal states saved before per-category stats existed.
    if (!s.domainStats) s.domainStats = fresh.domainStats
    else for (const d of Object.keys(fresh.domainStats))
      if (!s.domainStats[d]) s.domainStats[d] = fresh.domainStats[d]
    setUserId(id); setState(s); setUsers(storage.listUsers()); setPage('dashboard')
  }

  const logout = () => { setUserId(''); setNameInput(''); setState(null); setPage('login') }

  const startSession = (plan, label) => {
    const rng = makeRng(Date.now())
    const qs = plan.map(p => questionProvider.generate({
      domain: p.domain, subskill: p.subskill, difficulty: p.difficulty, count: 1, rng,
    })[0]).filter(Boolean)
    setQueue(qs); setQIndex(0); setSelected(null); setRevealed(false)
    setSessionLog([]); setSessionLabel(label); setPage('session')
  }

  const startTargeted = () => startSession(buildTargetedSession(state, 10), 'Targeted Practice')

  const startDomain = (domain) => {
    // Recall is always trained visually (study a board, then recall) — never
    // as standalone text questions.
    if (domain === 'recall') { startRecallDrill(); return }
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
      if (d === 'recall') continue // recall is trained through the visual drill
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
      setQIndex(qIndex + 1)
      setSelected(null)
      setRevealed(false)
    } else {
      const next = { ...state }
      endSession(next)
      commitSessionStats(next, sessionLog)  // roll results into category stats
      persist(next)
      setPage('results')
    }
  }

  const startRecallDrill = () => {
    const diff = state ? Math.max(1, Math.min(5, Math.round(domainMastery(state, 'recall') * 4) + 1)) : 2
    const sc = generateBoard(Date.now(), diff)
    setScenario(sc)
    setSceneStep(0)
    setSceneProgress(0)
    setSceneTimeLeft(Math.round(sc.durationMs / 1000))
    setSessionLabel('Visual Recall Drill')
    setPage('recallWatch')
  }

  useEffect(() => {
    if (page !== 'recallWatch' || !scenario) return
    if (sceneTimer.current) clearInterval(sceneTimer.current)
    const TICK = 100
    let elapsed = 0
    sceneTimer.current = setInterval(() => {
      elapsed += TICK
      const p = Math.min(1, elapsed / scenario.durationMs)
      setSceneProgress(p)
      setSceneTimeLeft(Math.max(0, Math.ceil((scenario.durationMs - elapsed) / 1000)))
      if (elapsed >= scenario.durationMs) {
        clearInterval(sceneTimer.current)
        const qs = generateRecallQuestions(scenario, Date.now(), Math.min(6, Math.max(4, scenario.detailCount - 1)))
        setQueue(qs); setQIndex(0); setSelected(null); setRevealed(false); setSessionLog([])
        setPage('recallQuiz')
      }
    }, TICK)
    return () => clearInterval(sceneTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, scenario])

  const skipToQuiz = () => {
    if (sceneTimer.current) clearInterval(sceneTimer.current)
    const qs = generateRecallQuestions(scenario, Date.now(), Math.min(6, Math.max(4, scenario.detailCount - 1)))
    setQueue(qs); setQIndex(0); setSelected(null); setRevealed(false); setSessionLog([])
    setPage('recallQuiz')
  }

  const answerRecall = (idx) => {
    if (revealed) return
    setSelected(idx); setRevealed(true)
    const q = queue[qIndex]
    const correct = idx === q.correct
    const next = { ...state }
    recordAnswer(next, 'recall', q.subskill, correct)
    persist(next)
    setSessionLog(l => [...l, { correct, domain: 'recall', subskill: q.subskill, q }])
  }

  const nextRecall = () => {
    if (qIndex + 1 < queue.length) {
      setQIndex(qIndex + 1); setSelected(null); setRevealed(false)
    } else {
      const next = { ...state }
      endSession(next)
      commitSessionStats(next, sessionLog)  // roll recall results into category stats
      persist(next)
      setPage('results')
    }
  }

  const resetProgress = () => {
    if (typeof window !== 'undefined' && window.confirm('Reset all progress for this profile? This cannot be undone.')) {
      persist(blankState(userId))
    }
  }

  if (page === 'login') {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3">
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
            <button onClick={() => login(nameInput)}
              className="mt-4 w-full bg-orange-600 hover:bg-orange-500 transition rounded-lg py-3 font-semibold">
              Start training
            </button>
            {users.length > 0 && (
              <div className="mt-6">
                <p className="text-xs uppercase tracking-wide text-neutral-500 mb-2">Continue as</p>
                <div className="flex flex-wrap gap-2">
                  {users.map(u => (
                    <button key={u} onClick={() => login(u)}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm ring-1 ring-neutral-700">{u}</button>
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
              <div className="w-9 h-9 rounded-lg bg-orange-600 grid place-items-center"><Flame className="w-5 h-5" /></div>
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
          <section className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-white rounded-2xl p-6 ring-1 ring-neutral-200">
              <div className="flex items-center gap-2 text-neutral-500 text-sm"><Gauge className="w-4 h-4" /> Readiness score</div>
              <div className="mt-2 flex items-end gap-3">
                <span className="text-6xl font-bold tracking-tight text-neutral-900">{ready}</span>
                <span className="text-neutral-400 mb-2">/ 100</span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-neutral-200 overflow-hidden">
                <div className="h-full bg-orange-600 transition-all" style={{ width: ready + '%' }} />
              </div>
              <p className="mt-3 text-sm text-neutral-600">
                {fresh ? 'Run the diagnostic so the engine can map your strengths and gaps.'
                  : 'Confidence in this estimate: ' + conf + '%. Readiness weights your weakest domain, so balanced practice moves it fastest.'}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 ring-1 ring-neutral-200 flex flex-col">
              <div className="flex items-center gap-2 text-neutral-500 text-sm"><Target className="w-4 h-4" /> Recommended next</div>
              <div className="mt-3 space-y-2 flex-1">
                {recs.slice(0, 3).map((r, i) => (
                  <div key={i} className="text-sm text-neutral-700 flex gap-2">
                    <Lightbulb className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" /><span>{r.text}</span>
                  </div>
                ))}
              </div>
              <button onClick={fresh ? startDiagnostic : startTargeted}
                className="mt-4 w-full bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
                {fresh ? 'Start diagnostic' : 'Start targeted practice'} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </section>

          <section className="mt-4">
            <button onClick={startRecallDrill}
              className="w-full text-left rounded-2xl p-5 ring-1 ring-neutral-800 bg-neutral-900 text-neutral-100 hover:bg-neutral-800 transition flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-rose-600/20 text-rose-400 grid place-items-center">
                  <PlayCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold">Visual Recall Drill</p>
                  <p className="text-neutral-400 text-sm">Study an operational board — command board, roster, dispatch, floor plan — then recall the details from memory.</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-neutral-500" />
            </button>
          </section>

          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 mb-3">Category Performance</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {Object.entries(SUBSKILLS).map(([dKey, dDef]) => {
                const Icon = DOMAIN_ICONS[dKey]
                const accent = DOMAIN_ACCENT[dKey]
                const m = domainMastery(state, dKey)
                const cs = categoryStats(state, dKey)
                return (
                  <div key={dKey} className="rounded-2xl ring-1 ring-neutral-200 bg-white overflow-hidden">
                    <div className={'px-5 py-4 ' + accent.soft}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={'w-9 h-9 rounded-lg bg-white grid place-items-center ' + accent.text}><Icon className="w-5 h-5" /></div>
                          <p className="font-semibold text-neutral-900">{dDef.label}</p>
                        </div>
                        {cs.started
                          ? <span className={'text-sm font-bold ' + masteryColor(cs.pct / 100)}>{cs.pct}%</span>
                          : <span className="text-xs font-medium text-neutral-400">Not started</span>}
                      </div>
                      {/* Real category stats — updates after every session */}
                      <div className="mt-2 flex items-center gap-3 text-xs text-neutral-600">
                        {cs.started ? (
                          <>
                            <span>{cs.correct}/{cs.attempted} correct</span>
                            <span className="text-neutral-300">·</span>
                            <span>{cs.sessions} session{cs.sessions === 1 ? '' : 's'}</span>
                            <span className="text-neutral-300">·</span>
                            <span>Last: <span className={'font-semibold ' + masteryColor((cs.lastScore ?? 0) / 100)}>{cs.lastScore}%</span></span>
                          </>
                        ) : (
                          <span className="text-neutral-400">0 questions completed</span>
                        )}
                      </div>
                    </div>
                    <div className="px-5 py-4 space-y-2.5">
                      {Object.entries(dDef.subskills).map(([skKey, skDef]) => {
                        const s = state.domains[dKey][skKey]
                        const sm = subskillMastery(s)
                        return (
                          <div key={skKey} className="flex items-center gap-3">
                            <span className="text-xs text-neutral-600 w-32 shrink-0 truncate">{skDef.label}</span>
                            <div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                              <div className={'h-full ' + barColor(sm) + ' transition-all'} style={{ width: Math.round(sm * 100) + '%' }} />
                            </div>
                            <span className={'text-xs font-medium w-12 text-right ' + (s.attempts ? masteryColor(sm) : 'text-neutral-300')}>
                              {s.attempts ? Math.round(sm * 100) + '%' : '—'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                    <div className="px-5 pb-4">
                      <button onClick={() => startDomain(dKey)}
                        className={'w-full text-sm font-medium rounded-lg py-2 ' + accent.soft + ' ' + accent.text + ' hover:opacity-80 transition'}>
                        Practice {dDef.label}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

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
                        {w.untouched ? 'Not started yet' : w.due ? 'Due for spaced review' : 'Mastery ' + Math.round(w.mastery * 100) + '% · difficulty ' + w.difficulty + '/5'}
                      </p>
                    </div>
                    <div className="w-24 h-1.5 rounded-full bg-neutral-200 overflow-hidden">
                      <div className={'h-full ' + barColor(w.mastery)} style={{ width: Math.round(w.mastery * 100) + '%' }} />
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={startTargeted}
                className="mt-5 w-full bg-orange-600 hover:bg-orange-500 text-white rounded-lg py-2.5 text-sm font-semibold">
                Practice my weakest subskills
              </button>
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
              <div className="h-full bg-orange-600 transition-all" style={{ width: progress + '%' }} />
            </div>
          </div>
        </header>

        <main key={q.id} className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex items-center gap-2 mb-4">
            <span className={'text-xs px-2 py-1 rounded-full ' + accent.soft + ' ' + accent.text + ' ring-1 ' + accent.ring}>
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
                  className={'w-full text-left px-4 py-3.5 rounded-xl border-2 transition flex items-center justify-between ' + cls}>
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

  if (page === 'recallWatch' && scenario) {
    const b = scenario
    const p = sceneProgress
    const colorHex = (c) => c === 'lime-green' ? '#84cc16' : c === 'white' ? '#e5e5e5' : c
    const enterStyle = (i) => ({
      animation: 'recIn 0.45s cubic-bezier(.2,.8,.2,1) both',
      animationDelay: (i * 0.07) + 's',
    })

    // --- board renderers -----------------------------------------------------
    const Header = () => (
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-rose-600/20 text-rose-300 grid place-items-center">
            <ClipboardList className="w-4 h-4" />
          </span>
          <div>
            <p className="font-semibold text-neutral-100 leading-tight">{b.title}</p>
            <p className="text-[11px] text-neutral-500">
              {b.header && Object.values(b.header).join(' · ')}
            </p>
          </div>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-neutral-500 ring-1 ring-neutral-700 rounded px-2 py-0.5">
          {b.detailCount} details · D{b.difficulty}
        </span>
      </div>
    )

    const renderRows = (rows, render) => (
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} style={enterStyle(i)}
            className="rounded-lg bg-neutral-800/70 ring-1 ring-neutral-700 px-3 py-2.5">
            {render(r, i)}
          </div>
        ))}
      </div>
    )

    let body = null
    if (b.kind === 'command') {
      body = (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[['Incident', b.header.incident], ['Address', b.header.address], ['Command', b.header.command]].map(([k, v], i) => (
              <div key={i} style={enterStyle(i)} className="rounded-lg bg-neutral-800/70 ring-1 ring-neutral-700 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-neutral-500">{k}</p>
                <p className="text-sm font-medium text-neutral-100">{v}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] uppercase tracking-wide text-neutral-500 mb-1.5">Units (in arrival order)</p>
          {renderRows(b.rows, (r) => (
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-md bg-rose-600/20 text-rose-300 grid place-items-center text-xs font-bold">{r.arrival}</span>
              <Truck className="w-4 h-4 text-neutral-400" />
              <span className="text-sm font-medium text-neutral-100">{r.unit}</span>
              <span className="ml-auto text-xs text-neutral-400">{r.assignment}</span>
            </div>
          ))}
        </>
      )
    } else if (b.kind === 'roster') {
      body = (
        <>{renderRows(b.rows, (r) => (
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full ring-1 ring-neutral-600" style={{ background: colorHex(r.helmet) }} />
            <span className="text-sm font-semibold text-neutral-100 w-24">{r.name}</span>
            <span className="text-xs text-neutral-400 w-24">{r.rank}</span>
            <span className="ml-auto text-xs text-neutral-300">{r.assignment}</span>
          </div>
        ))}</>
      )
    } else if (b.kind === 'apparatus') {
      body = (
        <>{renderRows(b.rows, (r) => (
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5" style={{ color: colorHex(r.color) }} />
            <span className="text-sm font-semibold text-neutral-100 w-24">{r.unit}</span>
            <span className="text-xs text-neutral-500 w-16">{r.color}</span>
            <span className="text-xs text-neutral-400">{r.crew} crew</span>
            <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-neutral-700 text-neutral-200">{r.status}</span>
          </div>
        ))}</>
      )
    } else if (b.kind === 'dispatch') {
      body = (
        <div className="grid grid-cols-2 gap-2">
          {b.fields.map((f, i) => (
            <div key={i} style={enterStyle(i)} className="rounded-lg bg-neutral-800/70 ring-1 ring-neutral-700 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-neutral-500">{f.label}</p>
              <p className="text-sm font-medium text-neutral-100">{f.value}</p>
            </div>
          ))}
        </div>
      )
    } else if (b.kind === 'equipment') {
      body = (
        <>{renderRows(b.rows, (r) => (
          <div className="flex items-center gap-3">
            <Wrench className="w-4 h-4 text-neutral-400" />
            <span className="text-sm font-medium text-neutral-100">{r.tool}</span>
            <span className="ml-auto text-xs text-neutral-500">{r.compartment}</span>
            <span className="text-xs text-neutral-400 w-8 text-right">×{r.qty}</span>
          </div>
        ))}</>
      )
    } else if (b.kind === 'floorplan') {
      const d = b.diagram
      body = (
        <>
          <p className="text-[10px] uppercase tracking-wide text-neutral-500 mb-2">{d.stories}-story · entry {d.entry}</p>
          <div className="grid grid-cols-2 gap-2">
            {d.rooms.map((room, i) => {
              const isVictim = room === d.victimRoom
              return (
                <div key={i} style={enterStyle(i)}
                  className={'rounded-lg px-3 py-3 ring-1 text-sm font-medium ' +
                    (isVictim ? 'bg-rose-600/20 ring-rose-500/50 text-rose-200' : 'bg-neutral-800/70 ring-neutral-700 text-neutral-200')}>
                  <div className="flex items-center justify-between">
                    <span>{room}</span>
                    {isVictim && <Heart className="w-4 h-4 text-rose-400" />}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 ring-1 ring-amber-500/30 rounded-md px-2.5 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> {d.hazard} — {d.hazardSide} side
          </div>
        </>
      )
    }

    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100">
        <style>{`
          @keyframes recIn { from { opacity: 0; transform: translateY(6px) scale(0.98); } to { opacity: 1; transform: none; } }
        `}</style>
        <header className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-rose-400">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" /> STUDY THE BOARD — memorize the details
          </div>
          <div className="relative w-12 h-12">
            <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#3f3f46" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f43f5e" strokeWidth="3"
                strokeDasharray={2 * Math.PI * 15.5}
                strokeDashoffset={(2 * Math.PI * 15.5) * p}
                strokeLinecap="round" style={{ transition: 'stroke-dashoffset .1s linear' }} />
            </svg>
            <span className="absolute inset-0 grid place-items-center text-xs font-semibold text-neutral-200">{sceneTimeLeft}s</span>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6 pb-10">
          {/* Operational board */}
          <div className="rounded-2xl ring-1 ring-neutral-800 bg-neutral-900 p-5">
            <Header />
            {body}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs text-neutral-500">The board hides when the ring runs out. Then you'll recall the details.</p>
            <button onClick={skipToQuiz}
              className="text-sm bg-rose-600 hover:bg-rose-500 rounded-lg px-4 py-2 font-semibold">
              I'm ready — quiz me
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (page === 'recallQuiz' && queue.length) {
    const q = queue[qIndex]
    const progress = ((qIndex + (revealed ? 1 : 0)) / queue.length) * 100
    return (
      <div className="min-h-screen bg-neutral-100">
        <header className="bg-white ring-1 ring-neutral-200 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-neutral-700 flex items-center gap-2"><Eye className="w-4 h-4 text-rose-500" /> Recall — what did you observe?</span>
              <span className="text-neutral-500">{qIndex + 1} / {queue.length}</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-neutral-200 overflow-hidden">
              <div className="h-full bg-rose-500 transition-all" style={{ width: progress + '%' }} />
            </div>
          </div>
        </header>

        <main key={q.id} className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs px-2 py-1 rounded-full bg-rose-50 text-rose-700 ring-1 ring-rose-200">
              Recall · {SUBSKILLS.recall.subskills[q.subskill]?.label || q.subskill}
            </span>
          </div>
          <h2 className="text-xl font-semibold text-neutral-900 mb-5">{q.prompt}</h2>
          <div className="space-y-3">
            {q.options.map((opt, idx) => {
              const isCorrect = idx === q.correct
              const isPicked = idx === selected
              let cls = 'border-neutral-200 hover:border-rose-400 hover:bg-rose-50'
              if (revealed && isCorrect) cls = 'border-emerald-500 bg-emerald-50'
              else if (revealed && isPicked && !isCorrect) cls = 'border-rose-500 bg-rose-50'
              else if (revealed) cls = 'border-neutral-200 opacity-60'
              return (
                <button key={idx} disabled={revealed} onClick={() => answerRecall(idx)}
                  className={'w-full text-left px-4 py-3.5 rounded-xl border-2 transition flex items-center justify-between ' + cls}>
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
                <Lightbulb className="w-4 h-4 text-rose-500" /> Recall check
              </div>
              <p className="text-sm text-neutral-700 leading-relaxed">{q.explanation}</p>
              <button onClick={nextRecall}
                className="mt-4 w-full bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg py-3 font-semibold flex items-center justify-center gap-2">
                {qIndex + 1 < queue.length ? 'Next question' : 'See results'} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </main>
      </div>
    )
  }

  if (page === 'results' && state) {
    const correct = sessionLog.filter(l => l.correct).length
    const pct = sessionLog.length ? Math.round((correct / sessionLog.length) * 100) : 0
    const ready = readinessScore(state)

    const bySub = {}
    for (const l of sessionLog) {
      const key = l.domain + '::' + l.subskill
      bySub[key] = bySub[key] || { domain: l.domain, subskill: l.subskill, c: 0, n: 0 }
      bySub[key].n++; if (l.correct) bySub[key].c++
    }
    const subRows = Object.values(bySub).map(r => ({
      ...r,
      pct: Math.round((r.c / r.n) * 100),
      label: SUBSKILLS[r.domain]?.subskills[r.subskill]?.label || r.subskill,
      domainLabel: SUBSKILLS[r.domain]?.label || r.domain,
    })).sort((a, b) => a.pct - b.pct)
    const weakInSession = subRows.filter(r => r.pct < 70)
    const weakOverall = weakAreas(state, 3)

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
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 mb-4">Subskill breakdown</h2>
            <div className="space-y-3">
              {subRows.map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-800 truncate">{r.label}
                      <span className="text-neutral-400 font-normal"> · {r.domainLabel}</span></p>
                    <p className="text-xs text-neutral-500">{r.c} of {r.n} correct</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-28 h-1.5 rounded-full bg-neutral-200 overflow-hidden">
                      <div className={'h-full ' + barColor(r.pct / 100)} style={{ width: r.pct + '%' }} />
                    </div>
                    <span className={'text-sm font-semibold w-10 text-right ' + masteryColor(r.pct / 100)}>{r.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(weakInSession.length > 0 || weakOverall.length > 0) && (
            <div className="mt-6 bg-white rounded-2xl ring-1 ring-rose-200 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-rose-600 mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" /> Where to focus next
              </h2>
              {weakInSession.length > 0 ? (
                <p className="text-sm text-neutral-700 mb-3">
                  In this session you struggled most with{' '}
                  <strong>{weakInSession.map(w => w.label).join(', ')}</strong>. A targeted set will drill these at the right difficulty.
                </p>
              ) : (
                <p className="text-sm text-neutral-700 mb-3">Strong session. Your overall weakest areas are{' '}
                  <strong>{weakOverall.map(w => w.subskillLabel).join(', ')}</strong>.</p>
              )}
              <button onClick={startTargeted}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white rounded-lg py-2.5 text-sm font-semibold">
                Start targeted practice on weak areas
              </button>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button onClick={() => setPage('dashboard')}
              className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl py-3 font-semibold">
              Back to dashboard
            </button>
            {sessionLabel === 'Visual Recall Drill' ? (
              <button onClick={startRecallDrill}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white rounded-xl py-3 font-semibold">
                New recall drill
              </button>
            ) : (
              <button onClick={startTargeted}
                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white rounded-xl py-3 font-semibold">
                Practice weak areas
              </button>
            )}
          </div>
        </main>
      </div>
    )
  }

  return null
}
