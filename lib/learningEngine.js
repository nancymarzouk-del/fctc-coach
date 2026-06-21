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
  for (const [dKey, dDef] of Object.entries(SUBSKILLS)) {
    domains[dKey] = {};
    for (const skKey of Object.keys(dDef.subskills)) {
      domains[dKey][skKey] = blankSubskill();
    }
  }
  return {
    userId,
    createdAt: Date.now(),
    sessionIndex: 0,        // increments each completed session
    totalAnswered: 0,
    totalCorrect: 0,
    domains,
  };
}

// ---- Recording an answer ----------------------------------------------------
export function recordAnswer(state, domain, subskill, wasCorrect) {
  const s = state.domains[domain][subskill];
  s.attempts += 1;
  state.totalAnswered += 1;
  if (wasCorrect) {
    s.correct += 1;
    s.streak += 1;
    state.totalCorrect += 1;
  } else {
    s.streak = 0;
  }
  s.history.push(wasCorrect);
  if (s.history.length > 10) s.history.shift();

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

// ---- Scoring ----------------------------------------------------------------
// Mastery (0..1) for a subskill: accuracy weighted by how much practice exists
// (so 1/1 doesn't read as "mastered"). Uses a simple shrinkage toward 0.5.
export function subskillMastery(s) {
  if (s.attempts === 0) return 0;
  const acc = s.correct / s.attempts;
  const confidenceWeight = s.attempts / (s.attempts + 4); // grows with practice
  return acc * confidenceWeight + 0.5 * (1 - confidenceWeight) * (acc >= 0.5 ? 1 : 0);
}

// Confidence (0..1): how stable recent performance is. Lots of recent attempts
// with consistent results = high confidence; little data = low confidence.
export function subskillConfidence(s) {
  if (s.history.length < 2) return s.attempts === 0 ? 0 : 0.2;
  const recent = s.history;
  const mean = recent.reduce((a, b) => a + (b ? 1 : 0), 0) / recent.length;
  const variance = recent.reduce((a, b) => a + Math.pow((b ? 1 : 0) - mean, 2), 0) / recent.length;
  const dataWeight = Math.min(recent.length / 8, 1);
  return Math.max(0, (1 - variance * 2)) * dataWeight;
}

export function domainMastery(state, domain) {
  const subs = state.domains[domain];
  const vals = Object.values(subs).map(subskillMastery);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// Overall readiness (0..100): average mastery across all domains, lightly
// penalized when any domain is badly neglected (weakest-link awareness).
export function readinessScore(state) {
  const domainKeys = Object.keys(state.domains);
  const masteries = domainKeys.map(d => domainMastery(state, d));
  const avg = masteries.reduce((a, b) => a + b, 0) / masteries.length;
  const weakest = Math.min(...masteries);
  const score = (avg * 0.75 + weakest * 0.25) * 100;
  return Math.round(score);
}

export function overallConfidence(state) {
  let total = 0, n = 0;
  for (const d of Object.values(state.domains)) {
    for (const sk of Object.values(d)) { total += subskillConfidence(sk); n += 1; }
  }
  return n ? Math.round((total / n) * 100) : 0;
}

// ---- Weak-area analysis & recommendations -----------------------------------
// Returns subskills sorted by need: low mastery first, with due-for-review and
// low-confidence items prioritized. This is what drives targeted practice.
export function weakAreas(state, limit = 5) {
  const items = [];
  for (const [dKey, dDef] of Object.entries(SUBSKILLS)) {
    for (const [skKey, skDef] of Object.entries(dDef.subskills)) {
      const s = state.domains[dKey][skKey];
      const mastery = subskillMastery(s);
      const confidence = subskillConfidence(s);
      const due = s.dueIn <= 0 && s.attempts > 0;
      // Need score: lower mastery + lower confidence + due review = higher need.
      // Untouched skills get moderate-high need so they surface early.
      const untouched = s.attempts === 0;
      const need = (untouched ? 0.65 : (1 - mastery)) * 0.6
        + (1 - confidence) * 0.25
        + (due ? 0.15 : 0);
      items.push({
        domain: dKey, domainLabel: dDef.label,
        subskill: skKey, subskillLabel: skDef.label,
        mastery, confidence, due, untouched, need,
        difficulty: s.difficulty, attempts: s.attempts,
      });
    }
  }
  items.sort((a, b) => b.need - a.need);
  return items.slice(0, limit);
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

export function recommendations(state) {
  const recs = [];
  const ready = readinessScore(state);
  const weak = weakAreas(state, 3);

  if (state.totalAnswered === 0) {
    recs.push({ kind: 'start', text: 'Take a short diagnostic in each domain so the engine can find your weak spots.' });
    return recs;
  }
  if (ready < 50) {
    recs.push({ kind: 'focus', text: `Readiness is ${ready}. Build fundamentals before timed full exams.` });
  } else if (ready < 75) {
    recs.push({ kind: 'progress', text: `Readiness is ${ready}. Keep targeting weak subskills to cross 75.` });
  } else {
    recs.push({ kind: 'ready', text: `Readiness is ${ready}. You're in strong shape — maintain with mixed reviews.` });
  }
  for (const w of weak) {
    if (w.untouched) {
      recs.push({ kind: 'new', text: `You haven't practiced ${w.subskillLabel} (${w.domainLabel}) yet — start there.` });
    } else if (w.due) {
      recs.push({ kind: 'review', text: `${w.subskillLabel} is due for spaced review.` });
    } else if (w.mastery < 0.5) {
      recs.push({ kind: 'weak', text: `${w.subskillLabel} (${w.domainLabel}) needs work — mastery ${Math.round(w.mastery * 100)}%.` });
    }
  }
  return recs;
}
