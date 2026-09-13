// ============================================================================
// tmLearnStore.mjs — LEARN MODE instructional progress (Sprint 3).
// ----------------------------------------------------------------------------
// Tracks INSTRUCTIONAL progress ONLY (which lessons a learner has read / passed the
// quick check for, and which reteaching approaches have been used) — completely
// separate from formal mastery. It lives in its OWN namespace (tm_learn_v1[:learner]),
// never touches the learning-evidence store (tm_v1 in tmStore), and NEVER makes a
// learner "Strong". Reading a lesson / passing a quick check is not mastery.
//
// Same sync-ready shape as the other TM stores: serializable state + a swappable
// persistence adapter. Device-local for now.
// ============================================================================
import { LESSON_ORDER, nextReteachApproach } from './lessons.mjs';

const STORAGE_KEY = 'tm_learn_v1';
export function tmLearnStorageKey(learnerKey) {
  const k = String(learnerKey || '').replace(/[^a-z0-9]/gi, '').slice(0, 40);
  return k ? `${STORAGE_KEY}:${k}` : STORAGE_KEY;
}

export const LESSON_STATUS = Object.freeze({ NOT_STARTED: 'not-started', IN_PROGRESS: 'in-progress', COMPLETE: 'complete' });

function blankCompetency() {
  return { status: LESSON_STATUS.NOT_STARTED, stepIndex: 0, quickCheckPassed: false, reteachApproachesUsed: [], attempts: 0 };
}
export function emptyLearnState() {
  const competencies = {};
  for (const t of LESSON_ORDER) competencies[t] = blankCompetency();
  // schemaVersion 2 adds the strategy TOOLKIT + strategy-selector progress.
  // Still instructional-only: none of this ever becomes mastery.
  return {
    schemaVersion: 2,
    competencies,
    strategies: { viewed: [], practiced: [] },
    selector: { attempts: 0, bestCorrect: 0, total: 0, completed: false },
  };
}

const clone = (s) => (typeof structuredClone === 'function' ? structuredClone(s) : JSON.parse(JSON.stringify(s)));
function ensure(state, topic) {
  const next = clone(state);
  next.competencies = next.competencies || {};
  if (!next.competencies[topic]) next.competencies[topic] = blankCompetency();
  return next;
}

// Move to a step in a lesson (marks it in-progress). PURE.
export function setStepIndex(state, topic, stepIndex) {
  const next = ensure(state, topic);
  const c = next.competencies[topic];
  c.stepIndex = Math.max(0, stepIndex | 0);
  if (c.status === LESSON_STATUS.NOT_STARTED) c.status = LESSON_STATUS.IN_PROGRESS;
  return next;
}

// Record a quick-check attempt. Passing marks the lesson COMPLETE (instructional
// completion only — NOT mastery). Failing records the attempt (stays in-progress).
export function recordQuickCheck(state, topic, passed) {
  const next = ensure(state, topic);
  const c = next.competencies[topic];
  c.attempts += 1;
  if (passed) c.status = LESSON_STATUS.COMPLETE;
  else if (c.status === LESSON_STATUS.NOT_STARTED) c.status = LESSON_STATUS.IN_PROGRESS;
  return next;
}

// Record which reteaching approach was shown, so the next one VARIES. PURE.
export function recordReteach(state, topic, approach) {
  const next = ensure(state, topic);
  const c = next.competencies[topic];
  if (approach && !c.reteachApproachesUsed.includes(approach)) c.reteachApproachesUsed.push(approach);
  if (c.status === LESSON_STATUS.NOT_STARTED) c.status = LESSON_STATUS.IN_PROGRESS;
  return next;
}
// The reteaching approach to show NEXT for this competency (varies from used ones).
export function pickReteach(state, topic, available) {
  const used = (state.competencies?.[topic]?.reteachApproachesUsed) || [];
  return nextReteachApproach(used, available);
}

