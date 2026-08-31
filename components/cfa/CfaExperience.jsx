'use client';
// ============================================================================
// CfaExperience.jsx — the CFA Level I learner experience (UALE-coherent, distinct
// from FCTC). Engine-driven: diagnostic, per-topic + mixed practice with Alyce
// misconception coaching, evidence-based readiness, study plan, mock modes, and PSM
// tracking. Device-local progress via cfaStore. No CFA Institute content reproduced.
// ============================================================================
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { TrendingUp, BookOpen, Target, Calendar, ClipboardCheck, ArrowRight, ArrowLeft, CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import { getCertification } from '../../lib/certRegistry.mjs';
import { analyzeSkills, EVIDENCE } from '../../lib/metrics.mjs';
import { metricsRegistryFor } from '../../lib/certRegistry.mjs';
import { generateCfaItem, generateVariedItem, buildCfaDiagnostic, cfaReadiness, generatableCells, cfaTopicAnalysis } from '../../lib/certifications/cfa/cfaEngine.mjs';
import { familyLabel } from '../../lib/certifications/cfa/families.mjs';
import { TOPIC_ORDER, TOPICS, EXAM, APPROVED_CALCULATORS, PRACTICE_LABEL } from '../../lib/certifications/cfa/cfaBlueprint.mjs';
import { recurringMisconceptions, misconceptionPhrase } from '../../lib/certifications/cfa/misconceptions.mjs';

// UALE is the authority for which modules a learner may access; "Back to UALE"
// returns the learner to the capability-aware UALE home rather than trapping them in
// this module. It is navigation only — it never grants access (UALE re-gates).
const UALE_HOME = 'https://florence-sand-phi.vercel.app/';
import { createStudyPlan, updateStudyPlan, recalcPlan } from '../../lib/studyPlan.mjs';
import { PSM_OPTIONS, PSM_STATUS, selectPsm, setPsmStatus, PSM_REQUIREMENT_NOTE } from '../../lib/certifications/cfa/psm.mjs';
import { loadCfaState, saveCfaState, recordCfaAnswer, emptyCfaState } from '../../lib/certifications/cfa/cfaStore.mjs';

const DEEP_TOPICS = new Set(['quant', 'ethics']); // shipped at depth; others are foundational
function rngFrom(seed) { let s = (seed >>> 0) || 1; return () => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }

export default function CfaExperience() {
  const cert = getCertification('cfa-level-1');
  const [state, setState] = useState(() => emptyCfaState());
  const [view, setView] = useState('home');
  const [session, setSession] = useState(null); // { queue, idx, picked, revealed, label }
  useEffect(() => { setState(loadCfaState()); }, []);
  const persist = (next) => { setState(next); saveCfaState(next); };

  const registry = useMemo(() => metricsRegistryFor('cfa-level-1'), []);
  const analysis = useMemo(() => analyzeSkills(state.domains, registry), [state, registry]);
  const readiness = useMemo(() => cfaReadiness(state.domains), [state]);
  const masteryByTopic = useMemo(() => {
    const m = {};
    for (const c of analysis) {
      (m[c.domain] = m[c.domain] || { sum: 0, n: 0, evaluated: 0 });
      if (c.evidenceState === EVIDENCE.EVALUATED) { m[c.domain].sum += c.mastery; m[c.domain].n += 1; m[c.domain].evaluated += 1; }
    }
    return m;
  }, [analysis]);

  const topicStatus = (t) => {
    const info = masteryByTopic[t];
    const evidence = info && info.evaluated ? 'evaluated' : 'insufficient';
    return { content: DEEP_TOPICS.has(t) ? 'available' : 'in-development', evidence, mastery: info && info.n ? info.sum / info.n : null };
  };

  // ---- session builders ---------------------------------------------------------
  const buildQueue = (cells, n, label) => {
    const rng = rngFrom(Math.floor((typeof performance !== 'undefined' ? performance.now() : 1) * 1000) % 2147483647 || 7);
    const q = [];
    // Anti-repetition: avoid concepts seen recently (across sessions) AND within this
    // queue, so a learner doesn't get the same structure back-to-back.
    const avoid = [...(state.recentConcepts || [])];
    for (let i = 0; i < n; i++) {
      const c = cells[i % cells.length];
      const item = generateVariedItem({ topic: c.topic, subskill: c.subskill, rng, avoidConcepts: avoid });
      if (item) { q.push(item); avoid.unshift(item.concept); if (avoid.length > 8) avoid.pop(); }
    }
    setSession({ queue: q, idx: 0, picked: null, revealed: false, label });
    setView('practice');
  };
  const startTopic = (t) => {
    const cells = generatableCells().filter((c) => c.topic === t);
    if (cells.length) buildQueue(cells, 6, TOPICS[t].label);
  };
  const startMixed = (n, label) => buildQueue(shuffle(generatableCells()), n, label);
  const startDiagnostic = () => {
    const { plan } = buildCfaDiagnostic(rngFrom(99), { perCell: 1 });
    buildQueue(plan, plan.length, 'Diagnostic');
  };

  // ---- answering ----------------------------------------------------------------
  const q = session && session.queue[session.idx];
  const reveal = () => {
    if (session.picked == null || session.revealed) return;
    const correct = session.picked === q.correct;
    // Capture a stable misconception key when the picked distractor carries one —
    // quant (TVM diagnostics) or a topic item (meta.misconceptions) — for the
    // cross-question memory. Correct answers carry none.
    const misKey = (q.meta?.diagnostics?.[session.picked]?.misconception) || (q.meta?.misconceptions?.[session.picked]) || null;
    // Live difficulty (the streak-driven ladder) — no longer hard-coded.
    const cur = state.domains?.[q.topic]?.[q.subskill];
    const askedD = (cur && cur.difficulty) || 2;
    const before = state.domains?.[q.topic]?.[q.subskill]?.difficulty || 2;
    const nextState = recordCfaAnswer(state, { domain: q.topic, subskill: q.subskill, correct, difficulty: askedD, misconceptionKey: misKey, family: q.family, concept: q.concept });
    persist(nextState);
    const after = nextState.domains?.[q.topic]?.[q.subskill]?.difficulty || 2;
    // Adaptive branch: on a miss, PRACTICE DIFFERENTLY — inject a fresh item in the
    // same topic but a different structure/family (avoiding this concept) right after,
    // so remediation isn't a near-identical repeat.
    let reteach = null;
    if (!correct) {
      const rng = rngFrom((Math.floor((typeof performance !== 'undefined' ? performance.now() : 2) * 1000) % 2147483647) || 13);
      reteach = generateVariedItem({ topic: q.topic, subskill: q.subskill, rng, avoidConcepts: [q.concept] });
    }
    setSession((s) => {
      const queue = s.queue.slice();
      if (reteach) queue.splice(s.idx + 1, 0, { ...reteach, _reteach: true, _fromFamily: q.family });
      return { ...s, queue, revealed: true, steppedUp: correct && after > before };
    });
  };
  const next = () => {
    if (session.idx + 1 >= session.queue.length) { setSession(null); setView('home'); return; }
    setSession((s) => ({ ...s, idx: s.idx + 1, picked: null, revealed: false, steppedUp: false }));
  };

  // ---- study plan ---------------------------------------------------------------
  const plan = state.plan || createStudyPlan({ certId: 'cfa-level-1' });
  const savePlan = (patch) => persist({ ...state, plan: updateStudyPlan(plan, patch) });
  const planCalc = useMemo(() => recalcPlan(plan, {
    topics: TOPIC_ORDER.map((k) => ({ key: k, weight: TOPICS[k].mid })),
    progress: Object.fromEntries(Object.entries(masteryByTopic).map(([k, v]) => [k, v.n ? v.sum / v.n : 0])),
    nowMs: typeof Date !== 'undefined' ? Date.now() : null,
  }), [plan, masteryByTopic]);

  const recurring = recurringMisconceptions(state.misconceptions);
  // Learner-facing interpretation of the evidence (strengths / focus / developing /
  // need-more-evidence + an evidence-derived next step). Recomputes as evidence grows.
  const topicAnalysis = useMemo(() => cfaTopicAnalysis(state.domains, state.misconceptions, state.transfer), [state]);
  const actOnRecommendation = (rec) => {
    if (!rec) return;
    if (rec.kind === 'practice-topic' && rec.topic) startTopic(rec.topic);
    else if (rec.kind === 'mixed') startMixed(10, 'Mixed practice');
    else startDiagnostic();
  };

  // ============================ RENDER =========================================
  return (
    <div className="min-h-screen bg-uale-ivory text-uale-text">
      <header className="bg-uale-hero-3 text-uale-cream">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <a href={UALE_HOME} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-uale-cream-dim hover:text-uale-cream">
            <ArrowLeft className="w-4 h-4" /> Back to UALE
          </a>
          <p className="mt-4 text-xs uppercase tracking-[0.17em] text-uale-champagne">UALE · Professional Certification</p>
          <h1 className="font-uale-serif text-3xl font-semibold mt-1">CFA Level I</h1>
          <p className="text-sm text-uale-cream-dim mt-1">{PRACTICE_LABEL} — original items aligned to the official topic blueprint. Not affiliated with or endorsed by CFA Institute.</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {view === 'practice' && session ? renderPractice() :
         view === 'plan' ? renderPlan() :
         view === 'psm' ? renderPsm() :
         view === 'mock' ? renderMock() : renderHome()}
      </main>
    </div>
  );

  function renderHome() {
    return (
      <>
        {/* Readiness */}
        <section className="bg-uale-card border border-uale-stone-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-uale-sec text-sm"><TrendingUp className="w-4 h-4" /> Readiness</div>
          {readiness.score == null
            ? <p className="mt-2 text-uale-ink-2">{readiness.label}</p>
            : <p className="mt-1"><span className="font-uale-serif text-5xl font-semibold text-uale-ink">{readiness.score}%</span> <span className="text-sm text-uale-sec ml-2">{readiness.label}</span></p>}
          <p className="mt-2 text-xs text-uale-faint">Topics evaluated: {readiness.evaluatedTopics}/10 · a % appears once ≥3 topics have evidence.</p>
          {recurring.length > 0 && (
            <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-[13px] text-amber-800">
              <span className="font-semibold">Pattern to work on: </span>{misconceptionPhrase(recurring[0].key, recurring[0].count)}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={startDiagnostic} className={btn}>Take the diagnostic <ArrowRight className="w-4 h-4" /></button>
            <button onClick={() => startMixed(10, 'Mixed practice')} className={btnGhost}>Mixed practice</button>
            <button onClick={() => setView('plan')} className={btnGhost}><Calendar className="w-4 h-4" /> Study plan</button>
            <button onClick={() => setView('mock')} className={btnGhost}><Target className="w-4 h-4" /> Mock</button>
            <button onClick={() => setView('psm')} className={btnGhost}><ClipboardCheck className="w-4 h-4" /> Practical Skills Module</button>
          </div>
        </section>

        {/* Your strengths & focus areas — the learner-facing interpretation. */}
        <section className="mt-6 bg-uale-card border border-uale-stone-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-uale-sec text-sm"><Target className="w-4 h-4" /> Your strengths &amp; focus areas</div>

          {/* Alyce's interpretation + one clear next step (evidence-derived). */}
          <div className="mt-3 rounded-xl bg-uale-hero-3/5 border border-uale-stone-200 bg-uale-paper p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-uale-brass-2">Alyce recommends</p>
            <p className="mt-1 text-[14px] text-uale-ink-2 leading-relaxed">{topicAnalysis.recommendation.text}</p>
            <button onClick={() => actOnRecommendation(topicAnalysis.recommendation)} className={btn + ' mt-3'}>
              {topicAnalysis.recommendation.kind === 'diagnostic' ? 'Start diagnostic' : topicAnalysis.recommendation.kind === 'mixed' ? 'Start mixed practice' : `Practice ${TOPICS[topicAnalysis.recommendation.topic].label}`}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {!topicAnalysis.hasEnoughEvidence ? (
            <p className="mt-4 text-[13.5px] text-uale-sec">We need a little more evidence to identify your strongest and weakest areas. Answer a few questions and this updates automatically — it reflects your current performance, not a permanent label.</p>
          ) : (
            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              {/* Strong */}
              <AreaColumn title="Strong areas" tone="sage" empty="None demonstrated yet.">
                {topicAnalysis.strong.map((x) => (
                  <AreaRow key={x.topic} label={TOPICS[x.topic].label} meta={`Mastery ${Math.round(x.mastery * 100)}%`} tone="sage"
                    action={<button onClick={() => startTopic(x.topic)} className={chipBtn}>Keep sharp</button>} />
                ))}
              </AreaColumn>
              {/* Focus */}
              <AreaColumn title="Focus areas" tone="amber" empty="Nothing flagged — nice.">
                {topicAnalysis.focus.map((x) => (
                  <AreaRow key={x.topic} label={TOPICS[x.topic].label} meta={`Mastery ${Math.round(x.mastery * 100)}%`} tone="amber"
                    pattern={x.pattern ? `Pattern Alyce noticed: you appear to be ${x.pattern.phrase}.` : null}
                    action={<button onClick={() => startTopic(x.topic)} className={chipBtnPrimary}>Practice this topic</button>} />
                ))}
              </AreaColumn>
              {/* Developing */}
              {topicAnalysis.developing.length > 0 && (
                <AreaColumn title="Developing" tone="stone" empty="">
                  {topicAnalysis.developing.map((x) => (
                    <AreaRow key={x.topic} label={TOPICS[x.topic].label} meta={`Mastery ${Math.round(x.mastery * 100)}%`} tone="stone"
                      action={<button onClick={() => startTopic(x.topic)} className={chipBtn}>Strengthen</button>} />
                  ))}
                </AreaColumn>
              )}
              {/* Need more evidence */}
              {topicAnalysis.needEvidence.length > 0 && (
                <AreaColumn title="Need more evidence" tone="stone" empty="">
                  <div className="flex flex-wrap gap-2">
                    {topicAnalysis.needEvidence.map((t) => (
                      <button key={t} onClick={() => startTopic(t)} className={chipBtn}>{TOPICS[t].label}</button>
                    ))}
                  </div>
                  <p className="mt-2 text-[12px] text-uale-faint">Practice any of these so Alyce can assess them.</p>
                </AreaColumn>
              )}
            </div>
          )}
        </section>

        {/* Ten-topic grid */}
        <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-uale-sec">The ten CFA Level I topics</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {TOPIC_ORDER.map((t) => {
            const st = topicStatus(t);
            return (
              <button key={t} onClick={() => startTopic(t)} className="text-left bg-uale-card border border-uale-stone-200 rounded-xl p-4 hover:border-uale-brass-lite transition">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-uale-ink">{TOPICS[t].label}</span>
                  <span className="text-[11px] text-uale-faint">{TOPICS[t].min}–{TOPICS[t].max}%</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px]">
                  <span className={'px-2 py-0.5 rounded-full ' + (st.content === 'available' ? 'bg-uale-sage/15 text-uale-sage' : 'bg-uale-stone-100 text-uale-sec')}>
                    {st.content === 'available' ? 'Available' : 'In development'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-uale-stone-100 text-uale-sec">
                    {st.evidence === 'evaluated' ? `Mastery ${Math.round((st.mastery || 0) * 100)}%` : 'Insufficient evidence'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-uale-faint">Quantitative Methods and Ethics ship at depth this sprint; the other eight carry a foundational set and are marked “In development.”</p>
      </>
    );
  }

  function renderPractice() {
    const picked = session.picked, revealed = session.revealed;
    const isCorrect = revealed && picked === q.correct;
    const diagNote = revealed && !isCorrect
      ? (q.meta?.diagnostics?.[picked]?.note || q.meta?.distractorRationale?.[picked] || null) : null;
    const pickedKey = revealed && !isCorrect ? (q.meta?.diagnostics?.[picked]?.misconception || q.meta?.misconceptions?.[picked] || null) : null;
    const recurringHit = pickedKey && recurring.some((r) => r.key === pickedKey); // pattern across questions
    const reteachNext = revealed && session.queue[session.idx + 1] && session.queue[session.idx + 1]._reteach;
    return (
      <div>
        <div className="flex items-center justify-between text-sm text-uale-sec">
          <span>{session.label} · {q.meta?.provenance?.topicLabel}</span>
          <span>{session.idx + 1} / {session.queue.length}</span>
        </div>
        {q._reteach && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-uale-brass-2 bg-uale-brass-soft rounded-full px-3 py-1">
            <Lightbulb className="w-3.5 h-3.5" /> Alyce: let's try this a different way
          </p>
        )}
        <h2 className="mt-4 text-lg font-semibold text-uale-ink whitespace-pre-wrap">{q.prompt}</h2>
        <div className="mt-5 space-y-3">
          {q.options.map((opt, i) => {
            let cls = 'border-uale-stone-200 hover:border-uale-brass-lite';
            if (revealed && i === q.correct) cls = 'border-uale-sage bg-uale-sage/10';
            else if (revealed && i === picked) cls = 'border-rose-300 bg-rose-50';
            else if (!revealed && i === picked) cls = 'border-uale-brass-lite bg-uale-brass-soft';
            return (
              <button key={i} disabled={revealed} onClick={() => setSession((s) => ({ ...s, picked: i }))}
                className={'w-full text-left px-4 py-3 rounded-xl border-2 flex items-center gap-3 transition ' + cls}>
                <span className="text-uale-faint">{String.fromCharCode(65 + i)}</span>
                <span className="text-uale-ink-2">{opt}</span>
                {revealed && i === q.correct && <CheckCircle2 className="w-4 h-4 text-uale-sage ml-auto" />}
                {revealed && i === picked && i !== q.correct && <XCircle className="w-4 h-4 text-rose-500 ml-auto" />}
              </button>
            );
          })}
        </div>

        {revealed && (
          <div className="mt-5 rounded-2xl border border-uale-stone-200 bg-uale-card p-5">
            {/* Alyce is visibly the teacher here — diagnose, teach, and set up what's next. */}
            <div className="flex items-center gap-2">
              <span className="grid place-items-center w-6 h-6 rounded-full bg-uale-hero-3 text-uale-cream text-[11px] font-bold">A</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-uale-brass-2">Alyce</span>
              <span className={'ml-1 text-sm font-semibold ' + (isCorrect ? 'text-uale-sage' : 'text-rose-600')}>{isCorrect ? 'Correct' : 'Not quite'}</span>
            </div>
            {recurringHit && (
              <p className="mt-2 text-[13px] text-amber-900 bg-amber-100 border border-amber-300 rounded-lg p-3">
                I've seen this pattern from you a few times now — let's make it a focus and work through it together.
              </p>
            )}
            {diagNote && (
              <p className="mt-2 text-[13.5px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                <Lightbulb className="w-4 h-4 flex-none mt-0.5" /> <span>{isCorrect ? '' : 'This may indicate: '}{diagNote}</span>
              </p>
            )}
            <p className="mt-3 text-[14px] text-uale-ink-2 leading-relaxed">{q.explanation}</p>
            {isCorrect && session.steppedUp && (
              <p className="mt-3 text-[13px] text-uale-sage">Nice — you're consistent here, so I'll step up the challenge.</p>
            )}
            {reteachNext && (
              <p className="mt-3 text-[13px] text-uale-ink-2">Next, I'll give you {familyLabel(session.queue[session.idx + 1].family)} on the same idea — to make sure it really clicks, not just the pattern.</p>
            )}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button onClick={() => { setSession(null); setView('home'); }} className={btnGhost}>Exit</button>
          {!revealed
            ? <button onClick={reveal} disabled={picked == null} className={btn + ' disabled:opacity-40'}>Check answer</button>
            : <button onClick={next} className={btn}>{session.idx + 1 >= session.queue.length ? 'Finish' : 'Next'} <ArrowRight className="w-4 h-4" /></button>}
        </div>
      </div>
    );
  }

  function renderPlan() {
    return (
      <div className="max-w-xl">
        <button onClick={() => setView('home')} className="text-sm text-uale-sec mb-4">← Back</button>
        <h2 className="font-uale-serif text-2xl font-semibold text-uale-ink">Study plan</h2>
        <p className="text-sm text-uale-sec mt-1">Add your exam date whenever you know it — no countdown is shown until then.</p>
        <div className="mt-5 space-y-4 bg-uale-card border border-uale-stone-200 rounded-2xl p-5">
          <label className="block text-sm">Exam date (optional)
            <input type="date" value={plan.examDate ? plan.examDate.slice(0, 10) : ''} onChange={(e) => savePlan({ examDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
              className="mt-1 w-full rounded-lg border border-uale-stone-200 px-3 py-2" />
          </label>
          <label className="block text-sm">Weekly study minutes
            <input type="number" min="0" value={plan.weeklyMinutes || 0} onChange={(e) => savePlan({ weeklyMinutes: parseInt(e.target.value || '0', 10) })}
              className="mt-1 w-full rounded-lg border border-uale-stone-200 px-3 py-2" />
          </label>
          <label className="block text-sm">Calculator (choose your model — instruction targets it later)
            <select value={plan.calculator || ''} onChange={(e) => savePlan({ calculator: e.target.value || null })}
              className="mt-1 w-full rounded-lg border border-uale-stone-200 px-3 py-2">
              <option value="">Not selected (generic instruction)</option>
              {APPROVED_CALCULATORS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-4 rounded-2xl border border-uale-stone-200 bg-uale-paper p-5">
          <p className="text-sm font-semibold text-uale-ink-2">Recommended focus</p>
          {planCalc.hasExamDate
            ? <p className="text-sm text-uale-sec">{planCalc.weeksRemaining} weeks remaining · {planCalc.weeklyMinutes} min/week allocated by topic weight and your gaps.</p>
            : <p className="text-sm text-uale-sec">No exam date set — showing effort priorities only (no countdown).</p>}
          <div className="mt-3 space-y-1">
            {planCalc.shares.slice().sort((a, b) => b.effortShare - a.effortShare).slice(0, 5).map((s) => (
              <div key={s.key} className="flex justify-between text-[13px]"><span className="text-uale-ink-2">{TOPICS[s.key].label}</span><span className="text-uale-sec">{Math.round(s.effortShare * 100)}%{planCalc.scheduled ? ` · ${(planCalc.commitments.find((c) => c.topic === s.key)?.minutesPerWeek) || 0} min/wk` : ''}</span></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderMock() {
    return (
      <div className="max-w-xl">
        <button onClick={() => setView('home')} className="text-sm text-uale-sec mb-4">← Back</button>
        <h2 className="font-uale-serif text-2xl font-semibold text-uale-ink">Mock & practice</h2>
        <p className="text-sm text-uale-sec mt-1">The official Level I exam is {EXAM.totalQuestions} questions across {EXAM.sessions} sessions of {EXAM.minutesPerSession} minutes ({EXAM.answerChoices} choices each).</p>
        <div className="mt-5 space-y-3">
          <button onClick={() => startMixed(15, 'Mixed practice')} className="w-full text-left bg-uale-card border border-uale-stone-200 rounded-xl p-4 hover:border-uale-brass-lite">
            <p className="font-medium text-uale-ink">Mixed practice</p><p className="text-sm text-uale-sec">15 questions across topics, weighted toward the blueprint.</p>
          </button>
          <button onClick={() => startMixed(30, 'Mini mock')} className="w-full text-left bg-uale-card border border-uale-stone-200 rounded-xl p-4 hover:border-uale-brass-lite">
            <p className="font-medium text-uale-ink">Mini mock</p><p className="text-sm text-uale-sec">30 questions — a shorter, blueprint-weighted checkpoint.</p>
          </button>
          <div className="w-full text-left bg-uale-stone-50 border border-dashed border-uale-stone-300 rounded-xl p-4 opacity-80">
            <p className="font-medium text-uale-ink-2">Full Mock (180) · <span className="text-uale-brass-2">Building</span></p>
            <p className="text-sm text-uale-sec">Unlocks once every topic has enough high-quality items for a defensible full-length exam. We won’t pad it with repetitive questions.</p>
          </div>
        </div>
      </div>
    );
  }

  function renderPsm() {
    const psm = state.psm;
    return (
      <div className="max-w-xl">
        <button onClick={() => setView('home')} className="text-sm text-uale-sec mb-4">← Back</button>
        <h2 className="font-uale-serif text-2xl font-semibold text-uale-ink">Practical Skills Module</h2>
        <p className="text-sm text-uale-sec mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3">{PSM_REQUIREMENT_NOTE}</p>
        <div className="mt-4 bg-uale-card border border-uale-stone-200 rounded-2xl p-5 space-y-3">
          <label className="block text-sm">Selected module
            <select value={psm.selected || ''} onChange={(e) => persist({ ...state, psm: selectPsm(psm, e.target.value) })} className="mt-1 w-full rounded-lg border border-uale-stone-200 px-3 py-2">
              <option value="">Not selected</option>
              {PSM_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          {psm.selected && (
            <label className="block text-sm">Status
              <select value={psm.status} onChange={(e) => persist({ ...state, psm: setPsmStatus(psm, e.target.value) })} className="mt-1 w-full rounded-lg border border-uale-stone-200 px-3 py-2">
                <option value={PSM_STATUS.NOT_STARTED}>Not started</option>
                <option value={PSM_STATUS.IN_PROGRESS}>In progress</option>
                <option value={PSM_STATUS.COMPLETED}>Completed</option>
              </select>
            </label>
          )}
        </div>
      </div>
    );
  }
}

function shuffle(a) { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; }
const btn = 'inline-flex items-center gap-2 bg-uale-cta-fill text-uale-cta-text border border-uale-cta-border hover:bg-uale-cta-hover rounded-xl px-4 py-2.5 text-sm font-semibold';
const btnGhost = 'inline-flex items-center gap-2 bg-uale-paper text-uale-ink-2 border border-uale-stone-200 hover:border-uale-stone-300 rounded-xl px-4 py-2.5 text-sm font-semibold';
const chipBtn = 'inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1 rounded-full border border-uale-stone-200 bg-uale-paper text-uale-ink-2 hover:border-uale-stone-300';
const chipBtnPrimary = 'inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1 rounded-full border border-uale-cta-border bg-uale-cta-fill text-uale-cta-text hover:bg-uale-cta-hover';

const TONE = {
  sage: { dot: 'bg-uale-sage', head: 'text-uale-sage' },
  amber: { dot: 'bg-amber-400', head: 'text-amber-700' },
  stone: { dot: 'bg-uale-stone-300', head: 'text-uale-sec' },
};

function AreaColumn({ title, tone, empty, children }) {
  const t = TONE[tone] || TONE.stone;
  const hasKids = React.Children.count(children) > 0;
  return (
    <div className="rounded-xl border border-uale-stone-200 p-4">
      <div className={'flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] ' + t.head}>
        <span className={'inline-block w-2 h-2 rounded-full ' + t.dot} /> {title}
      </div>
      <div className="mt-3 space-y-3">
        {hasKids ? children : (empty ? <p className="text-[13px] text-uale-faint">{empty}</p> : null)}
      </div>
    </div>
  );
}

function AreaRow({ label, meta, pattern, action }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13.5px] font-medium text-uale-ink">{label}</span>
        <span className="text-[12px] text-uale-sec tabular-nums">{meta}</span>
      </div>
      {pattern && <p className="mt-1 text-[12.5px] text-amber-800">{pattern}</p>}
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}
