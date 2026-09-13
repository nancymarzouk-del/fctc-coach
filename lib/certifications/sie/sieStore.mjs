// ============================================================================
// sieStore.mjs — FINRA SIE learner state (pure ops + a localStorage adapter).
// ----------------------------------------------------------------------------
// Mirrors cfaStore.mjs: produces exactly the skill-state shape the shared metrics
// engine expects ({ attempts, correct, streak, difficulty, history:[{c,d}], … })
// so mastery / readiness / diagnosis all work for SIE via lib/metrics.mjs unchanged.
// Also holds question-family evidence (transfer), cross-question misconception
// memory, and anti-repetition state. DEVICE-LOCAL (like FCTC/CFA); no backend —
// per-learner keyed so different UALE learners on one device never share state.
// ============================================================================
import { metricsRegistryFor } from '../../certRegistry.mjs';
import { HISTORY_CAP } from '../../metrics.mjs';
import { emptyMisconceptionMemory, recordMisconception } from '../../misconceptions.mjs';
import { CERT_ID } from './sieBlueprint.mjs';

const STORAGE_KEY = 'sie_v1';
// Per-learner storage key so different UALE learners on the same device never share
// one SIE profile. `learnerKey` is the opaque handoff id (alphanumeric); direct
// standalone visitors (no key) use the base key. Mirrors CFA's profile namespace.
export function sieStorageKey(learnerKey) {
  const k = String(learnerKey || '').replace(/[^a-z0-9]/gi, '').slice(0, 40);
  return k ? `${STORAGE_KEY}:${k}` : STORAGE_KEY;
}

function blankSub(difficulty = 1) {
  // SIE starts at difficulty 1 (recognition); it climbs with streaks toward transfer.
  return { attempts: 0, correct: 0, streak: 0, difficulty, dueIn: 0, lastSeen: 0, history: [] };
}

export function emptySieState() {
  const reg = metricsRegistryFor(CERT_ID);
  const domains = {};
  for (const [d, def] of Object.entries(reg)) {
    domains[d] = {};
    for (const s of Object.keys(def.subskills)) domains[d][s] = blankSub();
  }
  return {
    certId: CERT_ID,
    domains,
    totalAnswered: 0,
    misconceptions: emptyMisconceptionMemory(),
    transfer: {},          // topic -> family -> { correct, total } (transfer-mastery evidence)
    recentConcepts: [],    // recent concept ids (anti-repetition)
    lastActivity: null,    // { kind, topic?, label } — for Welcome-back / Continue
    learnerName: null,     // display name from the UALE handoff (greeting only)
    plan: null,            // study plan (shared studyPlan.mjs), created lazily
    lastMock: null,        // reserved for the Sprint-2+ blueprint-weighted mock
  };
}

// Record one answered item. Mirrors the FCTC/CFA adaptive rules (streak-driven
// difficulty) and appends to per-skill history for the metrics engine. Optionally
// accumulates a diagnosed misconception key + question family. Immutable.
export function recordSieAnswer(state, { domain, subskill, correct, difficulty, misconceptionKey = null, family = null, concept = null }) {
  const next = typeof structuredClone === 'function' ? structuredClone(state) : JSON.parse(JSON.stringify(state));
  next.domains[domain] = next.domains[domain] || {};
  const s = next.domains[domain][subskill] || (next.domains[domain][subskill] = blankSub(difficulty || 1));
  const askedD = difficulty || s.difficulty;
  s.attempts += 1;
  if (correct) s.correct += 1;
  s.streak = correct ? s.streak + 1 : 0;
  s.history.push({ c: !!correct, d: askedD });
  if (s.history.length > HISTORY_CAP) s.history.shift();
  if (correct && s.streak > 0 && s.streak % 3 === 0 && s.difficulty < 4) s.difficulty += 1; // L1..L4
  else if (!correct && s.difficulty > 1) s.difficulty -= 1;
  next.totalAnswered += 1;
  if (!correct && misconceptionKey) next.misconceptions = recordMisconception(next.misconceptions, misconceptionKey);
  // Transfer-mastery evidence: success across DIFFERENT question families per
  // concept-area (subskill), so "Strong" requires transfer within the area — not
  // grinding one structure. Keyed `topic:subskill`.
  if (family) {
    next.transfer = next.transfer || {};
    const areaKey = `${domain}:${subskill}`;
    next.transfer[areaKey] = next.transfer[areaKey] || {};
    const fam = next.transfer[areaKey][family] = next.transfer[areaKey][family] || { correct: 0, total: 0 };
    fam.total += 1;
    if (correct) fam.correct += 1;
  }
  // Anti-repetition memory: recent concept ids (most-recent first, capped).
  if (concept) next.recentConcepts = [concept, ...(next.recentConcepts || [])].slice(0, 12);
  return next;
}

// ---- localStorage adapter (browser only; safe no-ops in SSR/tests) --------------
export function loadSieState(learnerKey) {
  try {
    if (typeof localStorage === 'undefined') return emptySieState();
    const raw = localStorage.getItem(sieStorageKey(learnerKey));
    if (!raw) return emptySieState();
    const parsed = JSON.parse(raw);
    // Merge onto a fresh skeleton so new sections/subskills appear for existing users.
    const base = emptySieState();
    return { ...base, ...parsed, domains: mergeDomains(base.domains, parsed.domains) };
  } catch { return emptySieState(); }
}

export function saveSieState(state, learnerKey) {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(sieStorageKey(learnerKey), JSON.stringify(state)); } catch { /* ignore */ }
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
