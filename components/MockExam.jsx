// ============================================================================
// MockExam.jsx — a full FCTC-style practice exam experience.
// ----------------------------------------------------------------------------
// 100 original questions across all FOUR official domains at the OFFICIAL FCTC
// section weighting (from lib/fctcBlueprint.mjs): Verbal & Visual Information 20 ·
// Mechanical Reasoning 25 · Mathematical Problems 20 · Technical Written Materials
// 35. This is FCTC-ALIGNED practice (original items, not official questions).
// Includes the official 2-hour timer, a question palette for navigation +
// flag-for-review, unanswered-question handling, a review step, and a full score /
// domain / subskill breakdown that feeds the evidence-aware metrics engine and
// routes the learner straight into remediation.
//
// NOTE (Sprint 1): recall items appear here with their scene visible; the fully
// authentic study-then-hide recall block within the mock is the next iteration —
// the standalone Visual Recall Drill remains the memory-from-hidden-source path.
//
// Self-contained: it owns exam → results. On submit it records ANSWERED questions
// into a cloned learner state (unanswered count as incorrect for scoring but are
// not treated as evidence), persists via onCommit, then shows the breakdown.
// ============================================================================
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Clock, Flag, ChevronLeft, ChevronRight, CheckCircle2, Target, Lightbulb, X } from 'lucide-react';
import { questionProvider, SUBSKILLS, makeRng } from '../lib/questionEngine';
import { recordAnswer, commitSessionStats, endSession, nextBestAction } from '../lib/learningEngine';
import { buildMockPlan } from '../lib/learningEngine';
import { OFFICIAL_EXAM_SECONDS, OFFICIAL_TOTAL } from '../lib/fctcBlueprint.mjs';
import MechanicalDiagram from './MechanicalDiagram';

const EXAM_SECONDS = OFFICIAL_EXAM_SECONDS; // 2 hours (official FCTC)
const TOTAL = OFFICIAL_TOTAL;               // 100 (official FCTC)

