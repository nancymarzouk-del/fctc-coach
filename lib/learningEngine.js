// ============================================================================
// learningEngine.js
// ----------------------------------------------------------------------------
// Everything about *learning* lives here, separate from question generation and
// from the UI. Like the question engine, storage sits behind an interface
// (StorageProvider) so today's localStorage can become a real database later
// without touching this logic or the UI.
//
// Responsibilities:
//   - Track attempts per domain/subskill
//   - Compute mastery, confidence, and an overall readiness score
//   - Schedule spaced repetition for weak subskills
//   - Choose the next difficulty adaptively
//   - Recommend what to study next
// ============================================================================

import { SUBSKILLS } from './questionEngine';
import {
  HISTORY_CAP,
  EVIDENCE,
  masteryEstimate,
  confidenceEstimate,
  analyzeSkills as analyzeSkillsCore,
  readiness as readinessCore,
  nextBestAction as nextBestActionCore,
  recommendationList as recommendationListCore,
  mechanicalRemediationPlan,
} from './metrics.mjs';

// Foundational subskills — a light prerequisite hint so that, all else equal,
// the recommender breaks ties toward fundamentals. Deterministic and small on
// purpose; this is NOT a dependency graph, just a priority nudge.
const FOUNDATIONAL = new Set([
  'mechanical:levers', 'mechanical:inclinedPlane',
  'math:fractions', 'math:percentages',
  'reading:sop',
]);

// Build the metrics registry (labels + prereq flags) from the SUBSKILLS map, so
// the pure core stays domain-agnostic and this file owns the FCTC specifics.
function metricsRegistry() {
  const reg = {};
  for (const [dKey, dDef] of Object.entries(SUBSKILLS)) {
    reg[dKey] = { label: dDef.label, subskills: {} };
    for (const [skKey, skDef] of Object.entries(dDef.subskills)) {
      reg[dKey].subskills[skKey] = { label: skDef.label, prereq: FOUNDATIONAL.has(`${dKey}:${skKey}`) };
    }
  }
  return reg;
}

// ---- Storage interface ------------------------------------------------------
export class StorageProvider {
  load(userId) { throw new Error('Not implemented'); }
  save(userId, state) { throw new Error('Not implemented'); }
  listUsers() { throw new Error('Not implemented'); }
}

export class LocalStorageProvider extends StorageProvider {
  constructor(key = 'fctc_v2') { super(); this.key = key; }
  _all() {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(window.localStorage.getItem(this.key) || '{}'); }
    catch { return {}; }
  }
  load(userId) { return this._all()[userId] || null; }
  save(userId, state) {
    const all = this._all();
    all[userId] = state;
    if (typeof window !== 'undefined') window.localStorage.setItem(this.key, JSON.stringify(all));
  }
  listUsers() { return Object.keys(this._all()); }
}

// Swap this to a database-backed provider later; nothing else changes.
export const storage = new LocalStorageProvider();

// ---- Spaced repetition intervals (in "sessions", not days, to keep it simple
// for a practice app used in bursts). Index = how many times answered correctly
// in a row. Higher streak = longer until it resurfaces. ------------------------
const SR_INTERVALS = [0, 1, 2, 4, 8, 16];

function blankSubskill() {
  return {
    attempts: 0,
    correct: 0,
    streak: 0,        // current correct streak (drives spaced repetition)
    difficulty: 2,    // current adaptive difficulty 1..5
    dueIn: 0,         // sessions until this resurfaces (0 = due now)
    lastSeen: 0,      // session index when last practiced
    history: [],      // recent booleans, capped, for confidence calc
  };
}

export function blankState(userId) {
  const domains = {};
  const domainStats = {};
  for (const [dKey, dDef] of Object.entries(SUBSKILLS)) {
    domains[dKey] = {};
    for (const skKey of Object.keys(dDef.subskills)) {
      domains[dKey][skKey] = blankSubskill();
    }
    // Per-category rollup, updated after every session.
    domainStats[dKey] = {
      attempted: 0,        // total questions ever attempted in this category
      correct: 0,          // total correct in this category
      sessions: 0,         // sessions that included this category
      lastScore: null,     // % score of the most recent session touching it
      lastSessionAt: null, // timestamp of that session
    };
  }
  return {
    userId,
    createdAt: Date.now(),
    sessionIndex: 0,        // increments each completed session
    totalAnswered: 0,
    totalCorrect: 0,
    domains,
    domainStats,
  };
}

