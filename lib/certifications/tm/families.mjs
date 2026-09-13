// ============================================================================
// families.mjs — REASONING-PATH taxonomy for Time Management (anti-memorization).
// ----------------------------------------------------------------------------
// A "family" is a reasoning path, not a wording variant. The same competency tested
// through different families demands transfer, not pattern-matching. Mastery requires
// success across ≥2 families AND (this domain adds) ≥2 contexts — so a learner can't
// clear a competency by grinding one recognizable structure or one setting.
// Mirrors the SIE/CFA taxonomy shape so the shared engine plugs in unchanged.
// ============================================================================

export const FAMILIES = Object.freeze({
  PRIORITIZE: 'prioritize',   // choose + sequence what to do first, and justify by impact
  TRADEOFF:   'tradeoff',     // something new/urgent arrives — decide what moves or drops
  CRITIQUE:   'critique',     // find the flaw in a plan / schedule / estimate
  ESTIMATE:   'estimate',     // predict a realistic duration / buffer
  REVERSE:    'reverse',      // an execution failure is shown — infer the planning cause
  DECOMPOSE:  'decompose',    // turn vague / oversized work into the true next action
});

const FAMILY_LABELS = {
  [FAMILIES.PRIORITIZE]: 'a prioritization decision',
  [FAMILIES.TRADEOFF]:   'a tradeoff decision',
  [FAMILIES.CRITIQUE]:   'a spot-the-flaw question',
  [FAMILIES.ESTIMATE]:   'an estimation question',
  [FAMILIES.REVERSE]:    'a “what went wrong” question',
  [FAMILIES.DECOMPOSE]:  'a break-it-down question',
};
export function familyLabel(f) { return FAMILY_LABELS[f] || 'a question'; }

// concept id -> family. Concept ids come from each generator's `concept` field.
// Explicit (auditable). Every subskill has ≥2 concepts with DIFFERENT families.
export const CONCEPT_FAMILY = Object.freeze({
  // prioritization
  'uvi-prioritize': FAMILIES.PRIORITIZE, 'uvi-critique': FAMILIES.CRITIQUE,
  'ci-prioritize': FAMILIES.PRIORITIZE,  'ci-tradeoff': FAMILIES.TRADEOFF,
  'cp-prioritize': FAMILIES.PRIORITIZE,  'cp-tradeoff': FAMILIES.TRADEOFF,
  'cwntd-tradeoff': FAMILIES.TRADEOFF,   'cwntd-critique': FAMILIES.CRITIQUE,
  'efu-prioritize': FAMILIES.PRIORITIZE, 'efu-critique': FAMILIES.CRITIQUE,
  // estimation
  'de-estimate': FAMILIES.ESTIMATE,      'de-critique': FAMILIES.CRITIQUE,
  'pf-reverse': FAMILIES.REVERSE,        'pf-critique': FAMILIES.CRITIQUE,
  'he-estimate': FAMILIES.ESTIMATE,      'he-reverse': FAMILIES.REVERSE,
  'bs-estimate': FAMILIES.ESTIMATE,      'bs-critique': FAMILIES.CRITIQUE,
  'cam-estimate': FAMILIES.ESTIMATE,     'cam-reverse': FAMILIES.REVERSE,
  // decomposition
  'vta-decompose': FAMILIES.DECOMPOSE,   'vta-reverse': FAMILIES.REVERSE,
  'tna-decompose': FAMILIES.DECOMPOSE,   'tna-prioritize': FAMILIES.PRIORITIZE,
  'bo-decompose': FAMILIES.DECOMPOSE,    'bo-prioritize': FAMILIES.PRIORITIZE,
  'cc-decompose': FAMILIES.DECOMPOSE,    'cc-reverse': FAMILIES.REVERSE,
});

export function familyOf(concept) {
  return CONCEPT_FAMILY[concept] || FAMILIES.PRIORITIZE;
}

// Stable exposure key for anti-repetition (topic + concept + family).
export function exposureKey(topic, concept) {
  return `${topic}:${concept}:${familyOf(concept)}`;
}
