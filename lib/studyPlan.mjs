// ============================================================================
// studyPlan.mjs — certification-agnostic study-planning FOUNDATION.
// ----------------------------------------------------------------------------
// Stefan's CFA exam date is not yet known, so this NEVER invents a date or a
// schedule. It stores an optional exam date, available weekly study time, and
// topic priorities, and RECALCULATES effort allocation from official topic weights
// + demonstrated progress. When (and only when) an exam date is provided, it also
// derives weeks-remaining and weekly study COMMITMENTS.
//
// Sprint-3 compatibility: commitments are emitted as generic, life-planner-ready
// objects ({ kind:'study', certId, topic, minutesPerWeek, … }) so a future Time
// Management & Personal Execution system can merge CFA study with the rest of
// Stefan's life. This module assumes study does NOT exist in isolation — it exposes
// effort shares and commitments, not a self-contained calendar. Pure + testable;
// pass `nowMs` for deterministic scheduling (no ambient clock).
// ============================================================================

export const PLAN_VERSION = 1;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Create (or re-create) a plan. examDate may be null (unknown — the default).
export function createStudyPlan({ certId, examDate = null, weeklyMinutes = 0, topicPriorities = {} } = {}) {
  return {
    version: PLAN_VERSION,
    certId: certId || null,
    examDate: examDate || null,          // ISO string or null; added later when known
    weeklyMinutes: Math.max(0, weeklyMinutes | 0),
    topicPriorities: { ...topicPriorities }, // topicKey -> multiplier (default 1)
  };
}

// Update fields immutably; unspecified fields are preserved. Used to add the exam
// date later, change weekly time, or adjust priorities — then recalc.
export function updateStudyPlan(plan, patch = {}) {
  const base = plan || createStudyPlan({});
  const next = { ...base };
  if ('examDate' in patch) next.examDate = patch.examDate || null;
  if ('weeklyMinutes' in patch) next.weeklyMinutes = Math.max(0, patch.weeklyMinutes | 0);
  if ('certId' in patch) next.certId = patch.certId || null;
  if ('topicPriorities' in patch) next.topicPriorities = { ...base.topicPriorities, ...patch.topicPriorities };
  return next;
}

// Weeks remaining until the exam (null if no date / past). `nowMs` required for a
// deterministic result; without it, scheduling is withheld.
export function weeksUntil(examDate, nowMs) {
  if (!examDate || nowMs == null) return null;
  const then = Date.parse(examDate);
  if (!Number.isFinite(then) || then <= nowMs) return null;
  return Math.max(1, Math.ceil((then - nowMs) / WEEK_MS));
}

// Recalculate the plan.
//   topics   : [{ key, weight }]  — official topic weights (fractions summing ~1)
//   progress : { topicKey: mastery0to1 }  — demonstrated mastery (default 0 = full gap)
// Returns effort SHARES always; adds weeks-remaining + weekly COMMITMENTS only when
// an exam date + nowMs are available. Effort is biased toward heavier-weighted,
// higher-priority, larger-gap topics — never toward already-mastered ones.
export function recalcPlan(plan, { topics = [], progress = {}, nowMs = null } = {}) {
  const p = plan || createStudyPlan({});
  const raw = topics.map((t) => {
    const gap = Math.max(0.05, 1 - (Number.isFinite(progress[t.key]) ? progress[t.key] : 0)); // keep a floor so mastered topics still get light review
    const priority = Number.isFinite(p.topicPriorities[t.key]) ? p.topicPriorities[t.key] : 1;
    return { key: t.key, weight: t.weight || 0, score: (t.weight || 0) * gap * priority };
  });
  const totalScore = raw.reduce((a, b) => a + b.score, 0) || 1;
  const shares = raw.map((r) => ({ key: r.key, weight: r.weight, effortShare: r.score / totalScore }));

  const weeks = weeksUntil(p.examDate, nowMs);
  const scheduled = weeks != null && p.weeklyMinutes > 0;
  const commitments = scheduled
    ? shares.map((s) => ({
        kind: 'study',                 // generic type a life-planner (Sprint 3) can consume
        certId: p.certId,
        topic: s.key,
        minutesPerWeek: Math.round(p.weeklyMinutes * s.effortShare),
      }))
    : [];

  return {
    certId: p.certId,
    hasExamDate: !!p.examDate,
    weeksRemaining: weeks,             // null until a (future) date is set
    weeklyMinutes: p.weeklyMinutes,
    shares,                            // always available (date-independent)
    commitments,                       // empty until schedulable; Sprint-3-ready shape
    scheduled,
  };
}
