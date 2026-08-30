// ============================================================================
// fctcBlueprint.mjs — GOVERNED source of truth for the FCTC Written Test.
// ----------------------------------------------------------------------------
// Grounded in the official Cal-JAC / FCTC prep guide (2020 ed.). This module is
// the single authority for: the four official domains, their exam WEIGHTING, and
// per-subskill objectives / cognitive tasks / formats / calculator + visual
// policy + provenance. Content generators and the mock exam derive their
// structure from here rather than from assumptions about "what a firefighter
// should know."
//
// GOVERNING RULE (from the guide): the FCTC Written Test is an ENTRY-LEVEL
// GENERAL-KNOWLEDGE / cognitive-skills exam with firefighter CONTEXT only. Prior
// firefighter knowledge must NOT be required to answer unless the needed
// information is supplied in the question or passage. No calculators are allowed.
//
// This is intentionally scoped to FCTC. The shape (domain -> subskill -> objective
// / cognitiveTask / format / provenance) is clean enough to reuse for a future
// professional certification, but this sprint does NOT build a universal platform.
// ============================================================================

export const BLUEPRINT_SOURCE = 'FCTC Written Test Preparation Guide (Cal-JAC / FCTC), 2020 ed.';
// Learner-facing framing. NEVER present items as "official FCTC questions" — this
// is original, aligned practice.
export const PRACTICE_LABEL = 'FCTC-aligned practice';

export const OFFICIAL_TOTAL = 100;
export const OFFICIAL_EXAM_SECONDS = 120 * 60; // official: 2 hours for 100 MCQs
export const CALCULATOR_ALLOWED = false;        // FCTC never allows calculators

// App domain key -> official domain metadata. App keys are PRESERVED (progress
// storage + tests depend on them); the guide's official names are what learners see.
export const DOMAINS = {
  recall:     { code: 'A', key: 'recall',     label: 'Verbal & Visual Information', count: 20, calculator: false },
  mechanical: { code: 'B', key: 'mechanical', label: 'Mechanical Reasoning',        count: 25, calculator: false },
  math:       { code: 'C', key: 'math',       label: 'Mathematical Problems',       count: 20, calculator: false },
  reading:    { code: 'D', key: 'reading',    label: 'Technical Written Materials', count: 35, calculator: false },
};

// Canonical display/results order (A, B, C, D).
export const DOMAIN_ORDER = ['recall', 'mechanical', 'math', 'reading'];

// Official counts (sum = 100) — the single source for the mock distribution.
export function officialMockAllocation() {
  return { recall: 20, mechanical: 25, math: 20, reading: 35 };
}

// Fractional weights (sum = 1.0) for allocators that expect fractions. Largest-
// remainder allocation over total=100 reproduces the exact official counts.
export function officialWeights() {
  return { recall: 0.20, mechanical: 0.25, math: 0.20, reading: 0.35 };
}

// Reading (Domain D, the largest at 35 Q) has TWO distinct modes from the guide:
//   delayed   — an essay is studied during a pre-test period, then REMOVED; the
//               candidate answers from MEMORY (READ -> STUDY -> HIDE -> RECALL).
//   available — an essay stays in the test booklet; the candidate answers with the
//               source visible (READ -> SEARCH -> INTERPRET -> ANSWER).
// These are related but SEPARATE skills and are tracked separately.
export const READING_MODES = { DELAYED: 'delayed', AVAILABLE: 'available' };

