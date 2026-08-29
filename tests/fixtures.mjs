// ============================================================================
// tests/fixtures.mjs — deterministic learner fixtures for metrics validation.
// ----------------------------------------------------------------------------
// `replay` mirrors learningEngine.recordAnswer EXACTLY (same streak, difficulty,
// spaced-repetition, and enriched-history rules) so the fixtures exercise the
// real state shape the app produces — no hand-waved states. Answers are given as
// { c, d } (correct?, asked-difficulty) or a bare boolean (difficulty defaults to
// the skill's current adaptive difficulty, exactly like a live session).
// ============================================================================
import { HISTORY_CAP } from '../lib/metrics.mjs';

const SR_INTERVALS = [0, 1, 2, 4, 8, 16];

export function blankSub(difficulty = 2) {
  return { attempts: 0, correct: 0, streak: 0, difficulty, dueIn: 0, lastSeen: 0, history: [] };
}

// Apply one answer to a subskill state using the engine's real rules.
export function apply(s, answer) {
  const c = typeof answer === 'object' ? !!answer.c : !!answer;
  const askedD = typeof answer === 'object' && answer.d != null ? answer.d : s.difficulty;
  s.attempts += 1;
  if (c) { s.correct += 1; s.streak += 1; } else { s.streak = 0; }
  s.history.push({ c, d: askedD }); // enriched entry; difficulty is the ASKED difficulty
  if (s.history.length > HISTORY_CAP) s.history.shift();
  if (c && s.streak > 0 && s.streak % 3 === 0 && s.difficulty < 5) s.difficulty += 1;
  else if (!c && s.difficulty > 1) s.difficulty -= 1;
  s.dueIn = SR_INTERVALS[Math.min(s.streak, SR_INTERVALS.length - 1)];
  return s;
}

// Build a subskill state from a sequence of answers.
export function sub(answers = [], difficulty = 2) {
  const s = blankSub(difficulty);
  for (const a of answers) apply(s, a);
  return s;
}

// Force a "stale / not practiced recently" skill: strong, but overdue for review.
export function stale(s) { s.dueIn = 0; return s; }

// The registry the engine passes into metrics (labels + a few prerequisites).
export const REGISTRY = {
  mechanical: {
    label: 'Mechanical Reasoning',
    subskills: {
      levers: { label: 'Levers', prereq: true },
      pulleys: { label: 'Pulleys' },
      gears: { label: 'Gears' },
      hydraulics: { label: 'Hydraulics' },
    },
  },
  math: {
    label: 'Firefighter Math',
    subskills: {
      fractions: { label: 'Fractions', prereq: true },
      percentages: { label: 'Percentages' },
      ratios: { label: 'Ratios' },
    },
  },
  reading: {
    label: 'Reading Comprehension',
    subskills: {
      sop: { label: 'SOPs', prereq: true },
      safety: { label: 'Safety Procedures' },
    },
  },
  recall: {
    label: 'Visual & Verbal Recall',
    subskills: { observation: { label: 'Observation Recall' } },
  },
};

// Empty domains map matching the registry shape (all untested).
export function emptyDomains() {
  const d = {};
  for (const [dk, dv] of Object.entries(REGISTRY)) {
    d[dk] = {};
    for (const sk of Object.keys(dv.subskills)) d[dk][sk] = blankSub();
  }
  return d;
}

// Helpers to write answer sequences compactly.
export const T = { c: true };
export const F = { c: false };
export const rep = (answer, n) => Array.from({ length: n }, () => answer);
export const alt = (n) => Array.from({ length: n }, (_, i) => (i % 2 === 0 ? T : F));

