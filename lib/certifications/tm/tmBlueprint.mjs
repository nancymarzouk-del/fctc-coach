// ============================================================================
// tmBlueprint.mjs — GOVERNED competency map for Time Management & Personal Execution.
// ----------------------------------------------------------------------------
// A reusable UALE learning DOMAIN (not a certification, not a productivity course).
// Mirrors the CFA/SIE/FCTC blueprint shape (domain -> subskill -> objective/
// cognitiveTask) so the SHARED, domain-agnostic metrics engine (lib/metrics.mjs) and
// certRegistry consume it UNCHANGED. There is no external exam: the "readiness" band
// reflects skill-readiness from evidence, never a test score.
//
// Sprint 1 scope: the vertical slice — three competencies (prioritization,
// estimation, decomposition) with full teaching content. The remaining competencies
// exist in the design (Sprint 0) but are intentionally NOT registered here yet, so
// the engine only ever reports on what is actually implemented (honest analytics).
// ============================================================================

export const CERT_ID = 'time-management';
export const CERT_NAME = 'Time Management & Personal Execution';
export const KIND = 'skill-practice';
export const BLUEPRINT_SOURCE = 'UALE original competency model — Time Management & Personal Execution (behavioral execution skills, not personality)';
export const PRACTICE_LABEL = 'UALE adaptive skill practice';

// Contexts a skill must transfer across (the SECOND transfer axis, alongside
// question family). Mastery requires demonstrating a competency in ≥2 contexts so
// the skill is portable, not bound to one setting.
export const CONTEXTS = Object.freeze(['work', 'study', 'cert-prep', 'home']);
export const CONTEXT_LABELS = Object.freeze({
  work: 'professional work',
  study: 'studying',
  'cert-prep': 'certification prep',
  home: 'personal / home',
});
export function contextLabel(c) { return CONTEXT_LABELS[c] || c; }

// No external exam. Kept for shape-compatibility with the registry; consumers must
// treat readiness as an evidence-derived skill signal, never a pass/fail score.
export const EXAM = Object.freeze({
  scoredQuestions: null,
  minutes: null,
  answerChoices: 4,
  itemSets: false,
  negativeMarking: false,
  passingScorePublished: null,
});
export const CALCULATOR_ALLOWED = false;

// ---- Competencies ("topics" in the shared shape) + implemented subskills ---------
// Sprint 1 implements exactly these three competencies. Weights are derived from
// subskill counts (no official exam weighting exists for a skill domain).
export const TOPICS = Object.freeze({
  prioritization: { key: 'prioritization', label: 'Prioritization',   pct: 38, items: 5 },
  estimation:     { key: 'estimation',     label: 'Time Estimation',  pct: 38, items: 5 },
  decomposition:  { key: 'decomposition',  label: 'Task Decomposition', pct: 31, items: 4 },
});
export const TOPIC_ORDER = Object.freeze(['prioritization', 'estimation', 'decomposition']);

export function officialWeights() {
  const total = TOPIC_ORDER.reduce((a, k) => a + TOPICS[k].items, 0);
  const w = {};
  for (const k of TOPIC_ORDER) w[k] = TOPICS[k].items / total;
  return w;
}
export function officialMockAllocation(total = 14) {
  const w = officialWeights();
  const alloc = TOPIC_ORDER.map((k) => { const exact = total * w[k]; return { k, n: Math.floor(exact), frac: exact - Math.floor(exact) }; });
  let assigned = alloc.reduce((a, b) => a + b.n, 0);
  alloc.sort((a, b) => b.frac - a.frac);
  for (let i = 0; assigned < total; i++, assigned++) alloc[i % alloc.length].n += 1;
  const out = {};
  for (const a of alloc) out[a.k] = a.n;
  return out;
}

// ---- Subskill blueprint (original objectives; behavioral, never personality) -----
export const SUBSKILL_BLUEPRINT = {
  prioritization: {
    _cognitive: 'Decide what to do first when work competes, by impact — not merely by urgency or ease',
    urgencyVsImportance:    { objective: 'Separate what is urgent (time-pressured) from what is important (high-consequence), and act on importance', cognitiveTask: 'prioritization/discrimination', format: 'mcq' },
    consequenceImpact:      { objective: 'Weigh the downstream consequence/impact of each option when choosing order', cognitiveTask: 'consequence-weighting', format: 'mcq' },
    competingPriorities:    { objective: 'Sequence several competing tasks under deadlines, dependencies, and limited time', cognitiveTask: 'sequencing/tradeoff', format: 'mcq' },
    chooseWhatNotToDo:      { objective: 'Decide what to drop, defer, or delegate — not everything can be done', cognitiveTask: 'elimination/tradeoff', format: 'mcq' },
    everythingFeelsUrgent:  { objective: 'Impose a real ordering when every task "feels" like a priority', cognitiveTask: 'de-conflation', format: 'mcq' },
  },
  estimation: {
    _cognitive: 'Predict how long work takes using evidence, buffers, and correction — not optimism',
    durationEstimation:     { objective: 'Estimate a task’s realistic duration from its scope', cognitiveTask: 'estimation', format: 'mcq' },
    planningFallacy:        { objective: 'Recognize the planning fallacy (single best-case estimate) and counter it', cognitiveTask: 'bias-recognition', format: 'mcq' },
    historicalEvidence:     { objective: 'Use past actuals for similar work instead of a fresh optimistic guess', cognitiveTask: 'evidence-use', format: 'mcq' },
    bufferSizing:           { objective: 'Add appropriate buffer for uncertainty and interruptions', cognitiveTask: 'buffer-planning', format: 'mcq' },
    correctionAfterMiss:    { objective: 'Adjust future estimates after an estimate misses (calibrate)', cognitiveTask: 'calibration', format: 'mcq' },
  },
  decomposition: {
    _cognitive: 'Turn vague or overwhelming work into a concrete next action with clear "done"',
    vagueToActionable:      { objective: 'Convert a vague goal into a concrete, doable action', cognitiveTask: 'operationalization', format: 'mcq' },
    trueNextAction:         { objective: 'Identify the single true next physical/visible action', cognitiveTask: 'next-action-identification', format: 'mcq' },
    breakingOverwhelm:      { objective: 'Break a large/overwhelming task into a startable first slice', cognitiveTask: 'chunking', format: 'mcq' },
    completionCriteria:     { objective: 'Define explicit completion criteria (what "done" means)', cognitiveTask: 'definition-of-done', format: 'mcq' },
  },
};

export function provenanceFor(topic, subskill) {
  return Object.freeze({
    certId: CERT_ID,
    source: BLUEPRINT_SOURCE,
    label: PRACTICE_LABEL,
    topic: topic || null,
    subskill: subskill || null,
  });
}
