// ============================================================================
// tmApplication.mjs — APPLICATION MODE logic for Time Management ("Plan My Day").
// ----------------------------------------------------------------------------
// PURE, deterministic coaching over the learner's OWN real tasks — the same three
// competencies as Sprint 1 (prioritization, estimation, decomposition) applied to a
// real workload. This module NEVER touches learning evidence/mastery (that lives in
// tmStore) and NEVER performs I/O. It is NOT a task manager / calendar / reminders.
//
// Separation of concerns (mandatory): completing a personal task is NOT mastery
// evidence. This module produces coaching observations only; it must not write to
// the learning domains/transfer/misconceptions state.
// ============================================================================

// ---- task / deadline vocabulary (lightweight; no calendar) -----------------------
export const IMPACT = Object.freeze(['high', 'med', 'low']);
export const URGENCY = Object.freeze(['high', 'med', 'low']);
export const DEADLINE = Object.freeze(['today', 'tomorrow', 'none']); // coarse, not a date picker
export const STATUS = Object.freeze(['todo', 'done', 'deferred', 'blocked']);

const impactWeight = (i) => (i === 'high' ? 40 : i === 'med' ? 20 : i === 'low' ? 5 : 12);
const urgencyWeight = (u) => (u === 'high' ? 20 : u === 'med' ? 10 : 0);
const deadlineWeight = (d) => (d === 'today' ? 45 : d === 'tomorrow' ? 15 : 0);

// A task counts toward "today's load" only if it is still to-do.
const isActive = (t) => !t.status || t.status === 'todo';

// ---- CAPACITY: planned vs available --------------------------------------------
export function capacityAnalysis(tasks = [], availableMinutes = 0) {
  const active = (tasks || []).filter(isActive);
  const plannedMinutes = active.reduce((a, t) => a + (Number(t.estimatedMinutes) || 0), 0);
  const available = Number(availableMinutes) || 0;
  const overBy = Math.max(0, plannedMinutes - available);
  const remaining = Math.max(0, available - plannedMinutes);
  return {
    plannedMinutes,
    availableMinutes: available,
    activeCount: active.length,
    overcommitted: available > 0 && plannedMinutes > available,
    overBy,
    remaining,
    // no buffer: fully/near-fully booked (planned within 10% of available, or exactly full)
    noBuffer: available > 0 && plannedMinutes >= available * 0.9 && plannedMinutes <= available,
  };
}

// ---- DECOMPOSITION: is a real task too vague / too big to start? -----------------
const VAGUE_VERB = /^(finish|study|prepare|work on|review|sort out|handle|deal with|get ready|organize|organise|plan|do|tackle|address)\b/i;
const SCOPED = /\b(\d+|slide|section|page|chapter|one|first|single|draft|outline|email|call|reply|book|schedule|pay|submit|send)\b/i;

export function ambiguityCheck(task) {
  const title = String((task && task.title) || '').trim();
  if (!title) return { vague: true, reason: 'This task has no title yet — name a concrete action.' };
  const words = title.split(/\s+/).length;
  // Vague when it opens with a broad verb AND carries no concrete scope token.
  const vague = VAGUE_VERB.test(title) && !SCOPED.test(title);
  if (vague) return { vague: true, reason: `"${title}" is broad — pick one concrete slice (e.g., one section or one deliverable) for this session.` };
  if (words <= 1) return { vague: true, reason: `"${title}" is a topic, not an action — what is the first concrete step?` };
  return { vague: false, reason: null };
}

// ESTIMATION risk from OBSERVABLE STRUCTURE only (never a predicted duration).
export function estimationRisk(task) {
  const est = Number(task && task.estimatedMinutes) || 0;
  const steps = Array.isArray(task && task.decomposition) ? task.decomposition.length : 0;
  if (steps >= 2 && est > 0 && est < steps * 15) {
    return { risk: true, reason: `You estimated ${est} min, but this has ${steps} separate steps — that may be optimistic. Re-estimate per step, or break it down before planning.` };
  }
  if (steps === 0 && ambiguityCheck(task).vague && est > 0 && est <= 30) {
    return { risk: true, reason: `A ${est}-min estimate on a broad task is easy to blow past — decomposing it first will make the estimate more honest.` };
  }
  return { risk: false, reason: null };
}

// ---- PRIORITIZATION: impact + urgency + deadline + dependency (NOT deadline-only)-
// Higher score = do sooner. A blocking, due-today task leads even when another task
// has larger overall impact but a later deadline (matches the coaching model).
export function priorityScore(task) {
  let s = 0;
  const dueToday = task.deadline === 'today';
  if (task.blocking && dueToday) s += 100;      // unblocks someone AND due today → first
  else if (task.blocking) s += 25;              // unblocks someone else
  s += deadlineWeight(task.deadline);
  s += impactWeight(task.impact);
  s += urgencyWeight(task.urgency);
  return s;
}

export function prioritize(tasks = []) {
  const active = (tasks || []).filter(isActive).map((t) => ({ ...t, _score: priorityScore(t) }));
  active.sort((a, b) => b._score - a._score || (Number(a.estimatedMinutes) || 0) - (Number(b.estimatedMinutes) || 0));
  return active.map((t) => ({ id: t.id, title: t.title, score: t._score, reason: priorityReason(t) }));
}