// ============================================================================
// The ten simulated learner histories. Each returns a full domains map so the
// engine sees the whole exam, not an isolated skill.
// ============================================================================
export const LEARNERS = {
  // 1. New learner with almost no data (a single answered question).
  new_learner() {
    const d = emptyDomains();
    d.mechanical.levers = sub([F]); // one early miss, nothing else
    return { label: 'New learner, almost no data', domains: d, totalAnswered: 1 };
  },

  // 2. One early miss, then strong sustained improvement.
  early_miss_then_strong() {
    const d = emptyDomains();
    d.mechanical.levers = sub([F, ...rep(T, 9)], 2);
    d.math.fractions = sub(rep(T, 5));
    d.reading.sop = sub(rep(T, 5));
    return { label: 'One early miss, then strong', domains: d, totalAnswered: 19 };
  },

  // 3. Strong overall, but one serious weak subskill.
  strong_one_weak() {
    const d = emptyDomains();
    d.mechanical.levers = sub(rep(T, 6));
    d.mechanical.gears = sub(rep(T, 6));
    d.math.fractions = sub(rep(T, 6));
    d.math.percentages = sub(rep(T, 6));
    d.reading.sop = sub(rep(T, 6));
    // Pulleys: a real, evaluated weakness — misses at low difficulty.
    d.mechanical.pulleys = sub([F, { c: true, d: 2 }, F, F, { c: false, d: 2 }, F], 2);
    return { label: 'Strong overall, one serious weak subskill', domains: d, totalAnswered: 36 };
  },

  // 4. Few attempts, misleadingly high accuracy (2/2).
  few_attempts_high_acc() {
    const d = emptyDomains();
    d.math.ratios = sub(rep(T, 2));
    return { label: 'Few attempts, misleadingly high accuracy', domains: d, totalAnswered: 2 };
  },

  // 5. Many attempts, sustained weakness (~30%).
  sustained_weak() {
    const d = emptyDomains();
    d.mechanical.hydraulics = sub([F, F, T, F, F, F, T, F, F, F, F, T], 2);
    d.math.fractions = sub(rep(T, 6));
    d.reading.sop = sub(rep(T, 6));
    return { label: 'Many attempts, sustained weakness', domains: d, totalAnswered: 24 };
  },

  // 6. Improves rapidly after remediation (early failures, late successes).
  rapid_improve() {
    const d = emptyDomains();
    d.mechanical.gears = sub([F, F, F, F, F, T, T, T, T, T, T, T], 2);
    d.math.fractions = sub(rep(T, 6));
    d.reading.sop = sub(rep(T, 6));
    return { label: 'Improves rapidly after remediation', domains: d, totalAnswered: 24 };
  },

  // 7. Alternating correct/incorrect (unstable).
  alternating() {
    const d = emptyDomains();
    d.math.percentages = sub(alt(12), 2);
    d.reading.sop = sub(rep(T, 6));
    d.mechanical.levers = sub(rep(T, 6));
    return { label: 'Alternating correct/incorrect', domains: d, totalAnswered: 24 };
  },

  // 8. One lucky correct streak from cold (3/3).
  lucky_streak() {
    const d = emptyDomains();
    d.mechanical.gears = sub(rep(T, 3));
    return { label: 'One lucky correct streak (3/3)', domains: d, totalAnswered: 3 };
  },

  // 9. Has not practiced a domain recently (strong but stale/overdue).
  stale_domain() {
    const d = emptyDomains();
    d.reading.sop = stale(sub(rep(T, 6)));   // evaluated, strong, overdue
    d.reading.safety = stale(sub(rep(T, 6)));
    d.mechanical.levers = sub(rep(T, 6));
    d.math.fractions = sub(rep(T, 6));
    return { label: 'Domain not practiced recently (stale)', domains: d, totalAnswered: 24 };
  },

  // 10. Weakest RAW percentage is based on too little evidence.
  //     Skill A: 1 attempt, wrong (raw 0%). Skill B: evaluated at ~55% (real weakness).
  thin_evidence_trap() {
    const d = emptyDomains();
    d.mechanical.hydraulics = sub([F]); // raw 0% — but ONE attempt
    d.mechanical.pulleys = sub([{ c: false, d: 2 }, T, F, T, { c: false, d: 2 }, F], 2); // evaluated ~ real weakness
    d.math.fractions = sub(rep(T, 6));
    d.reading.sop = sub(rep(T, 6));
    return { label: 'Weakest raw % is thin evidence', domains: d, totalAnswered: 15 };
  },
};
