'use client';

// SieExperience — FINRA SIE adaptive tutor (Sprint 2 vertical slice).
// ----------------------------------------------------------------------------
// Real teaching over the implemented slice: ASSESS → DIAGNOSE → TEACH → PRACTICE
// DIFFERENTLY → ADAPT → TEST TRANSFER. Per-learner (UALE handoff) device-local
// state, save badge, Welcome-back/Continue, evidence-gated analytics (strengths /
// focus / developing / need-more-evidence + trend + transfer status + Alyce
// next-best-action), the inline Alyce teaching-on-miss card with different-family
// remediation and recurring-misconception coaching, and streak-driven difficulty.
// ZERO fake data — untested areas read "Not yet assessed"; nothing is fabricated.
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, Lightbulb, Target, BookOpen } from 'lucide-react';
import { analyzeSkills, EVIDENCE } from '../../lib/metrics.mjs';
import { metricsRegistryFor } from '../../lib/certRegistry.mjs';
import { CERT_NAME, TOPICS, TOPIC_ORDER, EXAM, PRACTICE_LABEL } from '../../lib/certifications/sie/sieBlueprint.mjs';
import { generateSieItem, generateVariedItem, buildSieDiagnostic, generatableCells, sieConceptAnalysis, SIE_MISCONCEPTION_INFO, areaLabel } from '../../lib/certifications/sie/sieEngine.mjs';
import { familyLabel, familyOf } from '../../lib/certifications/sie/families.mjs';
import { recurringMisconceptions, misconceptionPhrase } from '../../lib/misconceptions.mjs';
import { loadSieState, saveSieState, recordSieAnswer } from '../../lib/certifications/sie/sieStore.mjs';

const UALE_HOME = 'https://florence-sand-phi.vercel.app/';
function rngFrom(seed) { let s = (seed >>> 0) || 1; return () => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }
function shuffle(a) { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; }
function seed() { return (Math.floor((typeof performance !== 'undefined' ? performance.now() : 1) * 1000) % 2147483647) || 7; }