function priorityReason(t) {
  const parts = [];
  if (t.blocking && t.deadline === 'today') parts.push('due today and blocks someone else — handle it first');
  else if (t.blocking) parts.push('blocks someone else’s work');
  if (t.deadline === 'today') parts.push('due today');
  else if (t.deadline === 'tomorrow') parts.push('due tomorrow');
  if (t.impact === 'high') parts.push('high impact');
  else if (t.impact === 'low') parts.push('low impact');
  if (!parts.length) parts.push('no deadline or special impact — safe to move if time is short');
  return parts.join('; ');
}

// ---- PLAN: strict priority order, fit within capacity, defer the rest ------------
// Respects priority (never schedules a low-priority task ahead of a deferred higher
// one). The first task that doesn't fit — and everything lower — is deferred. Times
// are OPTIONAL (an execution sequence, not a calendar).
export function buildPlan(tasks = [], availableMinutes = 0, { startMinute = null } = {}) {
  const ordered = prioritize(tasks);
  const byId = new Map((tasks || []).map((t) => [t.id, t]));
  const available = Number(availableMinutes) || 0;
  const plan = [];
  const deferred = [];
  let used = 0;
  let capacityReached = false;
  let cursor = startMinute;
  for (const p of ordered) {
    const task = byId.get(p.id) || {};
    const mins = Number(task.estimatedMinutes) || 0;
    if (!capacityReached && (available === 0 || used + mins <= available)) {
      const block = { taskId: p.id, title: p.title, minutes: mins, order: plan.length + 1 };
      if (cursor != null && mins > 0) { block.startMinute = cursor; block.endMinute = cursor + mins; cursor += mins; }
      plan.push(block);
      used += mins;
    } else {
      capacityReached = true;
      deferred.push({ taskId: p.id, title: p.title, minutes: mins, reason: p.reason });
    }
  }
  const remaining = available > 0 ? Math.max(0, available - used) : 0;
  // If a higher-priority task was deferred only because it didn't fit, offer partial.
  const partialSuggestion = deferred.length && remaining >= 15
    ? { taskId: deferred[0].taskId, title: deferred[0].title, minutes: remaining }
    : null;
  return { plan, deferred, usedMinutes: used, remainingMinutes: remaining, partialSuggestion };
}

// ---- NEXT BEST ACTION: one concrete step (decompose-first if the top is vague) ---
export function nextBestAction(tasks = [], availableMinutes = 0) {
  const { plan } = buildPlan(tasks, availableMinutes);
  if (!plan.length) return { action: 'Add a task or set your available time to get a plan.', taskId: null, kind: 'empty' };
  const byId = new Map((tasks || []).map((t) => [t.id, t]));
  const top = byId.get(plan[0].taskId) || {};
  const amb = ambiguityCheck(top);
  if (amb.vague) {
    return { action: `Before starting, make "${top.title}" concrete — ${amb.reason}`, taskId: top.id, kind: 'decompose' };
  }
  const first = Array.isArray(top.decomposition) && top.decomposition.length ? top.decomposition[0] : top.title;
  return { action: `Start "${first}" first.`, taskId: top.id, kind: 'start' };
}

// ---- REVIEW: estimate vs actual coaching (no mastery write) ----------------------
export function reviewInsight(task) {
  const est = Number(task && task.estimatedMinutes) || 0;
  const act = Number(task && task.actualMinutes) || 0;
  if (!est || !act) return null;
  const ratio = act / est;
  if (ratio >= 1.5) return { kind: 'underestimate', text: `"${task.title}" took ${act} min vs your ${est}-min estimate — budget closer to actuals next time.` };
  if (ratio <= 0.66) return { kind: 'overestimate', text: `"${task.title}" took ${act} min vs your ${est}-min estimate — you may be padding; tighten similar estimates.` };
  return { kind: 'accurate', text: `"${task.title}" landed close to your estimate — good calibration.` };
}

// ---- INSIGHTS: observable coaching patterns (NOT labels, NOT mastery) ------------
export function applicationInsights(state = {}) {
  const tasks = state.tasks || [];
  const cap = capacityAnalysis(tasks, state.availableMinutes);
  const out = [];
  if (cap.overcommitted) out.push({ key: 'overcommitment', text: `You have about ${Math.round(cap.availableMinutes / 6) / 10}h available and roughly ${Math.round(cap.plannedMinutes / 6) / 10}h planned — something needs to move.` });
  else if (cap.noBuffer) out.push({ key: 'no-buffer', text: 'Your plan uses nearly all your available time — leave a little buffer for the unexpected.' });
  const vague = tasks.filter(isActive).filter((t) => ambiguityCheck(t).vague);
  if (vague.length >= 2) out.push({ key: 'vague-framing', text: `${vague.length} tasks are still broad — turning each into a concrete next action will make the day easier to start.` });
  const hot = tasks.filter(isActive).filter((t) => t.urgency === 'high' || (t.impact === 'high' && t.deadline === 'today'));
  if (hot.length >= 3) out.push({ key: 'too-many-priorities', text: `${hot.length} tasks are flagged high-urgency/impact today — when everything is a priority, sequence them so a real order emerges.` });
  const deferred = tasks.filter((t) => t.status === 'deferred');
  if (deferred.length >= 2) out.push({ key: 'recurring-deferral', text: `${deferred.length} tasks are being deferred — if a task keeps moving, it may need to be smaller, delegated, or dropped.` });
  const misses = tasks.filter((t) => (Number(t.actualMinutes) || 0) >= (Number(t.estimatedMinutes) || 0) * 1.5 && t.actualMinutes);
  if (misses.length >= 2) out.push({ key: 'underestimation', text: `Several tasks ran well over estimate today — your estimates are running optimistic; anchor on how long similar work actually took.` });
  return out;
}