// ---- Recording an answer ----------------------------------------------------
// `askedDifficulty` is the difficulty the QUESTION was posed at (from q.difficulty);
// it is captured in history BEFORE the adaptive adjustment below, so evidence like
// "missed 2 at difficulty 2" reflects the level the learner actually faced. Falls
// back to the skill's current difficulty for older callers.
export function recordAnswer(state, domain, subskill, wasCorrect, askedDifficulty) {
  const s = state.domains[domain][subskill];
  const posedAt = Number.isFinite(askedDifficulty) ? askedDifficulty : s.difficulty;
  s.attempts += 1;
  state.totalAnswered += 1;
  if (wasCorrect) {
    s.correct += 1;
    s.streak += 1;
    state.totalCorrect += 1;
  } else {
    s.streak = 0;
  }
  // Enriched history entry { c, d }. Readers tolerate legacy bare booleans too.
  s.history.push({ c: !!wasCorrect, d: posedAt });
  if (s.history.length > HISTORY_CAP) s.history.shift();

  // Adaptive difficulty: 3 in a row bumps up, a miss eases down.
  if (wasCorrect && s.streak > 0 && s.streak % 3 === 0 && s.difficulty < 5) {
    s.difficulty += 1;
  } else if (!wasCorrect && s.difficulty > 1) {
    s.difficulty -= 1;
  }

  // Spaced repetition: schedule next appearance from streak.
  const interval = SR_INTERVALS[Math.min(s.streak, SR_INTERVALS.length - 1)];
  s.dueIn = interval;
  s.lastSeen = state.sessionIndex;
  return state;
}

// Called once when a session completes: advance the clock and decrement dueIn.
export function endSession(state) {
  state.sessionIndex += 1;
  for (const d of Object.values(state.domains)) {
    for (const sk of Object.values(d)) {
      if (sk.dueIn > 0) sk.dueIn -= 1;
    }
  }
  return state;
}

// Roll a finished session's answers into per-category stats. `log` is the array
// of { domain, correct } the UI collected during the session. This is what
// makes the Category Performance cards reflect real outcomes (attempted,
// correct, latest session score) and persists once the caller saves state.
export function commitSessionStats(state, log) {
  if (!state.domainStats) state.domainStats = {};
  const now = Date.now();
  // Group this session's answers by category.
  const byDomain = {};
  for (const entry of log) {
    const d = entry.domain;
    byDomain[d] = byDomain[d] || { n: 0, c: 0 };
    byDomain[d].n += 1;
    if (entry.correct) byDomain[d].c += 1;
  }
  for (const [d, agg] of Object.entries(byDomain)) {
    const stat = state.domainStats[d] || { attempted: 0, correct: 0, sessions: 0, lastScore: null, lastSessionAt: null };
    stat.attempted += agg.n;
    stat.correct += agg.c;
    stat.sessions += 1;
    stat.lastScore = Math.round((agg.c / agg.n) * 100);
    stat.lastSessionAt = now;
    state.domainStats[d] = stat;
  }
  return state;
}

// Safe accessor for category stats (handles older saved states without the field).
export function categoryStats(state, domain) {
  const s = state.domainStats?.[domain];
  if (!s || s.attempted === 0) {
    return { attempted: 0, correct: 0, sessions: 0, lastScore: null, lastSessionAt: null, pct: null, started: false };
  }
  return { ...s, pct: Math.round((s.correct / s.attempted) * 100), started: true };
}

// ---- Scoring ----------------------------------------------------------------
// All scoring now routes through the evidence-aware core (lib/metrics.mjs), which
// distinguishes "not enough evidence yet" from "a demonstrated weak area", weights
// recent answers over stale ones, and shrinks thin estimates toward neutral so a
// single miss never reads as a proven weakness. See lib/metrics.mjs for the model
// and tests/metrics.test.mjs for the guarantees this preserves.

// Mastery (0..1). Returns 0 for an untested skill so the dashboard bar renders
// empty; weakness decisions never use this number (they go through the evidence
// gate in analyzeSkills / weakAreas).
export function subskillMastery(s) {
  if (!s || s.attempts === 0) return 0;
  return masteryEstimate(s);
}