export default function SieExperience() {
  const [state, setState] = useState(() => loadSieState(null));
  const [view, setView] = useState('home'); // home | practice
  const [session, setSession] = useState(null); // { queue, idx, picked, revealed, label, steppedUp }
  const [saveState, setSaveState] = useState('idle');
  const saveTimer = useRef(null);
  const learnerKeyRef = useRef(null);

  useEffect(() => {
    let lid = null, nm = null;
    try {
      const p = new URLSearchParams(window.location.search);
      lid = p.get('lid'); nm = p.get('name');
      if (/[?&](src|lid|name)=/.test(window.location.search)) window.history.replaceState({}, '', window.location.pathname);
    } catch { /* SSR */ }
    learnerKeyRef.current = lid || null;
    let s = loadSieState(learnerKeyRef.current);
    if (nm) s = { ...s, learnerName: nm.slice(0, 60) };
    setState(s);
    if (s.learnerName) saveSieState(s, learnerKeyRef.current);
  }, []);

  const persist = (next) => {
    setState(next);
    setSaveState('saving');
    try {
      saveSieState(next, learnerKeyRef.current);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => setSaveState('saved'), 450);
    } catch { setSaveState('error'); }
  };

  const registry = useMemo(() => metricsRegistryFor('finra-sie'), []);
  const analysis = useMemo(() => analyzeSkills(state.domains, registry), [state, registry]);
  const conceptAnalysis = useMemo(() => sieConceptAnalysis(state.domains, state.misconceptions, state.transfer), [state]);
  const recurring = recurringMisconceptions(state.misconceptions);

  // Evaluated flag per area, for the section grid labels.
  const areaState = (topic, subskill) => {
    const row = analysis.find((c) => c.domain === topic && c.subskill === subskill);
    if (!row || row.evidenceState === EVIDENCE.UNTESTED) return 'Not yet assessed';
    if (row.evidenceState === EVIDENCE.INSUFFICIENT) return 'Building evidence';
    if (conceptAnalysis.strong.some((x) => x.key === `${topic}:${subskill}`)) return 'Strong';
    if (conceptAnalysis.focus.some((x) => x.key === `${topic}:${subskill}`)) return 'Developing';
    return 'Developing';
  };

  // ---- session builders ---------------------------------------------------------
  const buildQueue = (cells, n, label, activity) => {
    const rng = rngFrom(seed());
    const q = [];
    const avoid = [...(state.recentConcepts || [])];
    for (let i = 0; i < n; i++) {
      const c = cells[i % cells.length];
      const item = generateVariedItem({ topic: c.topic, subskill: c.subskill, rng, avoidConcepts: avoid });
      if (item) { q.push(item); avoid.unshift(item.concept); if (avoid.length > 10) avoid.pop(); }
    }
    if (activity) persist({ ...state, lastActivity: { ...activity, label } });
    setSession({ queue: q, idx: 0, picked: null, revealed: false, label });
    setView('practice');
  };
  const startArea = (topic, subskill) => buildQueue([{ topic, subskill }], 6, areaLabel(topic, subskill), { kind: 'area', topic, subskill });
  const startMixed = (n = 10) => buildQueue(shuffle(generatableCells()), n, 'Mixed practice', { kind: 'mixed' });
  const startDiagnostic = () => { const { plan } = buildSieDiagnostic(rngFrom(seed()), { perCell: 1 }); buildQueue(plan, plan.length, 'Diagnostic', { kind: 'diagnostic' }); };
  const continueLast = () => {
    const a = state.lastActivity;
    if (!a) return;
    if (a.kind === 'area' && a.topic && a.subskill) startArea(a.topic, a.subskill);
    else if (a.kind === 'mixed') startMixed(10);
    else startDiagnostic();
  };
  const actOnRecommendation = (rec) => {
    if (!rec) return;
    if (rec.kind === 'practice-area' && rec.topic && rec.subskill) startArea(rec.topic, rec.subskill);
    else if (rec.kind === 'mixed') startMixed(10);
    else startDiagnostic();
  };

  // ---- answering: ASSESS → DIAGNOSE → PRACTICE DIFFERENTLY → ADAPT ----------------
  const q = session && session.queue[session.idx];
  const reveal = () => {
    if (session.picked == null || session.revealed) return;
    const correct = session.picked === q.correct;
    const misKey = (q.meta?.misconceptions?.[session.picked]) || null;
    const cur = state.domains?.[q.topic]?.[q.subskill];
    const before = (cur && cur.difficulty) || 1;
    const nextState = recordSieAnswer(state, { domain: q.topic, subskill: q.subskill, correct, difficulty: before, misconceptionKey: misKey, family: q.family, concept: q.concept });
    persist(nextState);
    const after = nextState.domains?.[q.topic]?.[q.subskill]?.difficulty || 1;
    // On a miss, PRACTICE DIFFERENTLY: inject a fresh item in the same area but a
    // different concept/family (avoid this concept) right after — never a near-repeat.
    let reteach = null;
    if (!correct) reteach = generateVariedItem({ topic: q.topic, subskill: q.subskill, rng: rngFrom(seed() + 13), avoidConcepts: [q.concept] });
    setSession((s) => {
      const queue = s.queue.slice();
      if (reteach) queue.splice(s.idx + 1, 0, { ...reteach, _reteach: true, _fromFamily: q.family });
      return { ...s, queue, revealed: true, steppedUp: correct && after > before, steppedDown: !correct && after < before };
    });
  };
  const next = () => {
    if (session.idx + 1 >= session.queue.length) { setSession(null); setView('home'); return; }
    setSession((s) => ({ ...s, idx: s.idx + 1, picked: null, revealed: false, steppedUp: false, steppedDown: false }));
  };

  const greetName = state.learnerName ? `, ${state.learnerName}` : '';
  const SaveBadge = () => (
    <span className={'flex items-center gap-1.5 text-xs ' + (saveState === 'error' ? 'text-rose-200' : 'text-uale-cream-dim')}>
      {saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Unable to save' : <><CheckCircle2 className="w-3.5 h-3.5" /> Progress saved on this device</>}
    </span>
  );

  // ============================ RENDER =========================================
  return (
    <div className="min-h-screen bg-uale-ivory text-uale-text">
      <header className="bg-uale-hero-3 text-uale-cream">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between gap-3">
          <a href={UALE_HOME} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-uale-cream-dim hover:text-uale-cream">
            <ArrowLeft className="w-4 h-4" /> Back to UALE
          </a>
          <SaveBadge />
        </div>
        <div className="max-w-4xl mx-auto px-6 pb-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-uale-champagne">UALE · Professional Certification</p>
          <h1 className="mt-1 text-3xl font-semibold font-uale-serif">{CERT_NAME}</h1>
          <p className="mt-1 text-[13px] text-uale-cream-dim">{PRACTICE_LABEL} — {EXAM.scoredQuestions} scored / {EXAM.totalPresented} presented, {EXAM.minutes} min, four choices. Original practice; not actual FINRA questions.</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6">
        {view === 'practice' && session ? renderPractice() : renderHome()}
      </main>
    </div>
  );

  // ---------------------------------------------------------------------------
  function renderHome() {
    const ca = conceptAnalysis;
    return (
      <>
        {(state.learnerName || state.lastActivity) && (
          <section className="mb-5 rounded-2xl border border-uale-stone-200 bg-uale-card p-5">
            <p className="text-[15px] font-semibold text-uale-ink">Welcome back{greetName} — pick up where you left off.</p>
            {state.lastActivity ? (
              <button onClick={continueLast} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-uale-ink px-3.5 py-2 text-[13px] font-semibold text-uale-cream hover:opacity-90">
                Continue {state.lastActivity.label} <ArrowRight className="w-4 h-4" />
              </button>
            ) : <p className="mt-1 text-[13px] text-uale-sec">Choose an area below to start building your SIE baseline.</p>}
          </section>
        )}

        {/* Alyce recommends — evidence-driven, never fabricated weakness. */}
        <section className="mb-5 rounded-2xl border border-uale-stone-200 bg-uale-card p-5">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-uale-brass-2"><Lightbulb className="h-4 w-4" /> Alyce recommends</p>
          <p className="mt-2 text-[13.5px] text-uale-text">{ca.recommendation.text}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => actOnRecommendation(ca.recommendation)} className={chipBtnPrimary}>Start Alyce’s pick</button>
            <button onClick={() => startMixed(10)} className={chipBtn}>Mixed practice (10)</button>
            <button onClick={startDiagnostic} className={chipBtn}>Quick diagnostic</button>
          </div>
        </section>

        {/* Recurring-misconception coaching (≥3 observations). */}
        {recurring.length > 0 && SIE_MISCONCEPTION_INFO[recurring[0].key] && (
          <section className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-[13px] text-amber-900"><span className="font-semibold">Pattern to work on: </span>{misconceptionPhrase(recurring[0].key, recurring[0].count)}</p>
            {SIE_MISCONCEPTION_INFO[recurring[0].key].remediation && <p className="mt-1 text-[12.5px] text-amber-800">{SIE_MISCONCEPTION_INFO[recurring[0].key].remediation}</p>}
          </section>
        )}

        {/* Evidence-aware analytics. */}
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-uale-sec">How you’re doing</h2>
        {!ca.hasEnoughEvidence ? (
          <p className="mb-6 text-[13.5px] text-uale-sec">Not yet assessed — answer a few questions and this fills in automatically. It reflects your current performance, not a permanent label.</p>
        ) : (
          <div className="mb-6 grid sm:grid-cols-2 gap-4">
            <AreaColumn title="Strong areas" tone="sage" empty="None demonstrated yet.">
              {ca.strong.map((x) => <AreaRow key={x.key} label={x.label} meta={`Mastery ${Math.round(x.mastery * 100)}%`} trend={x.trend} pattern="Transfer demonstrated — correct across more than one question type." action={<button onClick={() => startArea(x.topic, x.subskill)} className={chipBtn}>Keep sharp</button>} />)}
            </AreaColumn>
            <AreaColumn title="Focus areas" tone="amber" empty="Nothing flagged — nice.">
              {ca.focus.map((x) => <AreaRow key={x.key} label={x.label} meta={`Mastery ${Math.round(x.mastery * 100)}%`} trend={x.trend} pattern={x.pattern ? `Pattern Alyce noticed: you appear to be ${x.pattern.phrase}.` : null} action={<button onClick={() => startArea(x.topic, x.subskill)} className={chipBtnPrimary}>Practice this</button>} />)}
            </AreaColumn>
            {ca.developing.length > 0 && (
              <AreaColumn title="Developing" tone="stone" empty="">
                {ca.developing.map((x) => <AreaRow key={x.key} label={x.label} meta={`Mastery ${Math.round(x.mastery * 100)}%`} trend={x.trend} pattern={x.needsTransfer ? 'Good accuracy — try a different question type to confirm mastery (transfer).' : (x.pattern ? `Pattern Alyce noticed: you appear to be ${x.pattern.phrase}.` : null)} action={<button onClick={() => startArea(x.topic, x.subskill)} className={chipBtn}>Strengthen</button>} />)}
              </AreaColumn>
            )}
            {ca.needEvidence.length > 0 && (
              <AreaColumn title="Need more evidence" tone="stone" empty="">
                <div className="flex flex-wrap gap-2">{ca.needEvidence.map((x) => <button key={x.key} onClick={() => startArea(x.topic, x.subskill)} className={chipBtn}>{x.label}</button>)}</div>
                <p className="mt-2 text-[12px] text-uale-faint">Practice any of these so Alyce can assess them.</p>
              </AreaColumn>
            )}
          </div>
        )}

        {/* Sections + their implemented areas. */}
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-uale-sec">The four SIE sections</h2>
        <div className="space-y-3">
          {TOPIC_ORDER.map((topic) => {
            const t = TOPICS[topic];
            const areas = generatableCells().filter((c) => c.topic === topic);
            return (
              <div key={topic} className="rounded-xl border border-uale-stone-200 bg-uale-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-uale-ink">{t.label}</span>
                  <span className="text-[11px] text-uale-faint">{t.pct}% · {t.items} items</span>
                </div>
                {areas.length ? (
                  <div className="mt-3 space-y-2">
                    {areas.map((c) => (
                      <div key={c.subskill} className="flex items-center justify-between gap-2 rounded-lg border border-uale-stone-200 bg-uale-paper px-3 py-2">
                        <div className="min-w-0">
                          <div className="truncate text-[13.5px] font-medium text-uale-ink">{areaLabel(c.topic, c.subskill)}</div>
                          <div className="text-[11px] text-uale-faint">{areaState(c.topic, c.subskill)}</div>
                        </div>
                        <button onClick={() => startArea(c.topic, c.subskill)} className={chipBtnPrimary}>Practice</button>
                      </div>
                    ))}
                  </div>
                ) : <p className="mt-2 text-[12.5px] text-uale-faint">Guided practice for this section arrives in a later sprint.</p>}
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-xs text-uale-faint">Progress is saved on this device (no account needed for the beta). {PRACTICE_LABEL}; “FINRA” and “SIE” are marks of FINRA and this practice is original and not affiliated with or endorsed by FINRA.</p>
      </>
    );
  }

  // ---------------------------------------------------------------------------
  function renderPractice() {
    const s = session;
    const item = s.queue[s.idx];
    const revealed = s.revealed;
    const picked = s.picked;
    const isCorrect = revealed && picked === item.correct;
    const pickedKey = revealed && !isCorrect ? (item.meta?.misconceptions?.[picked] || null) : null;
    const pickedInfo = pickedKey ? SIE_MISCONCEPTION_INFO[pickedKey] : null;
    const rationale = revealed && !isCorrect ? (item.meta?.distractorRationale?.[picked] || null) : null;
    const recurHit = pickedKey && recurring.some((r) => r.key === pickedKey && r.count >= 3);
    const reteachNext = revealed && s.queue[s.idx + 1] && s.queue[s.idx + 1]._reteach;

    return (
      <div>
        <div className="mb-3 flex items-center justify-between text-[12px] text-uale-sec">
          <button onClick={() => { setSession(null); setView('home'); }} className="inline-flex items-center gap-1 font-semibold hover:text-uale-ink"><ArrowLeft className="w-4 h-4" /> Exit</button>
          <span>Question {s.idx + 1} of {s.queue.length} · {s.label}</span>
        </div>
        {item._reteach && (
          <p className="mb-2 text-[12px] font-semibold text-uale-brass-2">A different angle on the same idea — {familyLabel(familyOf(item.concept))}.</p>
        )}
        <div className="rounded-2xl border border-uale-stone-200 bg-uale-card p-5">
          <p className="text-[15px] font-medium text-uale-ink">{item.prompt}</p>
          <div className="mt-4 space-y-2">
            {item.options.map((opt, i) => {
              const chosen = picked === i;
              const correctOpt = revealed && i === item.correct;
              const wrongChosen = revealed && chosen && i !== item.correct;
              return (
                <button key={i} disabled={revealed} onClick={() => setSession((x) => ({ ...x, picked: i }))}
                  className={'flex w-full items-start gap-2 rounded-xl border px-3.5 py-2.5 text-left text-[13.5px] transition '
                    + (correctOpt ? 'border-uale-sage bg-uale-sage-soft text-uale-ink'
                      : wrongChosen ? 'border-rose-300 bg-rose-50 text-rose-900'
                      : chosen ? 'border-uale-brass-lite bg-uale-brass-soft text-uale-ink'
                      : 'border-uale-stone-200 bg-uale-paper text-uale-text hover:border-uale-stone-300')}>
                  <span className="font-semibold">{String.fromCharCode(65 + i)}</span>
                  <span className="flex-1">{opt}</span>
                  {correctOpt && <CheckCircle2 className="w-4 h-4 text-uale-sage shrink-0" />}
                  {wrongChosen && <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                </button>
              );
            })}
          </div>

          {!revealed ? (
            <button onClick={reveal} disabled={picked == null} className={'mt-4 rounded-lg px-4 py-2 text-[13px] font-semibold ' + (picked == null ? 'bg-uale-stone-200 text-uale-faint' : 'bg-uale-ink text-uale-cream hover:opacity-90')}>Check answer</button>
          ) : (
            <>
              {/* Alyce teaching card: DIAGNOSE → TEACH. */}
              <div className="mt-4 rounded-xl border border-uale-stone-200 bg-uale-paper p-4">
                <p className={'flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide ' + (isCorrect ? 'text-uale-sage' : 'text-uale-brass-2')}>
                  <BookOpen className="w-4 h-4" /> Alyce · {isCorrect ? 'Correct' : 'Not quite'}
                </p>
                {recurHit && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">You’ve shown this pattern a few times now — let’s slow down on it. {pickedInfo?.remediation}</p>}
                {!isCorrect && pickedInfo && <p className="mt-2 text-[13px] text-uale-text"><span className="font-semibold">Likely mix-up:</span> {pickedInfo.phrase}.</p>}
                {!isCorrect && rationale && <p className="mt-1 text-[13px] text-uale-text"><span className="font-semibold">Why that’s off:</span> {rationale}</p>}
                <p className="mt-2 text-[13px] text-uale-text">{item.explanation}</p>
                {!isCorrect && pickedInfo?.remediation && !recurHit && <p className="mt-1 text-[12.5px] text-uale-sec">{pickedInfo.remediation}</p>}
                {s.steppedUp && <p className="mt-2 text-[12px] font-medium text-uale-sage">Nice streak — stepping up the challenge.</p>}
                {s.steppedDown && <p className="mt-2 text-[12px] text-uale-sec">Let’s reinforce the basics before ramping difficulty back up.</p>}
                {reteachNext && <p className="mt-2 text-[12px] text-uale-brass-2">Next: {familyLabel(familyOf(s.queue[s.idx + 1].concept))} to check you’ve really got it.</p>}
              </div>
              <button onClick={next} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-uale-ink px-4 py-2 text-[13px] font-semibold text-uale-cream hover:opacity-90">
                {s.idx + 1 >= s.queue.length ? 'Finish' : 'Next'} <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }
}

// ---- small presentational helpers (mirrors the CFA analytics look) ---------------
const chipBtn = 'inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1 rounded-full border border-uale-stone-200 bg-uale-paper text-uale-ink-2 hover:border-uale-stone-300';
const chipBtnPrimary = 'inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1 rounded-full border border-uale-cta-border bg-uale-cta-fill text-uale-cta-text hover:bg-uale-cta-hover';
const TONE = {
  sage: { head: 'text-uale-sage', dot: 'bg-uale-sage' },
  amber: { head: 'text-amber-700', dot: 'bg-amber-500' },
  stone: { head: 'text-uale-sec', dot: 'bg-uale-stone-300' },
};
function AreaColumn({ title, tone, empty, children }) {
  const t = TONE[tone] || TONE.stone;
  const hasKids = React.Children.count(children) > 0;
  return (
    <div className="rounded-xl border border-uale-stone-200 p-4 bg-uale-card">
      <div className={'flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] ' + t.head}>
        <span className={'inline-block w-2 h-2 rounded-full ' + t.dot} /> {title}
      </div>
      <div className="mt-3 space-y-3">{hasKids ? children : (empty ? <p className="text-[13px] text-uale-faint">{empty}</p> : null)}</div>
    </div>
  );
}
function AreaRow({ label, meta, pattern, trend, action }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[13.5px] font-medium text-uale-ink">{label}<TrendChip trend={trend} /></span>
        <span className="text-[12px] text-uale-sec tabular-nums">{meta}</span>
      </div>
      {pattern && <p className="mt-1 text-[12.5px] text-amber-800">{pattern}</p>}
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}
const TREND_LABEL = { improving: 'Improving', flat: 'Steady', declining: 'Needs more practice' };
const TREND_STYLE = { improving: 'bg-uale-sage-soft text-uale-sage', flat: 'bg-uale-stone-100 text-uale-sec', declining: 'bg-amber-100 text-amber-800' };
function TrendChip({ trend }) {
  if (!trend || !TREND_LABEL[trend]) return null;
  return <span className={'px-1.5 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-wide ' + TREND_STYLE[trend]}>{TREND_LABEL[trend]}</span>;
}
