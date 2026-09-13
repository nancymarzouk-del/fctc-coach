// ============================================================================
// tmApplicationStore.mjs — APPLICATION MODE state ("Plan My Day").
// ----------------------------------------------------------------------------
// PRIVACY (mandatory): real personal task content is DEVICE-LOCAL ONLY. It lives in
// its OWN namespace (tm_application_v1[:learner]), completely separate from learning
// evidence (tm_v1 in tmStore). It is NEVER sent to any server/API/event and NEVER
// used as mastery evidence. This app has no backend; the only sink is localStorage.
//
// Same sync-ready shape as tmStore: serializable state + a swappable persistence
// adapter (setTmApplicationPersistence). A FUTURE user-controlled sync could be added
// by swapping the adapter — but personal tasks are NOT synced now.
// ============================================================================

const STORAGE_KEY = 'tm_application_v1';
export function tmApplicationStorageKey(learnerKey) {
  const k = String(learnerKey || '').replace(/[^a-z0-9]/gi, '').slice(0, 40);
  return k ? `${STORAGE_KEY}:${k}` : STORAGE_KEY;
}

let _seq = 0;
function newId() { _seq += 1; return `t${_seq}_${(STORAGE_KEY.length + _seq).toString(36)}`; }

export function emptyApplicationState({ date = null } = {}) {
  return {
    schemaVersion: 1,
    date: date || null,          // caller stamps the day (module never calls Date.now itself)
    availableMinutes: 0,
    tasks: [],                   // { id,title,deadline,estimatedMinutes,impact,urgency,blocking,status,decomposition,actualMinutes,notes }
    plan: [],                    // last built plan (ordered blocks)
    review: {},                  // taskId -> { status, actualMinutes }
  };
}

function blankTask(over = {}) {
  return {
    id: over.id || newId(),
    title: '',
    deadline: 'none',
    estimatedMinutes: 0,
    impact: null,
    urgency: null,
    blocking: false,
    status: 'todo',
    decomposition: [],
    actualMinutes: null,
    notes: '',
    ...over,
  };
}

const clone = (s) => (typeof structuredClone === 'function' ? structuredClone(s) : JSON.parse(JSON.stringify(s)));

// ---- pure, immutable ops --------------------------------------------------------
export function addTask(state, fields = {}) {
  const next = clone(state);
  next.tasks.push(blankTask(fields));
  return next;
}
export function updateTask(state, id, patch = {}) {
  const next = clone(state);
  const t = next.tasks.find((x) => x.id === id);
  if (t) Object.assign(t, patch);
  return next;
}
export function removeTask(state, id) {
  const next = clone(state);
  next.tasks = next.tasks.filter((x) => x.id !== id);
  return next;
}
export function setAvailableMinutes(state, minutes) {
  const next = clone(state);
  next.availableMinutes = Number(minutes) || 0;
  return next;
}
export function setPlan(state, plan) {
  const next = clone(state);
  next.plan = Array.isArray(plan) ? plan : [];
  return next;
}
export function decomposeTask(state, id, steps = []) {
  const next = clone(state);
  const t = next.tasks.find((x) => x.id === id);
  if (t) t.decomposition = (steps || []).map((s) => String(s || '').trim()).filter(Boolean);
  return next;
}
// Review: capture actual outcome for coaching ONLY (never mastery evidence).
export function recordReview(state, id, { status, actualMinutes } = {}) {
  const next = clone(state);
  const t = next.tasks.find((x) => x.id === id);
  if (t) {
    if (status) t.status = status;
    if (actualMinutes != null) t.actualMinutes = Number(actualMinutes) || 0;
  }
  next.review = { ...next.review, [id]: { status: status || (t && t.status), actualMinutes: actualMinutes != null ? Number(actualMinutes) || 0 : (t && t.actualMinutes) } };
  return next;
}

// ---- persistence adapter (swappable; default = localStorage; device-local only) --
export const localStorageAdapter = {
  load(key) {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  },
  save(key, state) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(state));
  },
};
let _adapter = localStorageAdapter;
export function setTmApplicationPersistence(adapter) { _adapter = adapter || localStorageAdapter; }

export function loadApplicationState(learnerKey, { date = null } = {}) {
  try {
    const parsed = _adapter.load(tmApplicationStorageKey(learnerKey));
    if (!parsed) return emptyApplicationState({ date });
    const base = emptyApplicationState({ date });
    return { ...base, ...parsed, tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [] };
  } catch { return emptyApplicationState({ date }); }
}
export function saveApplicationState(state, learnerKey) {
  try { _adapter.save(tmApplicationStorageKey(learnerKey), state); } catch { /* ignore */ }
}
