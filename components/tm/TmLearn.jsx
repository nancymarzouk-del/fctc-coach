'use client';

// TmLearn — LEARN MODE for Time Management ("Teach before test", Sprint 3+).
// ----------------------------------------------------------------------------
// A full instructional experience BEFORE adaptive Practice. It has five parts,
// all instructional-only (never mastery — that still comes from Practice):
//   1. Core skills   — deep lessons: prioritization, estimation, decomposition
//                      (intro→concept→framework→worked→contrast→guided→quickcheck)
//   2. Strategy toolkit — practical methods (time boxing, blocking, focus sprints,
//                      five-minute start, batching, backward planning, reviews…),
//                      each: what / when (& when not) / how / example / common
//                      failure / guided practice.
//   3. Choose a strategy — the SELECTION skill: match a felt problem to a method.
//   4. When plans fall apart — failure recovery + low-motivation patterns (never
//                      "lazy" — observable patterns) + a mixed-life evening.
//   5. Your toolkit — a personal reference + the ultimate learning outcomes.
// Guided practice is instructional (hints + coaching, never punitive). The quick
// check only gates readiness to enter Practice; it NEVER marks mastery. When a
// learner struggles, Alyce reteaches with a DIFFERENT approach each time.
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle2, XCircle, Lightbulb, BookOpen, Sparkles, Wrench, Compass, LifeBuoy, ListChecks } from 'lucide-react';
import { LESSONS, LESSON_ORDER, LESSON_STEPS, evaluateQuickCheck } from '../../lib/certifications/tm/lessons.mjs';
import {
  STRATEGIES, STRATEGY_ORDER, STRATEGY_GROUPS, strategyFor, strategiesInGroup,
  STRATEGY_PROBLEMS, evaluateSelector, MOTIVATION_PATTERNS, FAILURE_RECOVERY, MIXED_LIFE,
} from '../../lib/certifications/tm/strategies.mjs';
import {
  loadLearnState, saveLearnState, setStepIndex, recordQuickCheck, recordReteach, pickReteach,
  lessonStatus, completedCount, isFreshLearner, LESSON_STATUS,
  markStrategyViewed, markStrategyPracticed, strategyPracticed, strategyProgress,
  recordSelector, selectorCompleted,
} from '../../lib/certifications/tm/tmLearnStore.mjs';

const STATUS_LABEL = { 'not-started': 'Not started', 'in-progress': 'In progress', complete: 'Complete' };
const STEP_TITLE = { intro: 'Overview', concept: 'The idea', framework: 'A framework you can reuse', worked: 'Worked example', contrast: 'What goes wrong', guided: 'Guided practice', quickcheck: 'Quick check' };

// The 13 ultimate outcomes — the north star shown in "Your toolkit".
const OUTCOMES = [
  'Identify what actually matters', 'Distinguish urgency from importance', 'Recognize dependencies & consequences',
  'Estimate realistically', 'Understand your available capacity', 'Break overwhelming work into actions',
  'Choose an appropriate execution strategy', 'Protect your attention', 'Start even when motivation is low',
  'Adjust when the plan changes', 'Deliberately decide what will NOT get done', 'Communicate tradeoffs when needed',
  'Review what worked and improve the next plan',
];

export default function TmLearn({ learnerKey, onGoPractice }) {
  const [state, setState] = useState(() => loadLearnState(learnerKey));
  const [screen, setScreen] = useState({ kind: 'home' });
  const learnerRef = useRef(learnerKey);
  useEffect(() => { learnerRef.current = learnerKey; setState(loadLearnState(learnerKey)); setScreen({ kind: 'home' }); }, [learnerKey]);
  const persist = (next) => { setState(next); saveLearnState(next, learnerRef.current); };
  const home = () => setScreen({ kind: 'home' });

  if (screen.kind === 'lesson') return <LessonScreen topic={screen.topic} state={state} persist={persist} onHome={home} onGoPractice={onGoPractice} />;
  if (screen.kind === 'strategy') return <StrategyScreen id={screen.id} state={state} persist={persist} onHome={home} onOpenStrategy={(id) => setScreen({ kind: 'strategy', id })} />;
  if (screen.kind === 'selector') return <SelectorScreen state={state} persist={persist} onHome={home} onOpenStrategy={(id) => setScreen({ kind: 'strategy', id })} />;
  if (screen.kind === 'recovery') return <RecoveryScreen onHome={home} onOpenStrategy={(id) => setScreen({ kind: 'strategy', id })} />;
  if (screen.kind === 'toolkit') return <ToolkitScreen state={state} onHome={home} onOpenStrategy={(id) => setScreen({ kind: 'strategy', id })} />;
  return <LearnHome state={state} setScreen={setScreen} />;
}