export function lessonStatus(state, topic) {
  return (state.competencies?.[topic]?.status) || LESSON_STATUS.NOT_STARTED;
}
export function completedCount(state) {
  return LESSON_ORDER.filter((t) => lessonStatus(state, t) === LESSON_STATUS.COMPLETE).length;
}
// A brand-new learner has touched no lesson at all — used to gate the first-use
// orientation (so they never land straight in a question stream).
export function isFreshLearner(state) {
  const noLessons = LESSON_ORDER.every((t) => lessonStatus(state, t) === LESSON_STATUS.NOT_STARTED);
  const noToolkit = ((state.strategies?.viewed) || []).length === 0;
  return noLessons && noToolkit;
}

// ---- strategy TOOLKIT progress (instructional only — never mastery) ----------
function ensureStrategies(state) {
  const next = clone(state);
  next.strategies = next.strategies || { viewed: [], practiced: [] };
  next.strategies.viewed = next.strategies.viewed || [];
  next.strategies.practiced = next.strategies.practiced || [];
  return next;
}
// Opened a strategy card (read it). PURE.
export function markStrategyViewed(state, id) {
  const next = ensureStrategies(state);
  if (id && !next.strategies.viewed.includes(id)) next.strategies.viewed.push(id);
  return next;
}
// Completed a strategy's guided practice. PURE. (Implies viewed.)
export function markStrategyPracticed(state, id) {
  const next = markStrategyViewed(state, id);
  if (id && !next.strategies.practiced.includes(id)) next.strategies.practiced.push(id);
  return next;
}
export function strategyViewed(state, id) { return ((state.strategies?.viewed) || []).includes(id); }
export function strategyPracticed(state, id) { return ((state.strategies?.practiced) || []).includes(id); }
export function strategyProgress(state, total) {
  const viewed = ((state.strategies?.viewed) || []).length;
  const practiced = ((state.strategies?.practiced) || []).length;
  return { viewed, practiced, total: total || 0 };
}

// ---- strategy SELECTOR progress (choosing the right method) ------------------
// Records an attempt at the "choose a strategy" trainer. Passing marks it
// completed. This is a teaching signal, NOT mastery of any competency.
export function recordSelector(state, correct, total, passed) {
  const next = clone(state);
  const s = next.selector || { attempts: 0, bestCorrect: 0, total: 0, completed: false };
  s.attempts = (s.attempts | 0) + 1;
  s.bestCorrect = Math.max(s.bestCorrect | 0, correct | 0);
  s.total = total | 0;
  if (passed) s.completed = true;
  next.selector = s;
  return next;
}
export function selectorCompleted(state) { return !!(state.selector && state.selector.completed); }

// ---- persistence adapter (swappable; default = localStorage; device-local) --------
export const localStorageAdapter = {
  load(key) { if (typeof localStorage === 'undefined') return null; const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; },
  save(key, state) { if (typeof localStorage === 'undefined') return; localStorage.setItem(key, JSON.stringify(state)); },
};
let _adapter = localStorageAdapter;
export function setTmLearnPersistence(adapter) { _adapter = adapter || localStorageAdapter; }

export function loadLearnState(learnerKey) {
  try {
    const parsed = _adapter.load(tmLearnStorageKey(learnerKey));
    if (!parsed) return emptyLearnState();
    const base = emptyLearnState();
    // Merge forward so a v1 state (no strategies/selector) picks up the new fields.
    return {
      ...base,
      ...parsed,
      schemaVersion: 2,
      competencies: { ...base.competencies, ...(parsed.competencies || {}) },
      strategies: { ...base.strategies, ...(parsed.strategies || {}) },
      selector: { ...base.selector, ...(parsed.selector || {}) },
    };
  } catch { return emptyLearnState(); }
}
export function saveLearnState(state, learnerKey) {
  try { _adapter.save(tmLearnStorageKey(learnerKey), state); } catch { /* ignore */ }
}
