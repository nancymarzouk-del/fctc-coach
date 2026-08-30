// ============================================================================
// cfaStore.mjs — CFA learner state (pure ops + a localStorage adapter).
// ----------------------------------------------------------------------------
// Produces exactly the skill-state shape the shared metrics engine expects
// ({ attempts, correct, streak, difficulty, history:[{c,d}], … }) so mastery /
// readiness / diagnosis all work for CFA. Also holds the study plan, PSM tracker,
// and cross-question misconception memory. Device-local (like FCTC); no backend.
// ============================================================================
import { metricsRegistryFor } from '../../certRegistry.mjs';
import { HISTORY_CAP } from '../../metrics.mjs';
import { emptyMisconceptionMemory, recordMisconception } from './misconceptions.mjs';
import { createPsmTracker } from './psm.mjs';
import { CERT_ID } from './cfaBlueprint.mjs';

const STORAGE_KEY = 'cfa_v1';

function blankSub(difficulty = 2) {
  return { attempts: 0, correct: 0, streak: 0, difficulty, dueIn: 0, lastSeen: 0, history: [] };
}

export function emptyCfaState() {
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
    plan: null,
    psm: createPsmTracker(),
    lastMock: null,
  };
}

// Record one answered item. Mirrors the FCTC adaptive rules (streak-driven
// difficulty) and appends to per-skill history for the metrics engine. Optionally
// accumulates a diagnosed misconception key across questions. Immutable.
export function recordCfaAnswer(state, { domain, subskill, correct, difficulty, misconceptionKey = null }) {
  const next = typeof structuredClone === 'function' ? structuredClone(state) : JSON.parse(JSON.stringify(state));
  next.domains[domain] = next.domains[domain] || {};
  const s = next.domains[domain][subskill] || (next.domains[domain][subskill] = blankSub(difficulty || 2));
  const askedD = difficulty || s.difficulty;
  s.attempts += 1;
  if (correct) s.correct += 1;
  s.streak = correct ? s.streak + 1 : 0;
  s.history.push({ c: !!correct, d: askedD });
  if (s.history.length > HISTORY_CAP) s.history.shift();
  if (correct && s.streak > 0 && s.streak % 3 === 0 && s.difficulty < 5) s.difficulty += 1;
  else if (!correct && s.difficulty > 1) s.difficulty -= 1;
  next.totalAnswered += 1;
  if (!correct && misconceptionKey) next.misconceptions = recordMisconception(next.misconceptions, misconceptionKey);
  return next;
}

// ---- localStorage adapter (browser only; safe no-ops in SSR/tests) --------------
export function loadCfaState() {
  try {
    if (typeof localStorage === 'undefined') return emptyCfaState();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyCfaState();
    const parsed = JSON.parse(raw);
    // Merge onto a fresh skeleton so new topics/subskills appear for existing users.
    const base = emptyCfaState();
    return { ...base, ...parsed, domains: mergeDomains(base.domains, parsed.domains) };
  } catch { return emptyCfaState(); }
}

export function saveCfaState(state) {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
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
