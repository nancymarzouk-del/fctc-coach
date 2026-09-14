// ============================================================================
// activeSession.mjs — ONE shared abstraction for resuming an incomplete question
// session across every UALE module (FCTC / CFA / SIE / Time Management Practice,
// including diagnostics & focused sets). Pure + a swappable persistence adapter.
// ----------------------------------------------------------------------------
// Modules build an in-memory session { queue, idx, picked, revealed, ... }; scoring/
// evidence is written to the module's OWN store at answer time. This module ADDITION-
// ALLY persists the session itself (the exact ordered items — including any adaptive
// remediation spliced in — plus which items were already answered) so a learner who
// leaves after 15/30 returns to the SAME session at item 16, with no restart, no
// regeneration, and no double-counted evidence.
//
// Persisted per learner + module, so learners never see each other's sessions.
// Stores the full item objects (small MCQs) so restore is exact — never regenerated.
// ============================================================================

export const ACTIVE_SESSION_SCHEMA = 1;
const KEY = 'uale_active_session_v1';

// Namespaced per module and per learner (the UALE handoff lid). No PII in the key.
export function activeSessionKey(module, learnerKey) {
  const lk = String(learnerKey || '').replace(/[^a-z0-9]/gi, '').slice(0, 40);
  const base = `${KEY}:${module}`;
  return lk ? `${base}:${lk}` : base;
}

const clone = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

// ---- pure record ops --------------------------------------------------------------
export function createActiveSession({ module, learnerKey, sessionType, sessionId, label, queue, targetCount, nowMs = null, extra = null }) {
  return {
    schemaVersion: ACTIVE_SESSION_SCHEMA,
    module,
    learnerKey: learnerKey || null,
    sessionType: sessionType || 'practice',
    sessionId: sessionId || `${module}-${nowMs || 0}`,
    label: label || '',
    queue: clone(queue || []),          // ordered items, incl. adaptive remediation once inserted
    answers: {},                        // index -> { picked, correct } (submitted)
    idx: 0,                             // current position
    targetCount: typeof targetCount === 'number' ? targetCount : (queue ? queue.length : 0),
    startedAt: nowMs,
    lastUpdatedAt: nowMs,
    status: 'in-progress',
    extra: extra || null,              // module-specific (e.g. mock timer) — opaque here
  };
}

// Record a submitted answer at an index. IDEMPOTENT — answering the same index twice
// never overwrites/re-counts, protecting evidence from being written again on resume.
export function recordAnswerAt(rec, index, { picked, correct }, nowMs = null) {
  const next = clone(rec);
  next.answers = next.answers || {};
  if (next.answers[index] === undefined) next.answers[index] = { picked: picked ?? null, correct: !!correct };
  if (nowMs != null) next.lastUpdatedAt = nowMs;
  return next;
}

export function setQueue(rec, queue) { const n = clone(rec); n.queue = clone(queue); return n; }
export function setIndex(rec, idx, nowMs = null) { const n = clone(rec); n.idx = Math.max(0, idx | 0); if (nowMs != null) n.lastUpdatedAt = nowMs; return n; }
export function setExtra(rec, extra, nowMs = null) { const n = clone(rec); n.extra = extra; if (nowMs != null) n.lastUpdatedAt = nowMs; return n; }
export function markComplete(rec, nowMs = null) { const n = clone(rec); n.status = 'complete'; if (nowMs != null) n.lastUpdatedAt = nowMs; return n; }

export function answeredCount(rec) { return rec && rec.answers ? Object.keys(rec.answers).length : 0; }
export function totalCount(rec) { return rec && rec.queue ? rec.queue.length : 0; }
// First item with no submitted answer — where a resume continues. Answering is
// forward-only, so this is the contiguous next item (and skips a just-answered item).
export function nextUnansweredIndex(rec) {
  const t = totalCount(rec);
  for (let i = 0; i < t; i++) if (!rec.answers || rec.answers[i] === undefined) return i;
  return t; // all answered
}
export function isComplete(rec) { return !rec || rec.status === 'complete' || answeredCount(rec) >= totalCount(rec); }
// Resumable = in progress, at least one answer in, and not finished.
export function isResumable(rec) {
  return !!rec && rec.status === 'in-progress' && answeredCount(rec) >= 1 && answeredCount(rec) < totalCount(rec);
}
export function resumeSummary(rec) {
  if (!isResumable(rec)) return null;
  return { completed: answeredCount(rec), total: totalCount(rec), label: rec.label, sessionType: rec.sessionType, sessionId: rec.sessionId };
}

// ---- persistence adapter (swappable; default localStorage; device-local) ----------
export const localStorageAdapter = {
  load(key) { if (typeof localStorage === 'undefined') return null; const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; },
  save(key, rec) { if (typeof localStorage === 'undefined') return; localStorage.setItem(key, JSON.stringify(rec)); },
  remove(key) { if (typeof localStorage === 'undefined') return; localStorage.removeItem(key); },
};
let _adapter = localStorageAdapter;
export function setActiveSessionPersistence(a) { _adapter = a || localStorageAdapter; }

export function loadActiveSession(module, learnerKey) {
  try { return _adapter.load(activeSessionKey(module, learnerKey)); } catch { return null; }
}
export function saveActiveSession(rec) {
  try { if (rec && rec.module) _adapter.save(activeSessionKey(rec.module, rec.learnerKey), rec); } catch { /* ignore */ }
}
export function clearActiveSession(module, learnerKey) {
  try { _adapter.remove(activeSessionKey(module, learnerKey)); } catch { /* ignore */ }
}

// Build a persistable record from a module's live session object + identity. Keeps
// the four modules from each inventing their own serialization.
export function sessionToRecord(session, { module, learnerKey, nowMs = null }) {
  return {
    schemaVersion: ACTIVE_SESSION_SCHEMA,
    module,
    learnerKey: learnerKey || null,
    sessionType: session.sessionType || 'practice',
    sessionId: session.sessionId || `${module}-0`,
    label: session.label || '',
    queue: clone(session.queue || []),
    answers: clone(session.answers || {}),
    idx: session.idx | 0,
    targetCount: typeof session.targetCount === 'number' ? session.targetCount : (session.queue ? session.queue.length : 0),
    startedAt: session.startedAt ?? null,
    lastUpdatedAt: nowMs,
    status: 'in-progress',
    extra: session.extra || null,
  };
}
