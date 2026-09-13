'use client';

// TmApplication — APPLICATION MODE ("Plan My Day") for Time Management.
// ----------------------------------------------------------------------------
// The learner applies the three competencies to their OWN real workload: capture →
// clarify (decompose) → estimate → prioritize → capacity check → realistic plan →
// next best action → optional review. A concise execution coach, NOT a task manager /
// calendar / reminders. Personal task content is DEVICE-LOCAL ONLY (its own
// namespace) and is NEVER sent anywhere or used as mastery evidence.
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowLeft, Lightbulb, Trash2, Scissors, CheckCircle2 } from 'lucide-react';
import {
  loadApplicationState, saveApplicationState, addTask, updateTask, removeTask,
  setAvailableMinutes, setPlan, decomposeTask, recordReview,
} from '../../lib/certifications/tm/tmApplicationStore.mjs';
import {
  capacityAnalysis, prioritize, buildPlan, nextBestAction, ambiguityCheck,
  estimationRisk, applicationInsights, reviewInsight,
} from '../../lib/certifications/tm/tmApplication.mjs';

const hm = (min) => { const m = Math.max(0, Math.round(min || 0)); const h = Math.floor(m / 60); const r = m % 60; return h ? `${h}h${r ? ' ' + r + 'm' : ''}` : `${r}m`; };
const clock = (min) => { const h = Math.floor(min / 60), m = min % 60; const hh = ((h + 11) % 12) + 1; return `${hh}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };

export default function TmApplication({ learnerKey, today }) {
  const [state, setState] = useState(() => loadApplicationState(learnerKey, { date: today }));
  const [planned, setPlanned] = useState(false);
  const [decomposeFor, setDecomposeFor] = useState(null);
  const [stepsText, setStepsText] = useState('');
  const learnerRef = useRef(learnerKey);
  useEffect(() => { learnerRef.current = learnerKey; setState(loadApplicationState(learnerKey, { date: today })); }, [learnerKey, today]);

  const persist = (next) => { setState(next); saveApplicationState(next, learnerRef.current); };

  const cap = useMemo(() => capacityAnalysis(state.tasks, state.availableMinutes), [state]);
  const ordered = useMemo(() => prioritize(state.tasks), [state]);
  const planResult = useMemo(() => buildPlan(state.tasks, state.availableMinutes, { startMinute: 9 * 60 }), [state]);
  const nba = useMemo(() => nextBestAction(state.tasks, state.availableMinutes), [state]);
  const insights = useMemo(() => applicationInsights(state), [state]);

  // ---- capture ------------------------------------------------------------------
  const [draft, setDraft] = useState({ title: '', deadline: 'none', estimatedMinutes: '', impact: '', urgency: '', blocking: false });
  const addDraft = () => {
    if (!draft.title.trim()) return;
    persist(addTask(state, {
      title: draft.title.trim(),
      deadline: draft.deadline,
      estimatedMinutes: Number(draft.estimatedMinutes) || 0,
      impact: draft.impact || null,
      urgency: draft.urgency || null,
      blocking: !!draft.blocking,
    }));
    setDraft({ title: '', deadline: 'none', estimatedMinutes: '', impact: '', urgency: '', blocking: false });
  };
  const saveSteps = () => {
    const steps = stepsText.split('\n').map((s) => s.trim()).filter(Boolean);
    persist(decomposeTask(state, decomposeFor, steps));
    setDecomposeFor(null); setStepsText('');
  };

  const orderIndex = (id) => ordered.findIndex((o) => o.id === id);
  const taskById = (id) => state.tasks.find((t) => t.id === id);

  return (
    <div>
      <section className="mb-5 rounded-2xl border border-uale-stone-200 bg-uale-card p-5">
        <p className="text-[15px] font-semibold text-uale-ink">Plan My Day</p>
        <p className="mt-1 text-[13px] text-uale-sec">Apply the skills to your real workload. This stays on your device — it isn’t shared, and it doesn’t change your practice progress.</p>

        {/* available time */}
        <div className="mt-4 flex items-center gap-2">
          <label className="text-[13px] font-medium text-uale-ink">Time available today</label>
          <input type="number" min="0" step="0.25" value={state.availableMinutes ? state.availableMinutes / 60 : ''} placeholder="hrs"
            onChange={(e) => persist(setAvailableMinutes(state, (Number(e.target.value) || 0) * 60))}
            className="w-20 rounded-lg border border-uale-stone-200 bg-uale-paper px-2 py-1 text-[13px]" />
          <span className="text-[12.5px] text-uale-sec">hours</span>
        </div>
      </section>

      {/* CAPTURE */}
      <section className="mb-5 rounded-2xl border border-uale-stone-200 bg-uale-card p-5">
        <p className="mb-3 text-[13px] font-semibold text-uale-ink">What do you need to get done today?</p>
        <div className="space-y-2">
          {state.tasks.map((t) => {
            const amb = ambiguityCheck(t);
            const est = estimationRisk(t);
            return (
              <div key={t.id} className="rounded-xl border border-uale-stone-200 bg-uale-paper p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[13.5px] font-medium text-uale-ink">{t.title}</span>
                    <span className="ml-2 text-[11.5px] text-uale-faint">{t.estimatedMinutes ? hm(t.estimatedMinutes) : 'no estimate'}{t.deadline !== 'none' ? ` · due ${t.deadline}` : ''}{t.impact ? ` · ${t.impact} impact` : ''}{t.blocking ? ' · blocks someone' : ''}</span>
                  </div>
                  <button onClick={() => persist(removeTask(state, t.id))} className="text-uale-faint hover:text-rose-500" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
                </div>
                {t.decomposition && t.decomposition.length > 0 && (
                  <ul className="mt-1.5 ml-4 list-disc text-[12.5px] text-uale-sec">{t.decomposition.map((s, i) => <li key={i}>{s}</li>)}</ul>
                )}
                {(amb.vague || est.risk) && (
                  <div className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[12px] text-amber-900">
                    {amb.vague ? amb.reason : est.reason}
                    <button onClick={() => { setDecomposeFor(t.id); setStepsText((t.decomposition || []).join('\n')); }} className="ml-2 inline-flex items-center gap-1 font-semibold text-amber-900 underline"><Scissors className="h-3 w-3" /> Break it down</button>
                  </div>
                )}
                {decomposeFor === t.id && (
                  <div className="mt-2">
                    <textarea value={stepsText} onChange={(e) => setStepsText(e.target.value)} rows={3} placeholder={'One concrete step per line, e.g.\nfinish the financial slide\nrehearse once'}
                      className="w-full rounded-lg border border-uale-stone-200 bg-white px-2 py-1.5 text-[12.5px]" />
                    <div className="mt-1 flex gap-2">
                      <button onClick={saveSteps} className={chipBtnPrimary}>Save steps</button>
                      <button onClick={() => { setDecomposeFor(null); setStepsText(''); }} className={chipBtn}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* add row */}
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-center">
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addDraft()} placeholder="Add a task…" className="rounded-lg border border-uale-stone-200 bg-uale-paper px-2.5 py-1.5 text-[13px]" />
          <input type="number" min="0" value={draft.estimatedMinutes} onChange={(e) => setDraft({ ...draft, estimatedMinutes: e.target.value })} placeholder="min" className="w-16 rounded-lg border border-uale-stone-200 bg-uale-paper px-2 py-1.5 text-[13px]" />
          <select value={draft.deadline} onChange={(e) => setDraft({ ...draft, deadline: e.target.value })} className="rounded-lg border border-uale-stone-200 bg-uale-paper px-2 py-1.5 text-[13px]"><option value="none">no deadline</option><option value="today">due today</option><option value="tomorrow">due tomorrow</option></select>
          <select value={draft.impact} onChange={(e) => setDraft({ ...draft, impact: e.target.value })} className="rounded-lg border border-uale-stone-200 bg-uale-paper px-2 py-1.5 text-[13px]"><option value="">impact?</option><option value="high">high impact</option><option value="med">med impact</option><option value="low">low impact</option></select>
          <label className="flex items-center gap-1 text-[12px] text-uale-sec"><input type="checkbox" checked={draft.blocking} onChange={(e) => setDraft({ ...draft, blocking: e.target.checked })} /> blocks someone</label>
        </div>
        <button onClick={addDraft} disabled={!draft.title.trim()} className={`mt-3 rounded-lg px-4 py-2 text-[13px] font-semibold ${draft.title.trim() ? 'bg-uale-ink text-uale-cream hover:opacity-90' : 'bg-uale-stone-200 text-uale-faint'}`}>Add task</button>
      </section>

      {/* PLAN */}
      {state.tasks.length > 0 && (
        <>
          {/* capacity */}
          <section className={'mb-4 rounded-2xl border p-5 ' + (cap.overcommitted ? 'border-amber-300 bg-amber-50' : 'border-uale-stone-200 bg-uale-card')}>
            <p className="text-[13px] font-semibold text-uale-ink">Capacity</p>
            <p className="mt-1 text-[13.5px] text-uale-text">
              About <b>{hm(cap.availableMinutes)}</b> available · roughly <b>{hm(cap.plannedMinutes)}</b> planned.
              {cap.overcommitted ? <span className="font-semibold text-amber-900"> Something needs to move — you’re over by {hm(cap.overBy)}.</span>
                : cap.noBuffer ? <span className="text-uale-sec"> Nearly full — leave a little buffer.</span>
                : <span className="text-uale-sec"> That fits, with {hm(cap.remaining)} to spare.</span>}
            </p>
          </section>

          {/* next best action */}
          <section className="mb-4 rounded-2xl border border-uale-stone-200 bg-uale-card p-5">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-uale-brass-2"><Lightbulb className="h-4 w-4" /> Next best action</p>
            <p className="mt-2 text-[14px] font-medium text-uale-ink">{nba.action}</p>
          </section>

          {/* plan */}
          <section className="mb-4 rounded-2xl border border-uale-stone-200 bg-uale-card p-5">
            <p className="mb-3 text-[13px] font-semibold text-uale-ink">Today’s plan</p>
            <ol className="space-y-2">
              {planResult.plan.map((b) => {
                const t = taskById(b.taskId) || {};
                const p = ordered[orderIndex(b.taskId)] || {};
                return (
                  <li key={b.taskId} className="rounded-xl border border-uale-stone-200 bg-uale-paper p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13.5px] font-medium text-uale-ink">{b.order}. {b.title}{b.minutes ? <span className="ml-2 text-[12px] text-uale-faint">{b.startMinute != null ? `${clock(b.startMinute)}–${clock(b.endMinute)}` : hm(b.minutes)}</span> : null}</span>
                      <ReviewControls task={t} onReview={(patch) => persist(recordReview(state, b.taskId, patch))} />
                    </div>
                    {p.reason && <p className="mt-1 text-[12px] text-uale-sec">Why here: {p.reason}.</p>}
                    {t.actualMinutes ? <ReviewNote task={t} /> : null}
                  </li>
                );
              })}
            </ol>
            {planResult.deferred.length > 0 && (
              <div className="mt-3 rounded-xl border border-uale-stone-200 bg-uale-paper p-3">
                <p className="text-[12.5px] font-semibold text-uale-ink">Move to another day</p>
                <ul className="mt-1 ml-4 list-disc text-[12.5px] text-uale-sec">
                  {planResult.deferred.map((d) => <li key={d.taskId}>{d.title} <span className="text-uale-faint">— {d.reason}</span></li>)}
                </ul>
                {planResult.partialSuggestion && <p className="mt-2 text-[12px] text-uale-sec">You have ~{hm(planResult.remainingMinutes)} left — you could start <b>{planResult.partialSuggestion.title}</b> with a partial block.</p>}
              </div>
            )}
          </section>

          {/* coaching insights */}
          {insights.length > 0 && (
            <section className="mb-4 rounded-2xl border border-uale-stone-200 bg-uale-card p-5">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-uale-sec">What Alyce notices</p>
              <ul className="space-y-1.5">{insights.map((i) => <li key={i.key} className="text-[13px] text-uale-text">• {i.text}</li>)}</ul>
              <p className="mt-2 text-[11.5px] text-uale-faint">Observations from today’s plan — coaching only. They don’t change your practice mastery.</p>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ReviewControls({ task, onReview }) {
  const [open, setOpen] = useState(false);
  const [actual, setActual] = useState('');
  if (task.status === 'done') return <span className="inline-flex items-center gap-1 text-[12px] text-uale-sage"><CheckCircle2 className="h-3.5 w-3.5" /> Done</span>;
  return (
    <span className="relative">
      <button onClick={() => setOpen((o) => !o)} className={chipBtn}>Review</button>
      {open && (
        <span className="absolute right-0 z-10 mt-1 flex w-56 flex-col gap-1 rounded-xl border border-uale-stone-200 bg-white p-2 shadow-lg">
          <span className="flex items-center gap-1">
            <input type="number" min="0" value={actual} onChange={(e) => setActual(e.target.value)} placeholder="actual min" className="w-24 rounded border border-uale-stone-200 px-1.5 py-1 text-[12px]" />
            <button onClick={() => { onReview({ status: 'done', actualMinutes: Number(actual) || 0 }); setOpen(false); }} className={chipBtnPrimary}>Done</button>
          </span>
          <span className="flex flex-wrap gap-1">
            <button onClick={() => { onReview({ status: 'deferred' }); setOpen(false); }} className={chipBtn}>Deferred</button>
            <button onClick={() => { onReview({ status: 'blocked' }); setOpen(false); }} className={chipBtn}>Blocked</button>
          </span>
        </span>
      )}
    </span>
  );
}
function ReviewNote({ task }) {
  const ins = reviewInsight(task);
  if (!ins) return null;
  return <p className={'mt-1 text-[12px] ' + (ins.kind === 'underestimate' ? 'text-amber-800' : 'text-uale-sec')}>{ins.text}</p>;
}

const chipBtn = 'inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1 rounded-full border border-uale-stone-200 bg-uale-paper text-uale-ink-2 hover:border-uale-stone-300';
const chipBtnPrimary = 'inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1 rounded-full border border-uale-cta-border bg-uale-cta-fill text-uale-cta-text hover:bg-uale-cta-hover';