// ============================================================================
// LEARN HOME — orientation + the five parts
// ============================================================================
function LearnHome({ state, setScreen }) {
  const fresh = useMemo(() => isFreshLearner(state), [state]);
  const doneLessons = completedCount(state);
  const sp = strategyProgress(state, STRATEGY_ORDER.length);
  return (
    <div>
      {fresh ? (
        <section className="mb-6 rounded-2xl border border-uale-stone-200 bg-uale-card p-6">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-uale-brass-2"><Sparkles className="h-4 w-4" /> Welcome</p>
          <h2 className="mt-2 font-uale-serif text-[22px] font-semibold text-uale-ink">Take control of your time</h2>
          <p className="mt-2 text-[14px] text-uale-text">First you’ll build three core skills:</p>
          <ul className="mt-1.5 space-y-1 text-[14px] text-uale-text">
            <li>• Decide what matters most</li>
            <li>• Estimate time realistically</li>
            <li>• Turn overwhelming work into clear next steps</li>
          </ul>
          <p className="mt-3 text-[14px] text-uale-text">Then you’ll build a <b>toolkit of practical strategies</b> — how to plan a day, start when you don’t feel like it, protect your focus, and recover when a plan falls apart — that you can use across work, study, and home.</p>
          <p className="mt-3 text-[13px] text-uale-sec">We teach each skill first, with examples — then you prove it in Practice, where it counts toward mastery.</p>
          <button onClick={() => setScreen({ kind: 'lesson', topic: LESSON_ORDER[0] })} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-uale-ink px-4 py-2 text-[13px] font-semibold text-uale-cream hover:opacity-90">Start learning <ArrowRight className="h-4 w-4" /></button>
        </section>
      ) : (
        <section className="mb-6 rounded-2xl border border-uale-stone-200 bg-uale-card p-5">
          <p className="text-[15px] font-semibold text-uale-ink">Keep learning</p>
          <p className="mt-1 text-[13px] text-uale-sec">Core skills: {doneLessons}/{LESSON_ORDER.length} · Toolkit strategies practiced: {sp.practiced}/{sp.total}. Pick up anywhere below.</p>
        </section>
      )}

      {/* 1. Core skills */}
      <SectionHead icon={BookOpen} title="Core skills" blurb="The three foundations, taught in depth." />
      <div className="mb-6 grid gap-3">
        {LESSON_ORDER.map((t) => {
          const l = LESSONS[t]; const st = lessonStatus(state, t);
          return (
            <button key={t} onClick={() => setScreen({ kind: 'lesson', topic: t })} className="flex items-center justify-between gap-3 rounded-xl border border-uale-stone-200 bg-uale-card p-4 text-left hover:border-uale-stone-300">
              <div className="min-w-0">
                <div className="flex items-center gap-2"><span className="font-uale-serif text-[16px] font-semibold text-uale-ink">{l.title}</span><span className={statusPill(st)}>{STATUS_LABEL[st]}</span></div>
                <div className="mt-0.5 text-[12.5px] text-uale-sec">{l.oneLiner}</div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-uale-ink-2">{st === LESSON_STATUS.COMPLETE ? 'Review' : st === LESSON_STATUS.IN_PROGRESS ? 'Resume' : 'Start'} <ArrowRight className="h-4 w-4" /></span>
            </button>
          );
        })}
      </div>

      {/* 2. Strategy toolkit */}
      <SectionHead icon={Wrench} title="Strategy toolkit" blurb="Practical methods for planning, starting, and protecting your time." />
      <div className="mb-6 space-y-4">
        {STRATEGY_GROUPS.map((g) => (
          <div key={g.key} className="rounded-xl border border-uale-stone-200 bg-uale-card p-4">
            <p className="text-[13.5px] font-semibold text-uale-ink">{g.title}</p>
            <p className="text-[12px] text-uale-sec">{g.blurb}</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {strategiesInGroup(g.key).map((id) => {
                const s = STRATEGIES[id]; const done = strategyPracticed(state, id);
                return (
                  <button key={id} onClick={() => setScreen({ kind: 'strategy', id })} className={'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium ' + (done ? 'border-uale-sage bg-uale-sage-soft text-uale-ink' : 'border-uale-stone-200 bg-uale-paper text-uale-text hover:border-uale-stone-300')}>
                    {done && <CheckCircle2 className="h-3.5 w-3.5 text-uale-sage" />}{s.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Choose a strategy */}
      <SectionHead icon={Compass} title="Choose the right strategy" blurb="The real skill: match the method to the problem." />
      <BigCard onClick={() => setScreen({ kind: 'selector' })} title="Practice choosing" desc="Given a real problem — “I know what to do but don’t start”, “everything feels urgent” — pick the strategy that fits." done={selectorCompleted(state)} doneLabel="Completed" />

      {/* 4. When plans fall apart */}
      <SectionHead icon={LifeBuoy} title="When plans fall apart" blurb="Recovering a broken plan, and starting when motivation is low." />
      <BigCard onClick={() => setScreen({ kind: 'recovery' })} title="Recovery & motivation patterns" desc="What to do when the day derails, and strategies for low initiation, overwhelm, avoidance, and distraction — no labels, just patterns and fixes." />

      {/* 5. Your toolkit */}
      <SectionHead icon={ListChecks} title="Your toolkit" blurb="Everything in one place — and where you’re headed." />
      <BigCard onClick={() => setScreen({ kind: 'toolkit' })} title="See your toolkit" desc={`A quick reference to all ${STRATEGY_ORDER.length} strategies, and the 13 things you’ll be able to do independently by the end.`} />

      <p className="mt-6 text-[12px] text-uale-faint">Lessons and the toolkit build understanding. Proving it — and earning “mastered” — happens in Practice.</p>
    </div>
  );
}

// ============================================================================
// 1. LESSON SCREEN — the core-skill player
// ============================================================================
function LessonScreen({ topic, state, persist, onHome, onGoPractice }) {
  const lesson = LESSONS[topic];
  const [step, setStep] = useState(() => Math.min(state.competencies?.[topic]?.stepIndex || 0, LESSON_STEPS.length - 1));
  const goStep = (i) => { const clamped = Math.max(0, Math.min(i, LESSON_STEPS.length - 1)); setStep(clamped); persist(setStepIndex(state, topic, clamped)); };
  useEffect(() => { persist(setStepIndex(state, topic, step)); /* eslint-disable-next-line */ }, []);
  const stepKey = LESSON_STEPS[step];
  return (
    <div>
      <TopBar onHome={onHome} crumb={`${lesson.title} · ${STEP_TITLE[stepKey]}`} />
      <StepRail step={step} />
      <div className="rounded-2xl border border-uale-stone-200 bg-uale-card p-5">
        {stepKey === 'intro' && <Intro lesson={lesson} />}
        {stepKey === 'concept' && <Concept c={lesson.concept} />}
        {stepKey === 'framework' && <Framework f={lesson.framework} visual={lesson.visual} />}
        {stepKey === 'worked' && <Worked w={lesson.worked} />}
        {stepKey === 'contrast' && <Contrast c={lesson.contrast} />}
        {stepKey === 'guided' && <Guided g={lesson.guided} />}
        {stepKey === 'quickcheck' && (
          <QuickCheck lesson={lesson} topic={topic} state={state}
            onPass={() => persist(recordQuickCheck(state, topic, true))}
            onFail={() => persist(recordQuickCheck(state, topic, false))}
            onReteachShown={(approach) => persist(recordReteach(state, topic, approach))}
            reteachApproach={pickReteach}
            onGoPractice={() => onGoPractice && onGoPractice(topic)}
            onReview={() => goStep(LESSON_STEPS.indexOf('worked'))} />
        )}
        {stepKey !== 'quickcheck' && (
          <div className="mt-5 flex items-center justify-between border-t border-uale-stone-100 pt-4">
            <button onClick={() => goStep(step - 1)} disabled={step === 0} className={'text-[13px] font-semibold ' + (step === 0 ? 'text-uale-faint' : 'text-uale-sec hover:text-uale-ink')}>Back</button>
            <button onClick={() => goStep(step + 1)} className="inline-flex items-center gap-1.5 rounded-lg bg-uale-ink px-4 py-2 text-[13px] font-semibold text-uale-cream hover:opacity-90">
              {step + 1 === LESSON_STEPS.indexOf('quickcheck') ? 'I’m ready — quick check' : 'Continue'} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Intro({ lesson }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-uale-brass-2"><BookOpen className="h-4 w-4" /> {lesson.title}</p>
      <h2 className="mt-2 font-uale-serif text-[22px] font-semibold text-uale-ink">{lesson.oneLiner}</h2>
      <p className="mt-3 text-[13.5px] text-uale-sec">You’ll learn what the skill is, a framework you can reuse, watch a worked example, see what commonly goes wrong, try it with guidance, and take a quick check before Practice.</p>
    </div>
  );
}
function Concept({ c }) {
  return (
    <div className="space-y-3 text-[14px] text-uale-text">
      <P label="What it is">{c.what}</P>
      <P label="Why it matters">{c.why}</P>
      <P label="When it matters">{c.when}</P>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-uale-sec">Common mistakes</p>
        <ul className="mt-1 space-y-1">{c.mistakes.map((m, i) => <li key={i} className="text-[13.5px] text-uale-text">• {m}</li>)}</ul>
      </div>
    </div>
  );
}
function Framework({ f, visual }) {
  return (
    <div>
      <p className="rounded-lg bg-uale-brass-soft px-3 py-2 text-[13.5px] font-medium text-uale-ink">{f.keyIdea}</p>
      <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-uale-sec">{f.title}</p>
      <ol className="mt-2 space-y-2">
        {f.steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-uale-stone-100 text-[12px] font-bold text-uale-ink-2">{i + 1}</span>
            <span className="text-[13.5px] text-uale-text"><b className="text-uale-ink">{s.label}.</b> {s.text}</span>
          </li>
        ))}
      </ol>
      <div className="mt-4"><Visual kind={visual} /></div>
    </div>
  );
}
function Worked({ w }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-uale-brass-2"><Sparkles className="h-4 w-4" /> Watch Alyce reason through it</p>
      <p className="mt-2 text-[13.5px] text-uale-text">{w.scenario}</p>
      <ul className="mt-2 space-y-1 rounded-lg border border-uale-stone-200 bg-uale-paper p-3 text-[13px] text-uale-text">
        {w.tasks.map((t, i) => <li key={i}>• {t}</li>)}
      </ul>
      <ol className="mt-3 space-y-2">
        {w.steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-uale-brass-soft text-[12px] font-bold text-uale-brass-2">{i + 1}</span>
            <span className="text-[13.5px] text-uale-text"><b className="text-uale-ink">{s.label}.</b> {s.text}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 rounded-lg bg-uale-sage-soft px-3 py-2 text-[13.5px] font-medium text-uale-ink">Decision: {w.decision}</p>
    </div>
  );
}
function Contrast({ c }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-rose-700"><XCircle className="h-4 w-4" /> Weaker reasoning</p>
        <p className="mt-1 text-[13.5px] text-rose-900">{c.weak}</p>
      </div>
      <div className="rounded-xl border border-uale-sage bg-uale-sage-soft p-3">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-uale-sage"><CheckCircle2 className="h-4 w-4" /> Better reasoning</p>
        <p className="mt-1 text-[13.5px] text-uale-ink">{c.better}</p>
      </div>
    </div>
  );
}
function Guided({ g }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-uale-brass-2"><Lightbulb className="h-4 w-4" /> Try it — I’ll guide you</p>
      <p className="mt-2 text-[13.5px] text-uale-text">{g.scenario}</p>
      {g.tasks && <ul className="mt-2 space-y-1 rounded-lg border border-uale-stone-200 bg-uale-paper p-3 text-[13px] text-uale-text">{g.tasks.map((t, i) => <li key={i}>• {t}</li>)}</ul>}
      <div className="mt-3 space-y-4">{g.prompts.map((p, i) => <MCQ key={i} q={p.q} options={p.options} correct={p.correct} hint={p.hint} coach={p.coach} />)}</div>
    </div>
  );
}

// Quick check — decides readiness for Practice. Pass → complete + CTA to Practice.
// Fail → a DIFFERENT-approach reteach (varied), then retry. NEVER marks mastery.
function QuickCheck({ lesson, topic, state, onPass, onFail, onReteachShown, reteachApproach, onGoPractice, onReview }) {
  const items = lesson.quickcheck;
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [reteach, setReteach] = useState(null);
  const check = () => {
    const r = evaluateQuickCheck(items, answers);
    setResult(r);
    if (r.passed) { onPass(); }
    else {
      onFail();
      const approach = reteachApproach(state, topic, lesson.reteach.map((x) => x.approach));
      const card = lesson.reteach.find((x) => x.approach === approach) || lesson.reteach[0];
      setReteach(card); onReteachShown(card.approach);
    }
  };
  const retry = () => { setAnswers({}); setResult(null); setReteach(null); };

  if (result && result.passed) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-uale-sage" />
        <p className="mt-2 font-uale-serif text-[18px] font-semibold text-uale-ink">You’ve got the idea.</p>
        <p className="mt-1 text-[13px] text-uale-sec">Reading and quick checks build understanding — now prove it independently in Practice, where it counts toward mastery.</p>
        <div className="mt-4 flex justify-center">
          <button onClick={onGoPractice} className="inline-flex items-center gap-1.5 rounded-lg bg-uale-ink px-4 py-2 text-[13px] font-semibold text-uale-cream hover:opacity-90">Practice {lesson.title.toLowerCase()} <ArrowRight className="h-4 w-4" /></button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-uale-brass-2"><CheckCircle2 className="h-4 w-4" /> Quick check</p>
      <p className="mt-1 text-[12.5px] text-uale-faint">Just to see if you’re ready for Practice — this doesn’t affect your mastery.</p>
      <div className="mt-3 space-y-4">
        {items.map((q, qi) => (
          <div key={qi} className="rounded-xl border border-uale-stone-200 bg-uale-paper p-3">
            <p className="text-[13.5px] font-medium text-uale-ink">{q.q}</p>
            <div className="mt-2 space-y-1.5">
              {q.options.map((o, i) => {
                const chosen = answers[qi] === i;
                const showCorrect = result && i === q.correct;
                const showWrong = result && chosen && i !== q.correct;
                return (
                  <button key={i} disabled={!!result} onClick={() => setAnswers((a) => ({ ...a, [qi]: i }))}
                    className={'flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-[13px] ' + (showCorrect ? 'border-uale-sage bg-uale-sage-soft text-uale-ink' : showWrong ? 'border-rose-300 bg-rose-50 text-rose-900' : chosen ? 'border-uale-brass-lite bg-uale-brass-soft text-uale-ink' : 'border-uale-stone-200 bg-white text-uale-text hover:border-uale-stone-300')}>
                    <span className="font-semibold">{String.fromCharCode(65 + i)}</span><span className="flex-1">{o}</span>
                  </button>
                );
              })}
            </div>
            {result && <p className="mt-2 text-[12.5px] text-uale-sec">{q.explain}</p>}
          </div>
        ))}
      </div>
      {reteach && (
        <div className="mt-4 rounded-xl border border-uale-brass-lite bg-uale-brass-soft p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-uale-brass-2"><Lightbulb className="h-4 w-4" /> Let’s look at it a different way — {reteach.title}</p>
          <p className="mt-2 text-[13.5px] text-uale-ink">{reteach.body}</p>
        </div>
      )}
      <div className="mt-4 flex items-center gap-2">
        {!result
          ? <button onClick={check} disabled={Object.keys(answers).length < items.length} className={'rounded-lg px-4 py-2 text-[13px] font-semibold ' + (Object.keys(answers).length < items.length ? 'bg-uale-stone-200 text-uale-faint' : 'bg-uale-ink text-uale-cream hover:opacity-90')}>Check</button>
          : <>
              <button onClick={retry} className="rounded-lg bg-uale-ink px-4 py-2 text-[13px] font-semibold text-uale-cream hover:opacity-90">Try the check again</button>
              <button onClick={onReview} className="rounded-lg border border-uale-stone-200 bg-uale-paper px-4 py-2 text-[13px] font-semibold text-uale-ink-2 hover:border-uale-stone-300">See the worked example again</button>
            </>}
      </div>
    </div>
  );
}

// ============================================================================
// 2. STRATEGY SCREEN — a single toolkit method, taught end to end
// ============================================================================
function StrategyScreen({ id, state, persist, onHome, onOpenStrategy }) {
  const s = strategyFor(id);
  useEffect(() => { if (s) persist(markStrategyViewed(state, id)); /* eslint-disable-next-line */ }, [id]);
  if (!s) { onHome(); return null; }
  return (
    <div>
      <TopBar onHome={onHome} crumb={`Toolkit · ${s.name}`} />
      <div className="rounded-2xl border border-uale-stone-200 bg-uale-card p-5">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-uale-brass-2"><Wrench className="h-4 w-4" /> Strategy</p>
        <h2 className="mt-2 font-uale-serif text-[22px] font-semibold text-uale-ink">{s.name}</h2>
        <p className="mt-1 text-[13.5px] text-uale-sec">{s.tagline}</p>

        <div className="mt-4 space-y-3 text-[14px] text-uale-text">
          <P label="What it is">{s.what}</P>
          <P label="When to use it">{s.when}</P>
          {s.whenNot && <P label="When NOT to use it">{s.whenNot}</P>}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-uale-sec">How to use it</p>
            <ol className="mt-1 space-y-1.5">
              {s.how.map((h, i) => (
                <li key={i} className="flex gap-2.5"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-uale-stone-100 text-[11px] font-bold text-uale-ink-2">{i + 1}</span><span className="text-[13.5px]">{h}</span></li>
              ))}
            </ol>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-uale-sage bg-uale-sage-soft p-3"><p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-uale-sage"><CheckCircle2 className="h-4 w-4" /> Example</p><p className="mt-1 text-[13px] text-uale-ink">{s.example.good}</p></div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3"><p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-rose-700"><XCircle className="h-4 w-4" /> Not this</p><p className="mt-1 text-[13px] text-rose-900">{s.example.bad}</p></div>
          </div>
          <div className="rounded-lg bg-uale-paper px-3 py-2"><p className="text-[11px] font-bold uppercase tracking-wide text-uale-sec">Common failure</p><p className="mt-0.5 text-[13.5px] text-uale-text">{s.failure}</p></div>
        </div>

        <div className="mt-5 border-t border-uale-stone-100 pt-4">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-uale-brass-2"><Lightbulb className="h-4 w-4" /> Guided practice</p>
          <div className="mt-2">
            <MCQ q={s.guided.q} options={s.guided.options} correct={s.guided.correct} hint={s.guided.hint} coach={s.guided.coach}
              onAnswered={() => persist(markStrategyPracticed(state, id))} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={onHome} className="inline-flex items-center gap-1.5 rounded-lg bg-uale-ink px-4 py-2 text-[13px] font-semibold text-uale-cream hover:opacity-90">Add to my toolkit <CheckCircle2 className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 3. SELECTOR SCREEN — choose the strategy that fits the problem
// ============================================================================
function SelectorScreen({ state, persist, onHome, onOpenStrategy }) {
  const problems = STRATEGY_PROBLEMS;
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const check = () => {
    const r = evaluateSelector(problems, answers);
    setResult(r);
    persist(recordSelector(state, r.correct, r.total, r.passed));
  };
  const retry = () => { setAnswers({}); setResult(null); };
  const allAnswered = Object.keys(answers).length >= problems.length;
  return (
    <div>
      <TopBar onHome={onHome} crumb="Choose the right strategy" />
      <div className="rounded-2xl border border-uale-stone-200 bg-uale-card p-5">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-uale-brass-2"><Compass className="h-4 w-4" /> Match the method to the problem</p>
        <p className="mt-1 text-[13px] text-uale-sec">A toolkit only helps if you pick the right tool. For each problem, choose the best-fit strategy. This builds judgment — it doesn’t affect your mastery.</p>
        <div className="mt-3 space-y-4">
          {problems.map((p, qi) => (
            <div key={qi} className="rounded-xl border border-uale-stone-200 bg-uale-paper p-3">
              <p className="text-[13.5px] font-medium text-uale-ink">{p.problem}</p>
              <div className="mt-2 space-y-1.5">
                {p.options.map((o, i) => {
                  const chosen = answers[qi] === i;
                  const showCorrect = result && i === p.correct;
                  const showWrong = result && chosen && i !== p.correct;
                  return (
                    <button key={i} disabled={!!result} onClick={() => setAnswers((a) => ({ ...a, [qi]: i }))}
                      className={'flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-[13px] ' + (showCorrect ? 'border-uale-sage bg-uale-sage-soft text-uale-ink' : showWrong ? 'border-rose-300 bg-rose-50 text-rose-900' : chosen ? 'border-uale-brass-lite bg-uale-brass-soft text-uale-ink' : 'border-uale-stone-200 bg-white text-uale-text hover:border-uale-stone-300')}>
                      <span className="font-semibold">{String.fromCharCode(65 + i)}</span><span className="flex-1">{o}</span>
                    </button>
                  );
                })}
              </div>
              {result && (
                <div className="mt-2">
                  <p className="text-[12.5px] text-uale-sec">{p.why}</p>
                  {p.also && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {p.also.map((sid) => strategyFor(sid) && (
                        <button key={sid} onClick={() => onOpenStrategy(sid)} className="inline-flex items-center gap-1 rounded-full border border-uale-brass-lite bg-uale-brass-soft px-2.5 py-1 text-[11.5px] font-medium text-uale-brass-2 hover:opacity-90">{strategyFor(sid).name} <ArrowRight className="h-3 w-3" /></button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        {result && (
          <div className={'mt-4 rounded-xl border p-3 text-[13px] ' + (result.passed ? 'border-uale-sage bg-uale-sage-soft text-uale-ink' : 'border-uale-brass-lite bg-uale-brass-soft text-uale-ink')}>
            {result.passed
              ? <>You matched {result.correct}/{result.total}. You’re starting to diagnose the problem before reaching for a tool — that’s the whole skill.</>
              : <>You matched {result.correct}/{result.total}. Look at the reasoning under each one, then try again — notice you’re choosing by the TYPE of problem (ordering? starting? capacity? interruptions?).</>}
          </div>
        )}
        <div className="mt-4 flex items-center gap-2">
          {!result
            ? <button onClick={check} disabled={!allAnswered} className={'rounded-lg px-4 py-2 text-[13px] font-semibold ' + (!allAnswered ? 'bg-uale-stone-200 text-uale-faint' : 'bg-uale-ink text-uale-cream hover:opacity-90')}>Check my choices</button>
            : <button onClick={retry} className="rounded-lg bg-uale-ink px-4 py-2 text-[13px] font-semibold text-uale-cream hover:opacity-90">Try again</button>}
          <button onClick={onHome} className="rounded-lg border border-uale-stone-200 bg-uale-paper px-4 py-2 text-[13px] font-semibold text-uale-ink-2 hover:border-uale-stone-300">Back to lessons</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. RECOVERY SCREEN — failure recovery + motivation patterns + mixed life
// ============================================================================
function RecoveryScreen({ onHome, onOpenStrategy }) {
  const fr = FAILURE_RECOVERY; const ml = MIXED_LIFE;
  return (
    <div>
      <TopBar onHome={onHome} crumb="When plans fall apart" />

      <div className="rounded-2xl border border-uale-stone-200 bg-uale-card p-5">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-uale-brass-2"><LifeBuoy className="h-4 w-4" /> {fr.title}</p>
        <p className="mt-2 text-[13.5px] text-uale-text">{fr.intro}</p>
        <ol className="mt-3 space-y-1.5">
          {fr.principles.map((p, i) => <li key={i} className="flex gap-2.5"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-uale-stone-100 text-[11px] font-bold text-uale-ink-2">{i + 1}</span><span className="text-[13.5px] text-uale-text">{p}</span></li>)}
        </ol>
        <div className="mt-4 rounded-xl border border-uale-stone-200 bg-uale-paper p-3">
          <p className="text-[13px] text-uale-text">{fr.scenario.setup}</p>
          <div className="mt-2"><MCQ q={fr.scenario.prompt} options={fr.scenario.options} correct={fr.scenario.correct} coach={fr.scenario.coach} /></div>
        </div>
      </div>

      {/* Motivation as observable patterns — never "lazy". */}
      <div className="mt-5 rounded-2xl border border-uale-stone-200 bg-uale-card p-5">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-uale-brass-2"><Sparkles className="h-4 w-4" /> When you don’t feel like starting</p>
        <p className="mt-1 text-[13px] text-uale-sec">This is never about being “lazy”. It’s a pattern with a cause — and each cause has a fix. Find the one that sounds like you, then tap a strategy.</p>
        <div className="mt-3 space-y-3">
          {MOTIVATION_PATTERNS.map((m) => (
            <div key={m.key} className="rounded-xl border border-uale-stone-200 bg-uale-paper p-3">
              <p className="text-[13.5px] font-semibold text-uale-ink">{m.label}</p>
              <p className="mt-0.5 text-[13px] italic text-uale-sec">{m.soundsLike}</p>
              <p className="mt-1 text-[13px] text-uale-text">{m.note}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {m.strategies.map((sid) => strategyFor(sid) && (
                  <button key={sid} onClick={() => onOpenStrategy(sid)} className="inline-flex items-center gap-1 rounded-full border border-uale-brass-lite bg-uale-brass-soft px-2.5 py-1 text-[11.5px] font-medium text-uale-brass-2 hover:opacity-90">{strategyFor(sid).name} <ArrowRight className="h-3 w-3" /></button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mixed-life evening — tradeoffs, not "fit it all in". */}
      <div className="mt-5 rounded-2xl border border-uale-stone-200 bg-uale-card p-5">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-uale-brass-2"><Compass className="h-4 w-4" /> {ml.title}</p>
        <ul className="mt-2 space-y-1 rounded-lg border border-uale-stone-200 bg-uale-paper p-3 text-[13px] text-uale-text">
          {ml.setup.map((s, i) => <li key={i}>• {s}</li>)}
        </ul>
        <p className="mt-2 text-[13px] text-uale-text">{ml.teaching}</p>
        <div className="mt-2"><MCQ q={ml.prompt} options={ml.options} correct={ml.correct} coach={ml.coach} /></div>
      </div>

      <div className="mt-5 flex justify-end"><button onClick={onHome} className="rounded-lg border border-uale-stone-200 bg-uale-paper px-4 py-2 text-[13px] font-semibold text-uale-ink-2 hover:border-uale-stone-300">Back to lessons</button></div>
    </div>
  );
}

// ============================================================================
// 5. TOOLKIT SCREEN — personal reference + ultimate outcomes
// ============================================================================
function ToolkitScreen({ state, onHome, onOpenStrategy }) {
  const sp = strategyProgress(state, STRATEGY_ORDER.length);
  return (
    <div>
      <TopBar onHome={onHome} crumb="Your toolkit" />
      <div className="rounded-2xl border border-uale-stone-200 bg-uale-card p-5">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-uale-brass-2"><ListChecks className="h-4 w-4" /> Your toolkit</p>
        <p className="mt-1 text-[13px] text-uale-sec">{sp.practiced}/{sp.total} strategies practiced. Tap any to revisit — this is your reference for real days.</p>
        <div className="mt-3 space-y-4">
          {STRATEGY_GROUPS.map((g) => (
            <div key={g.key}>
              <p className="text-[11px] font-bold uppercase tracking-wide text-uale-sec">{g.title}</p>
              <div className="mt-1.5 space-y-1.5">
                {strategiesInGroup(g.key).map((id) => {
                  const s = STRATEGIES[id]; const done = strategyPracticed(state, id);
                  return (
                    <button key={id} onClick={() => onOpenStrategy(id)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-uale-stone-200 bg-uale-paper p-2.5 text-left hover:border-uale-stone-300">
                      <span className="min-w-0"><span className="text-[13.5px] font-medium text-uale-ink">{s.name}</span><span className="ml-2 text-[12px] text-uale-sec">{s.tagline}</span></span>
                      {done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-uale-sage" /> : <ArrowRight className="h-4 w-4 shrink-0 text-uale-faint" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 rounded-2xl border border-uale-stone-200 bg-uale-card p-5">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-uale-brass-2"><Sparkles className="h-4 w-4" /> Where this is taking you</p>
        <p className="mt-1 text-[13px] text-uale-sec">By the end, you should be able to look at a chaotic day or week and independently:</p>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          {OUTCOMES.map((o, i) => <li key={i} className="flex gap-2 text-[13px] text-uale-text"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-uale-sage" /> {o}</li>)}
        </ul>
      </div>
      <div className="mt-5 flex justify-end"><button onClick={onHome} className="rounded-lg border border-uale-stone-200 bg-uale-paper px-4 py-2 text-[13px] font-semibold text-uale-ink-2 hover:border-uale-stone-300">Back to lessons</button></div>
    </div>
  );
}

// ============================================================================
// deterministic teaching visuals
// ============================================================================
function Visual({ kind }) {
  if (kind === 'impact-urgency-matrix') return <ImpactUrgencyMatrix />;
  if (kind === 'estimation-flow') return <EstimationFlow />;
  if (kind === 'decomposition-hierarchy') return <DecompositionHierarchy />;
  return null;
}
function ImpactUrgencyMatrix() {
  const cell = 'flex flex-col justify-center rounded-lg border border-uale-stone-200 p-3 text-center';
  return (
    <div>
      <p className="mb-1 text-center text-[10.5px] font-bold uppercase tracking-wide text-uale-faint">Urgency →</p>
      <div className="grid grid-cols-2 gap-2">
        <div className={cell + ' bg-uale-sage-soft'}><span className="text-[12.5px] font-semibold text-uale-ink">Do now</span><span className="text-[11px] text-uale-sec">high impact · urgent</span></div>
        <div className={cell + ' bg-uale-brass-soft'}><span className="text-[12.5px] font-semibold text-uale-ink">Schedule & protect</span><span className="text-[11px] text-uale-sec">high impact · not urgent</span></div>
        <div className={cell + ' bg-uale-stone-100'}><span className="text-[12.5px] font-semibold text-uale-ink">Do fast or delegate</span><span className="text-[11px] text-uale-sec">low impact · urgent</span></div>
        <div className={cell + ' bg-uale-stone-100'}><span className="text-[12.5px] font-semibold text-uale-ink">Drop</span><span className="text-[11px] text-uale-sec">low impact · not urgent</span></div>
      </div>
      <p className="mt-1.5 text-[11px] text-uale-faint">↑ Impact. The trap: “high impact · not urgent” work quietly slips because nothing forces it.</p>
    </div>
  );
}
function EstimationFlow() {
  const steps = ['Initial guess', 'Break into parts', 'Sum = realistic', '+ Buffer', 'Actual (later)'];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <span className={'rounded-lg border px-2.5 py-1.5 text-[12px] font-medium ' + (i === 2 ? 'border-uale-sage bg-uale-sage-soft text-uale-ink' : i === 4 ? 'border-uale-stone-200 bg-uale-stone-100 text-uale-sec' : 'border-uale-stone-200 bg-uale-paper text-uale-text')}>{s}</span>
          {i < steps.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-uale-faint" />}
        </React.Fragment>
      ))}
    </div>
  );
}
function DecompositionHierarchy() {
  const rows = [{ t: 'PROJECT', s: 'Plan vacation', tone: 'text-uale-faint' }, { t: 'MILESTONE', s: 'Book travel', tone: 'text-uale-sec' }, { t: 'TASK', s: 'Compare flights', tone: 'text-uale-ink-2' }, { t: 'NEXT ACTION', s: 'Compare three nonstop options now', tone: 'text-uale-ink' }];
  return (
    <div className="space-y-1">
      {rows.map((r, i) => (
        <div key={i} className={'rounded-lg border border-uale-stone-200 p-2 ' + (i === rows.length - 1 ? 'bg-uale-sage-soft' : 'bg-uale-paper')} style={{ marginLeft: i * 16 }}>
          <span className="text-[10.5px] font-bold uppercase tracking-wide text-uale-faint">{r.t}</span>
          <span className={'ml-2 text-[13px] ' + r.tone}>{r.s}</span>
        </div>
      ))}
      <p className="text-[11px] text-uale-faint">You can only physically DO the bottom rung — keep climbing down until you hit it.</p>
    </div>
  );
}

// ============================================================================
// shared primitives
// ============================================================================
// A single multiple-choice item with optional hint and post-answer coaching.
// Fires onAnswered(isCorrect) exactly once, when the learner first picks.
function MCQ({ q, options, correct, hint, coach, onAnswered }) {
  const [picked, setPicked] = useState(null);
  const [hintOpen, setHintOpen] = useState(false);
  const revealed = picked != null;
  const pick = (i) => { if (revealed) return; setPicked(i); if (onAnswered) onAnswered(i === correct); };
  return (
    <div className="rounded-xl border border-uale-stone-200 bg-uale-paper p-3">
      <p className="text-[13.5px] font-medium text-uale-ink">{q}</p>
      <div className="mt-2 space-y-1.5">
        {options.map((o, i) => {
          const showCorrect = revealed && i === correct;
          const showWrong = revealed && picked === i && i !== correct;
          return (
            <button key={i} disabled={revealed} onClick={() => pick(i)}
              className={'flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-[13px] ' + (showCorrect ? 'border-uale-sage bg-uale-sage-soft text-uale-ink' : showWrong ? 'border-rose-300 bg-rose-50 text-rose-900' : 'border-uale-stone-200 bg-white text-uale-text hover:border-uale-stone-300')}>
              <span className="font-semibold">{String.fromCharCode(65 + i)}</span><span className="flex-1">{o}</span>
              {showCorrect && <CheckCircle2 className="h-4 w-4 shrink-0 text-uale-sage" />}{showWrong && <XCircle className="h-4 w-4 shrink-0 text-rose-500" />}
            </button>
          );
        })}
      </div>
      {!revealed && hint && (hintOpen
        ? <p className="mt-2 text-[12.5px] text-uale-sec"><b>Hint:</b> {hint}</p>
        : <button onClick={() => setHintOpen(true)} className="mt-2 text-[12px] font-semibold text-uale-brass-2 hover:underline">Show a hint</button>)}
      {revealed && coach && <p className="mt-2 rounded-lg bg-uale-brass-soft px-3 py-2 text-[13px] text-uale-ink"><b className="text-uale-brass-2">Alyce:</b> {coach}</p>}
    </div>
  );
}

function TopBar({ onHome, crumb }) {
  return (
    <div className="mb-3 flex items-center justify-between text-[12px] text-uale-sec">
      <button onClick={onHome} className="inline-flex items-center gap-1 font-semibold hover:text-uale-ink"><ArrowLeft className="h-4 w-4" /> All lessons</button>
      <span>{crumb}</span>
    </div>
  );
}
function SectionHead({ icon: Icon, title, blurb }) {
  return (
    <div className="mb-3">
      <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-uale-sec"><Icon className="h-4 w-4" /> {title}</p>
      {blurb && <p className="mt-0.5 text-[12.5px] text-uale-faint">{blurb}</p>}
    </div>
  );
}
function BigCard({ onClick, title, desc, done, doneLabel }) {
  return (
    <button onClick={onClick} className="mb-6 flex w-full items-center justify-between gap-3 rounded-xl border border-uale-stone-200 bg-uale-card p-4 text-left hover:border-uale-stone-300">
      <div className="min-w-0">
        <div className="flex items-center gap-2"><span className="font-uale-serif text-[16px] font-semibold text-uale-ink">{title}</span>{done && <span className={statusPill('complete')}>{doneLabel || 'Done'}</span>}</div>
        <div className="mt-0.5 text-[12.5px] text-uale-sec">{desc}</div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-uale-ink-2" />
    </button>
  );
}
function P({ label, children }) { return <div><p className="text-[11px] font-bold uppercase tracking-wide text-uale-sec">{label}</p><p className="mt-0.5 text-[13.5px] text-uale-text">{children}</p></div>; }
function StepRail({ step }) {
  return (<div className="mb-3 flex gap-1">{LESSON_STEPS.map((_, i) => <span key={i} className={'h-1.5 flex-1 rounded-full ' + (i <= step ? 'bg-uale-brass' : 'bg-uale-stone-200')} />)}</div>);
}
function statusPill(st) {
  const base = 'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]';
  if (st === 'complete') return base + ' bg-uale-sage-soft text-uale-sage';
  if (st === 'in-progress') return base + ' bg-uale-brass-soft text-uale-brass-2';
  return base + ' bg-uale-stone-100 text-uale-sec';
}
