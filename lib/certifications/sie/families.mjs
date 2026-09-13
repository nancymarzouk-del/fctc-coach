// ============================================================================
// families.mjs — QUESTION-FAMILY taxonomy for FINRA SIE (anti-memorization backbone).
// ----------------------------------------------------------------------------
// A "family" is a REASONING PATH, not a wording/number variant. The same concept
// tested through different families demands transfer, not pattern-matching. UALE
// tracks exposure by (concept, family) and favors unseen families; mastery requires
// success across MULTIPLE families — so a learner can't clear an area by grinding one
// recognizable structure. Mirrors the CFA taxonomy shape.
// ============================================================================

export const FAMILIES = Object.freeze({
  IDENTIFY: 'identification',        // recognize the correct concept/definition/regulator
  COMPARE: 'comparison',            // distinguish two alternatives
  CONSEQUENCE: 'consequence-prediction', // predict the effect of a change
  CALC: 'calculation',              // compute/interpret a value
  SCENARIO: 'scenario-application', // apply the rule/concept to a described situation
  REVERSE: 'reverse-reasoning',     // pick the permitted/compliant action (or spot the non-example)
});

const FAMILY_LABELS = {
  [FAMILIES.IDENTIFY]: 'an identification question',
  [FAMILIES.COMPARE]: 'a comparison',
  [FAMILIES.CONSEQUENCE]: 'a “what happens if…” question',
  [FAMILIES.CALC]: 'a calculation',
  [FAMILIES.SCENARIO]: 'a scenario',
  [FAMILIES.REVERSE]: 'a which-action-is-permitted question',
};
export function familyLabel(f) { return FAMILY_LABELS[f] || 'a question'; }

// concept id -> family. Concept ids come from each generator's `concept` field.
// Explicit (not inferred) so the taxonomy is auditable. Every concept here has a
// sibling concept in the SAME subskill with a DIFFERENT family → ≥2 families/area.
export const CONCEPT_FAMILY = Object.freeze({
  // capitalMarkets:regulators — SEC vs FINRA vs MSRB
  'reg-identify': FAMILIES.IDENTIFY,
  'reg-scenario': FAMILIES.SCENARIO,
  'reg-compare': FAMILIES.COMPARE,
  // capitalMarkets:marketStructure — primary vs secondary
  'market-identify': FAMILIES.IDENTIFY,
  'market-scenario': FAMILIES.SCENARIO,
  'market-compare': FAMILIES.COMPARE,
  // products:debt — bond price/yield + current yield vs coupon
  'price-yield-direction': FAMILIES.CONSEQUENCE,
  'price-yield-scenario': FAMILIES.SCENARIO,
  'current-yield-calc': FAMILIES.CALC,
  'yield-compare': FAMILIES.COMPARE,
  // products:investmentRisks — systematic vs non-systematic
  'risk-identify': FAMILIES.IDENTIFY,
  'risk-match': FAMILIES.SCENARIO,
  'risk-compare': FAMILIES.COMPARE,
  // trading:orders — market vs limit
  'order-identify': FAMILIES.IDENTIFY,
  'order-scenario': FAMILIES.SCENARIO,
  'order-compare': FAMILIES.COMPARE,
  // trading:insiderTrading — insider trading / MNPI
  'insider-identify': FAMILIES.IDENTIFY,
  'mnpi-vs-public': FAMILIES.COMPARE,
  'insider-reverse': FAMILIES.REVERSE,
  // trading:marketManipulation — manipulation recognition
  'manip-identify': FAMILIES.IDENTIFY,
  'manip-scenario': FAMILIES.SCENARIO,
  'manip-reverse': FAMILIES.REVERSE,
});

export function familyOf(concept) {
  return CONCEPT_FAMILY[concept] || FAMILIES.IDENTIFY;
}

// A stable exposure key for anti-repetition (topic + concept + family).
export function exposureKey(topic, concept) {
  return `${topic}:${concept}:${familyOf(concept)}`;
}