// Per-subskill governance. Keyed by app domain then subskill key. Drives the
// provenance stamp on generated items and the alignment tests. Objectives and
// cognitive tasks are grounded in the guide's concept sections.
export const SUBSKILL_BLUEPRINT = {
  mechanical: {
    _cognitive: 'Reason about how objects move or interact by reading a diagram',
    levers:        { objective: 'Determine lever balance/advantage from torque (force × distance)', cognitiveTask: 'spatial-mechanical reasoning', format: 'diagram-mcq', visual: true },
    pulleys:       { objective: 'Find mechanical advantage / effort in a block-and-tackle', cognitiveTask: 'count supporting rope parts', format: 'diagram-mcq', visual: true },
    gears:         { objective: 'Determine gear rotation direction and relative speed', cognitiveTask: 'gear-train reasoning', format: 'diagram-mcq', visual: true },
    belts:         { objective: 'Determine pulley speed from diameter (inverse) and belt path', cognitiveTask: 'belt/pulley reasoning', format: 'diagram-mcq', visual: true },
    hydraulics:    { objective: 'Reason about fluid pressure/force in a system', cognitiveTask: 'fluid reasoning', format: 'diagram-mcq', visual: true },
    balance:       { objective: 'Determine which way a loaded beam tips', cognitiveTask: 'moment/balance reasoning', format: 'diagram-mcq', visual: true },
    inclinedPlane: { objective: 'Reason about ramp mechanical advantage', cognitiveTask: 'ratio reasoning', format: 'mcq', visual: false },
    forceMotion:   { objective: 'Relate force, mass, and motion', cognitiveTask: 'proportional reasoning', format: 'mcq', visual: false },
  },
  math: {
    _cognitive: 'Solve a practical, calculator-free math word problem (HS level)',
    fractions:     { objective: 'Operate with fractions in context', cognitiveTask: 'fraction arithmetic', format: 'mcq', visual: false },
    ratios:        { objective: 'Apply a ratio/proportion to a total', cognitiveTask: 'ratio reasoning', format: 'mcq', visual: false },
    percentages:   { objective: 'Compute percentages / increase / decrease', cognitiveTask: 'percent reasoning', format: 'mcq', visual: false },
    unitConversion:{ objective: 'Convert units using a supplied formula', cognitiveTask: 'formula application', format: 'mcq', visual: false },
    timeDistance:  { objective: 'Relate speed, time, and distance', cognitiveTask: 'rate reasoning', format: 'mcq', visual: false },
    areaVolume:    { objective: 'Compute area/volume and keep units straight', cognitiveTask: 'geometry reasoning', format: 'mcq', visual: false },
    wordProblem:   { objective: 'Translate a word problem into arithmetic', cognitiveTask: 'multi-step arithmetic', format: 'mcq', visual: false },
  },
  reading: {
    _cognitive: 'Recall or comprehend technical written material',
    sop:            { objective: 'Comprehend a procedure and answer precisely', cognitiveTask: 'detail/condition comprehension', format: 'passage-mcq', mode: READING_MODES.AVAILABLE },
    equipment:      { objective: 'Extract exact thresholds from an instruction', cognitiveTask: 'threshold/number comprehension', format: 'passage-mcq', mode: READING_MODES.AVAILABLE },
    incidentReport: { objective: 'Recall the sequence/details of a report', cognitiveTask: 'sequence/detail comprehension', format: 'passage-mcq', mode: READING_MODES.AVAILABLE },
    safety:         { objective: 'Identify conditions/exceptions in a bulletin', cognitiveTask: 'condition/exception comprehension', format: 'passage-mcq', mode: READING_MODES.AVAILABLE },
  },
  recall: {
    _cognitive: 'Remember seen and heard details after the source is removed',
    observation: { objective: 'Recall visual scene details from memory', cognitiveTask: 'visual recall', format: 'study-then-recall', delayed: true },
    sequence:    { objective: 'Recall the order of steps from memory', cognitiveTask: 'sequence recall', format: 'study-then-recall', delayed: true },
    personnel:   { objective: 'Recall personnel/role assignments from memory', cognitiveTask: 'association recall', format: 'study-then-recall', delayed: true },
    equipment:   { objective: 'Recall equipment details from a scene', cognitiveTask: 'visual recall', format: 'study-then-recall', delayed: true },
    directional: { objective: 'Track direction/orientation from memory', cognitiveTask: 'spatial recall', format: 'study-then-recall', delayed: true },
    dispatch:    { objective: 'Recall spoken/dispatched (heard) details', cognitiveTask: 'verbal recall', format: 'study-then-recall', delayed: true },
  },
};

// Minimum governance metadata stamped on every generated item so alignment is
// auditable and a future upload/generation pipeline can slot in.
export function provenanceFor(domain, subskill) {
  const d = DOMAINS[domain];
  const sk = SUBSKILL_BLUEPRINT[domain]?.[subskill];
  return {
    blueprintSource: BLUEPRINT_SOURCE,
    officialDomain: d ? d.code : null,
    officialDomainLabel: d ? d.label : null,
    objective: sk?.objective || null,
    cognitiveTask: sk?.cognitiveTask || SUBSKILL_BLUEPRINT[domain]?._cognitive || null,
    calculatorAllowed: CALCULATOR_ALLOWED, // always false for FCTC
    origin: 'uale-original',               // generated, aligned — never copied
    derivedFrom: 'concept',                // grounded in the guide's concepts, not its items
  };
}

// Pure presentation transform for a reading item in DELAYED mode: the study phase
// shows the passage; the recall phase REMOVES it so the learner answers from
// memory (READ -> STUDY -> HIDE -> RECALL). Available mode keeps the passage with
// the question. Returned shape is UI-agnostic and unit-testable.
export function presentReading(item, mode = READING_MODES.AVAILABLE) {
  if (!item) return item;
  if (mode === READING_MODES.DELAYED) {
    return {
      mode,
      study: { passage: item.passage || null },   // shown during the timed study phase
      quiz: { ...item, passage: null },            // source REMOVED before answering
    };
  }
  return { mode: READING_MODES.AVAILABLE, study: null, quiz: item };
}
