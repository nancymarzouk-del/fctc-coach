// ============================================================================
// tmStore.mjs — Time-Management learner state: PURE scoring ops + a swappable
// persistence adapter. DEVICE-LOCAL for Sprint 1, but designed to sync later.
// ----------------------------------------------------------------------------
// SYNC-READINESS (Sprint-1 requirement):
//   • State is a plain, serializable JSON object (no class instances, no closures).
//   • All SCORING is pure functions of (state, event) → state — they never touch
//     persistence, so account-scoped server sync can be added by swapping the
//     adapter WITHOUT changing any scoring logic.
//   • Components read/write ONLY through this store (loadTmState/saveTmState/
//     recordTmAnswer) — never localStorage directly. `setTmPersistence(adapter)`
//     injects a future server/sync adapter.
//   • Personal application-mode task content is NOT stored here and must remain
//     device-local by design (Sprint 1 does not implement application mode at all).
//
// Produces exactly the skill-state shape the shared metrics engine expects
// ({ attempts, correct, streak, difficulty, history:[{c,d,…}], … }) so mastery /
// readiness / diagnosis all work via lib/metrics.mjs unchanged.
// ============================================================================
import { metricsRegistryFor } from '../../certRegistry.mjs';
import { HISTORY_CAP } from '../../metrics.mjs';
import { emptyMisconceptionMemory, recordMisconception } from '../../misconceptions.mjs';
import { CERT_ID } from './tmBlueprint.mjs';

const STORAGE_KEY = 'tm_v1';
export function tmStorageKey(learnerKey) {
  const k = String(learnerKey || '').replace(/[^a-z0-9]/gi, '').slice(0, 40);
  return k ? `${STORAGE_KEY}:${k}` : STORAGE_KEY;
}

function blankSub(difficulty = 1) {
  return { attempts: 0, correct: 0, streak: 0, difficulty, dueIn: 0, lastSeen: 0, history: [] };
}

export function emptyTmState() {
  const reg = metricsRegistryFor(CERT_ID);
  const domains = {};
  for (const [d, def] of Object.entries(reg)) {
    domains[d] = {};
    for (const s of Object.keys(def.subskills)) domains[d][s] = blankSub();
  }
  return {
    certId: CERT_ID,
    schemaVersion: 1,        // bump on shape changes; sync layer can migrate on this
    domains,
    totalAnswered: 0,
    misconceptions: emptyMisconceptionMemory(),
    transfer: {},            // "topic:subskill" -> { families:{fam:{correct,total}}, contexts:{ctx:{correct,total}} }
    support: {},             // "topic:subskill" -> { assisted, unassisted } (dependence signal)
    recentConcepts: [],      // anti-repetition
    contextPref: null,       // learner's primary context (personalization only; never gates mastery)
    lastActivity: null,
    learnerName: null,
    plan: null,
  };
}

// Record one answered item. PURE + immutable. `support` ∈ 'none'|'reteach'|'hint'
// captures whether the correct answer followed help (for the decreasing-dependence
// mastery gate). `context` accumulates the SECOND transfer axis alongside `family`.
export function recordTmAnswer(state, { domain, subskill, correct, difficulty, misconceptionKey = null, family = null, context = null, support = 'none', concept = null }) {
  const next = typeof structuredClone === 'function' ? structuredClone(state) : JSON.parse(JSON.stringify(state));
  next.domains[domain] = next.domains[domain] || {};
  const s = next.domains[domain][subskill] || (next.domains[domain][subskill] = blankSub(difficulty || 1));
  const askedD = difficulty || s.difficulty;
  s.attempts += 1;
  if (correct) s.correct += 1;
  s.streak = correct ? s.streak + 1 : 0;
  // History entry carries the metrics fields (c,d) PLUS this domain's extra evidence
  // (support, context, family). The shared engine reads only c/d and ignores the rest.
  s.history.push({ c: !!correct, d: askedD, s: support, ctx: context || null, fam: family || null });
  if (s.history.length > HISTORY_CAP) s.history.shift();
  if (correct && s.streak > 0 && s.streak % 3 === 0 && s.difficulty < 4) s.difficulty += 1; // L1..L4
  else if (!correct && s.difficulty > 1) s.difficulty -= 1;
  next.totalAnswered += 1;
  if (!correct && misconceptionKey) next.misconceptions = recordMisconception(next.misconceptions, misconceptionKey);

  const areaKey = `${domain}:${subskill}`;
  // Transfer evidence across families AND contexts (both required for mastery).
  next.transfer = next.transfer || {};
  const t = next.transfer[areaKey] = next.transfer[areaKey] || { families: {}, contexts: {} };
  if (family) { const f = t.families[family] = t.families[family] || { correct: 0, total: 0 }; f.total += 1; if (correct) f.correct += 1; }
  if (context) { const c = t.contexts[context] = t.contexts[context] || { correct: 0, total: 0 }; c.total += 1; if (correct) c.correct += 1; }

  // Support dependence: count assisted vs unassisted answers per area.
  next.support = next.support || {};
  const sup = next.support[areaKey] = next.support[areaKey] || { assisted: 0, unassisted: 0 };
  if (support && support !== 'none') sup.assisted += 1; else sup.unassisted += 1;

  if (concept) next.recentConcepts = [concept, ...(next.recentConcepts || [])].slice(0, 12);
  return next;
}

// ---- persistence adapter (swappable; default = localStorage) ---------------------
// A future account-scoped SERVER adapter implements the same { load, save } shape;
// injecting it via setTmPersistence changes NOTHING about scoring above.
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
export function setTmPersistence(adapter) { _adapter = adapter || localStorageAdapter; }

export function loadTmState(learnerKey) {
  try {
    const parsed = _adapter.load(tmStorageKey(learnerKey));
    if (!parsed) return emptyTmState();
    const base = emptyTmState();
    return { ...base, ...parsed, domains: mergeDomains(base.domains, parsed.domains) };
  } catch { return emptyTmState(); }
}

export function saveTmState(state, learnerKey) {
  try { _adapter.save(tmStorageKey(learnerKey), state); } catch { /* ignore */ }
}

function mergeDomains(base, saved) {
  if (!saved) return base;
  const out = {};
  for (const d of Object.keys(base)) {
    out[d] = {};
    for (const s of Object.keys(base[d])) out[d][s] = (saved[d] && saved[d][s]) ? saved[d][s] : base[d][s];
  }
  return out;
}