// Confidence (0..1): trust in the estimate — needs both enough data AND stable
// results. Few attempts => low confidence even at 100% accuracy (no lucky-streak
// "mastered"); erratic results => low confidence.
export function subskillConfidence(s) {
  return confidenceEstimate(s);
}

export function domainMastery(state, domain) {
  const subs = state.domains[domain];
  const vals = Object.values(subs).map(subskillMastery);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

// Rich, evidence-gated readiness: { score|null, sufficientEvidence, evaluatedCount,
// totalCount, band, weakestLabel }. `score` is null (band 'building') until enough
// of the exam is actually evaluated — the UI must show "building your baseline"
// instead of a fabricated percentage.
export function readinessInfo(state) {
  return readinessCore(state.domains, metricsRegistry());
}

// Backward-compatible numeric readiness (null when withheld). Prefer readinessInfo.
export function readinessScore(state) {
  return readinessInfo(state).score;
}

export function overallConfidence(state) {
  let total = 0, n = 0;
  for (const d of Object.values(state.domains)) {
    for (const sk of Object.values(d)) { total += confidenceEstimate(sk); n += 1; }
  }
  return n ? Math.round((total / n) * 100) : 0;
}

// Full per-subskill analysis (classification + need ranking) from the core.
export function analyzeSkills(state) {
  return analyzeSkillsCore(state.domains, metricsRegistry());
}

// The single most valuable next action, with a concrete "why". See metrics core.
export function nextBestAction(state) {
  return nextBestActionCore(state.domains, metricsRegistry(), { totalAnswered: state.totalAnswered });
}

// A guided remediation sequence for a repeatedly-missed mechanical subskill:
// a simplified worked example, then progressively harder transfer questions at
// fresh configurations (see mechanicalRemediationPlan). Returns a session plan.
export function buildRemediationSession(state, domain, subskill) {
  return mechanicalRemediationPlan(domain, subskill);
}

// ---- Weak-area analysis & recommendations -----------------------------------
// Returns subskills sorted by need. The list is evidence-gated: `demonstratedWeak`
// is true ONLY for skills with enough attempts AND low recent accuracy; untested
// and thin-evidence skills are surfaced with honest flags, never as proven weak.
// The returned shape is a SUPERSET of the legacy fields the UI reads
// (subskillLabel, domainLabel, mastery, confidence, due, untouched, difficulty,
// attempts) plus evidenceState / demonstratedWeak / provisionalWeak / need.
export function weakAreas(state, limit = 5) {
  const analysis = analyzeSkills(state);
  return analysis.slice(0, limit).map((c) => ({
    domain: c.domain, domainLabel: c.domainLabel,
    subskill: c.subskill, subskillLabel: c.subskillLabel,
    mastery: c.mastery, confidence: c.confidence,
    due: c.due, untouched: c.untested,
    difficulty: c.difficulty, attempts: c.attempts,
    evidenceState: c.evidenceState, demonstratedWeak: c.demonstratedWeak,
    provisionalWeak: c.provisionalWeak, need: c.need,
  }));
}

// Build a targeted session: pulls the neediest subskills, at each one's current
// adaptive difficulty, mixing in any that are due for spaced-repetition review.
export function buildTargetedSession(state, size = 10) {
  const ranked = weakAreas(state, 99);
  const plan = [];
  let i = 0;
  while (plan.length < size && ranked.length) {
    const item = ranked[i % ranked.length];
    plan.push({
      domain: item.domain,
      subskill: item.subskill,
      difficulty: state.domains[item.domain][item.subskill].difficulty,
    });
    i += 1;
    // After cycling once through all ranked items, bias back toward the top.
    if (i % ranked.length === 0) ranked.splice(Math.floor(ranked.length / 2));
  }
  return plan;
}

// Secondary recommendation list — each item distinguishes, in plain language, a
// DEMONSTRATED weakness ("missed 4 of your last 6…") from NOT-ENOUGH-EVIDENCE
// ("keep practicing… not enough evidence yet"). The primary call-to-action on the
// dashboard should use nextBestAction(state); this fills the supporting list.
export function recommendations(state) {
  return recommendationListCore(state.domains, metricsRegistry(), { totalAnswered: state.totalAnswered });
}