function fmtTime(s) {
  const sec = Math.max(0, s);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const ss = sec % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

const labelFor = (q) => {
  const d = SUBSKILLS[q.domain];
  return { domain: d?.label || q.domain, subskill: d?.subskills[q.subskill]?.label || q.subskill };
};

function computeResults(questions, answers) {
  let correct = 0;
  const byDomain = {}, bySub = {};
  questions.forEach((q, i) => {
    const a = answers[i];
    const ok = a != null && a === q.correct;
    if (ok) correct += 1;
    (byDomain[q.domain] = byDomain[q.domain] || { c: 0, n: 0 }).n++;
    if (ok) byDomain[q.domain].c++;
    const key = `${q.domain}::${q.subskill}`;
    (bySub[key] = bySub[key] || { domain: q.domain, subskill: q.subskill, c: 0, n: 0 }).n++;
    if (ok) bySub[key].c++;
  });
  const answered = answers.filter((a) => a != null).length;
  const subRows = Object.values(bySub).map((r) => ({
    ...r, pct: Math.round((r.c / r.n) * 100),
    label: SUBSKILLS[r.domain]?.subskills[r.subskill]?.label || r.subskill,
    domainLabel: SUBSKILLS[r.domain]?.label || r.domain,
  }));
  return { correct, total: questions.length, answered, pct: Math.round((correct / questions.length) * 100), byDomain, subRows };
}

export default function MockExam({ state, onCommit, onRemediate, onTargeted, onExit }) {
  // Generate the exam once (seeded so a given mount is reproducible on re-render).
  const seedRef = useRef(null);
  if (seedRef.current == null) seedRef.current = Math.floor((typeof performance !== 'undefined' ? performance.now() : 1) * 1000) % 2147483647 || 12345;
  const questions = useMemo(() => {
    const rng = makeRng(seedRef.current);
    const plan = buildMockPlan(rng, TOTAL);
    return plan.map((p) => questionProvider.generate({ domain: p.domain, subskill: p.subskill, difficulty: p.difficulty, count: 1, rng })[0]).filter(Boolean);
  }, []);

  const [answers, setAnswers] = useState(() => Array(questions.length).fill(null));
  const [flagged, setFlagged] = useState(() => new Set());
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState('exam'); // 'exam' | 'review' | 'results'
  const [timeLeft, setTimeLeft] = useState(EXAM_SECONDS);
  const [outcome, setOutcome] = useState(null); // { results, nba }

  const submittedRef = useRef(false);
  const answeredCount = answers.filter((a) => a != null).length;

  // Submit: score, record answered questions as evidence, persist, show results.
  const submit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const results = computeResults(questions, answers);
    const next = typeof structuredClone === 'function' ? structuredClone(state) : JSON.parse(JSON.stringify(state));
    const log = [];
    questions.forEach((q, i) => {
      if (answers[i] == null) return; // unanswered => not evidence
      const ok = answers[i] === q.correct;
      recordAnswer(next, q.domain, q.subskill, ok, q.difficulty);
      log.push({ domain: q.domain, correct: ok });
    });
    endSession(next);
    commitSessionStats(next, log);
    // Persist the last mock result so the dashboard can show exam status.
    next.lastMock = { pct: results.pct, correct: results.correct, total: results.total, answered: results.answered, at: Date.now() };
    onCommit && onCommit(next);
    const nba = nextBestAction(next);
    setOutcome({ results, nba });
    setPhase('results');
  };

  // Countdown; auto-submit at zero. Stops once results are shown.
  useEffect(() => {
    if (phase === 'results') return undefined;
    if (timeLeft <= 0) { submit(); return undefined; }
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase]);

  const choose = (optIdx) => setAnswers((a) => { const n = a.slice(); n[idx] = optIdx; return n; });
  const toggleFlag = () => setFlagged((f) => { const n = new Set(f); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });
  const go = (i) => { setIdx(Math.max(0, Math.min(questions.length - 1, i))); setPhase('exam'); };

  // ---- RESULTS ---------------------------------------------------------------
  if (phase === 'results' && outcome) {
    const { results, nba } = outcome;
    const domOrder = ['recall', 'mechanical', 'math', 'reading'];
    const graded = results.subRows.filter((r) => r.n > 0).sort((a, b) => a.pct - b.pct);
    const weakest = graded.slice(0, 3);
    const strongest = [...graded].reverse().slice(0, 3);
    return (
      <div className="min-h-screen bg-uale-ivory text-uale-text">
        <main className="max-w-3xl mx-auto px-6 py-10">
          <div className="bg-uale-card border border-uale-stone-200 rounded-2xl shadow-sm p-8 text-center">
            <p className="text-sm text-uale-sec">Mock exam complete</p>
            <p className="font-uale-serif text-6xl font-semibold text-uale-ink mt-2">{results.pct}%</p>
            <p className="text-uale-sec mt-1">{results.correct} of {results.total} correct · {results.answered} answered · {fmtTime(EXAM_SECONDS - timeLeft)} used</p>
            <p className="mt-2 text-xs text-uale-faint">FCTC-aligned practice at the official section weighting (20 · 25 · 20 · 35).</p>
          </div>

          {/* Post-mock next action */}
          <div className="mt-6 bg-uale-hero-3 text-uale-cream rounded-2xl p-6">
            <div className="flex items-center gap-2 text-uale-champagne text-xs font-semibold uppercase tracking-wide"><Target className="w-4 h-4" /> Your biggest opportunity</div>
            <p className="mt-2 font-uale-serif text-[1.4rem] font-semibold text-white">{nba.skill?.subskillLabel || nba.title}</p>
            <p className="mt-1 text-sm text-uale-cream-dim">{nba.why}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {nba.domain === 'mechanical' && nba.subskill && (nba.kind === 'weak' || nba.kind === 'build')
                ? <button onClick={() => onRemediate(nba.domain, nba.subskill)} className="bg-uale-cta-fill text-uale-cta-text border border-uale-cta-border hover:bg-uale-cta-hover rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2"><Lightbulb className="w-4 h-4" /> Start guided practice</button>
                : <button onClick={onTargeted} className="bg-uale-cta-fill text-uale-cta-text border border-uale-cta-border hover:bg-uale-cta-hover rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2"><Target className="w-4 h-4" /> Start targeted practice</button>}
              <button onClick={onExit} className="bg-white/10 hover:bg-white/20 text-uale-cream border border-white/15 rounded-xl px-4 py-2.5 text-sm font-semibold">Back to dashboard</button>
            </div>
          </div>

          {/* Domain breakdown */}
          <div className="mt-6 bg-uale-card border border-uale-stone-200 rounded-2xl shadow-sm p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-uale-sec mb-4">By area</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {domOrder.filter((d) => results.byDomain[d]).map((d) => {
                const b = results.byDomain[d];
                const pct = Math.round((b.c / b.n) * 100);
                return (
                  <div key={d} className="rounded-xl border border-uale-stone-200 p-4">
                    <p className="text-sm font-medium text-uale-ink-2">{SUBSKILLS[d]?.label || d}</p>
                    <p className="font-uale-serif text-3xl font-semibold text-uale-ink mt-1">{pct}%</p>
                    <p className="text-xs text-uale-sec">{b.c}/{b.n} correct</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strengths / weaknesses */}
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <div className="bg-uale-card border border-uale-stone-200 rounded-2xl shadow-sm p-6">
              <h3 className="text-sm font-semibold text-uale-sage mb-3">Strongest skills</h3>
              {strongest.map((r) => (
                <div key={r.label} className="flex justify-between text-sm py-1"><span className="text-uale-ink-2">{r.label}</span><span className="font-semibold text-uale-sage">{r.pct}%</span></div>
              ))}
            </div>
            <div className="bg-uale-card border border-uale-stone-200 rounded-2xl shadow-sm p-6">
              <h3 className="text-sm font-semibold text-amber-700 mb-3">Focus next</h3>
              {weakest.map((r) => (
                <div key={r.label} className="flex justify-between text-sm py-1"><span className="text-uale-ink-2">{r.label} <span className="text-uale-faint">· {r.domainLabel}</span></span><span className="font-semibold text-amber-700">{r.pct}%</span></div>
              ))}
            </div>
          </div>

          {/* Full subskill breakdown */}
          <div className="mt-6 bg-uale-card border border-uale-stone-200 rounded-2xl shadow-sm p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-uale-sec mb-4">Every subskill</h2>
            <div className="space-y-2">
              {graded.map((r) => (
                <div key={r.label} className="flex items-center gap-3">
                  <span className="text-xs text-uale-sec w-40 shrink-0 truncate">{r.label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-uale-stone-100 overflow-hidden">
                    <div className={'h-full ' + (r.pct >= 75 ? 'bg-uale-sage' : r.pct >= 50 ? 'bg-uale-brass' : 'bg-amber-400')} style={{ width: r.pct + '%' }} />
                  </div>
                  <span className="text-xs text-uale-sec w-16 text-right">{r.c}/{r.n}</span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ---- REVIEW ----------------------------------------------------------------
  const Palette = () => (
    <div className="grid grid-cols-10 gap-1.5">
      {questions.map((_, i) => {
        const isCur = i === idx;
        const ans = answers[i] != null;
        const flag = flagged.has(i);
        let cls = 'bg-uale-stone-50 text-uale-sec ring-uale-stone-200';
        if (ans) cls = 'bg-uale-ink text-uale-cream ring-uale-ink';
        if (flag) cls = 'bg-amber-100 text-amber-800 ring-amber-400';
        if (isCur) cls = 'bg-uale-brass-2 text-white ring-uale-brass-2';
        return (
          <button key={i} onClick={() => go(i)} className={'h-8 rounded text-xs font-medium ring-1 ' + cls}>{i + 1}</button>
        );
      })}
    </div>
  );

  if (phase === 'review') {
    const unanswered = answers.map((a, i) => (a == null ? i : -1)).filter((i) => i >= 0);
    return (
      <div className="min-h-screen bg-uale-ivory text-uale-text">
        <main className="max-w-2xl mx-auto px-6 py-10">
          <div className="bg-uale-card border border-uale-stone-200 rounded-2xl shadow-sm p-6">
            <h1 className="font-uale-serif text-xl font-semibold text-uale-ink">Review before submitting</h1>
            <div className="mt-3 flex gap-4 text-sm">
              <span className="text-uale-ink-2"><b>{answeredCount}</b> answered</span>
              <span className="text-amber-700"><b>{unanswered.length}</b> unanswered</span>
              <span className="text-amber-600"><b>{flagged.size}</b> flagged</span>
            </div>
            {unanswered.length > 0 && (
              <p className="mt-3 text-sm text-uale-sec">Unanswered questions are scored as incorrect. Tap a number to go back, or submit now.</p>
            )}
            <div className="mt-5"><Palette /></div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => go(idx)} className="flex-1 bg-uale-paper border border-uale-stone-200 text-uale-ink-2 rounded-lg py-3 text-sm font-semibold">Back to exam</button>
              <button onClick={submit} className="flex-1 bg-uale-cta-fill text-uale-cta-text border border-uale-cta-border hover:bg-uale-cta-hover rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4" /> Submit exam</button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ---- EXAM ------------------------------------------------------------------
  const q = questions[idx];
  const lab = labelFor(q);
  const low = timeLeft <= 300;
  return (
    <div className="min-h-screen bg-uale-ivory text-uale-text">
      <header className="bg-uale-paper border-b border-uale-stone-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-uale-ink-2">Mock Exam</span>
            <span className={'flex items-center gap-1.5 font-semibold tabular-nums ' + (low ? 'text-rose-600' : 'text-uale-ink-2')}><Clock className="w-4 h-4" /> {fmtTime(timeLeft)}</span>
            <button onClick={onExit} className="text-uale-faint hover:text-uale-ink-2 flex items-center gap-1 text-xs"><X className="w-4 h-4" /> Exit</button>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-neutral-200 overflow-hidden">
            <div className="h-full bg-uale-brass transition-all" style={{ width: ((idx + 1) / questions.length) * 100 + '%' }} />
          </div>
          <div className="mt-1 flex justify-between text-xs text-uale-faint">
            <span>Question {idx + 1} of {questions.length}</span>
            <span>{answeredCount} answered</span>
          </div>
        </div>
      </header>

      <main key={q.id} className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs px-2 py-1 rounded-full bg-uale-stone-100 text-uale-ink-2">{lab.domain} · {lab.subskill}</span>
          <button onClick={toggleFlag} className={'text-xs flex items-center gap-1 px-2 py-1 rounded-full ring-1 ' + (flagged.has(idx) ? 'bg-amber-100 text-amber-700 ring-amber-300' : 'text-uale-sec ring-uale-stone-200 hover:bg-uale-stone-100')}>
            <Flag className="w-3 h-3" /> {flagged.has(idx) ? 'Flagged' : 'Flag'}
          </button>
        </div>
        {q.passage && (
          <pre className="whitespace-pre-wrap text-sm bg-neutral-900 text-neutral-100 rounded-xl p-4 mb-5 font-mono leading-relaxed">{q.passage}</pre>
        )}
        <h2 className="text-xl font-semibold text-uale-ink mb-5">{q.prompt}</h2>
        {/* During the exam diagrams never reveal the answer. */}
        {q.visual && <MechanicalDiagram visual={q.visual} revealed={false} />}
        <div className="space-y-3">
          {q.options.map((opt, i) => {
            const picked = answers[idx] === i;
            return (
              <button key={i} onClick={() => choose(i)}
                className={'w-full text-left px-4 py-3.5 rounded-xl border-2 transition flex items-center gap-2 ' + (picked ? 'border-uale-brass-lite bg-uale-brass-soft' : 'border-uale-stone-200 hover:border-uale-brass-lite')}>
                <span className="text-uale-faint">{String.fromCharCode(65 + i)}</span><span className="text-uale-ink-2">{opt}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button onClick={() => go(idx - 1)} disabled={idx === 0} className="flex items-center gap-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-uale-ink-2 bg-uale-paper border border-uale-stone-200 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /> Prev</button>
          {idx < questions.length - 1
            ? <button onClick={() => go(idx + 1)} className="flex-1 flex items-center justify-center gap-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-uale-cta-text bg-uale-cta-fill border border-uale-cta-border hover:bg-uale-cta-hover">Next <ChevronRight className="w-4 h-4" /></button>
            : <button onClick={() => setPhase('review')} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-uale-cta-text bg-uale-cta-fill border border-uale-cta-border hover:bg-uale-cta-hover">Review &amp; submit</button>}
          <button onClick={() => setPhase('review')} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-uale-ink-2 bg-uale-paper border border-uale-stone-200">Review</button>
        </div>

        <div className="mt-8 bg-uale-card border border-uale-stone-200 rounded-2xl shadow-sm p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-uale-faint mb-3">Question navigator</p>
          <Palette />
        </div>
      </main>
    </div>
  );
}
