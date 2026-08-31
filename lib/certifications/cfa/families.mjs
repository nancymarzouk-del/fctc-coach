// ============================================================================
// families.mjs — QUESTION-FAMILY taxonomy for CFA (anti-memorization backbone).
// ----------------------------------------------------------------------------
// A "family" is a REASONING PATH, not a wording/number variant. The same concept
// tested through different families demands transfer, not pattern-matching. UALE
// tracks exposure by (concept, family) and favors unseen families, and treats
// mastery as success across MULTIPLE families — so a learner can't clear a topic by
// grinding one recognizable structure.
//
// Parameter/wording changes are explicitly NOT families.
// ============================================================================

export const FAMILIES = Object.freeze({
  CALC: 'calculation',              // solve-forward for a value
  REVERSE: 'reverse-reasoning',     // solve for an input / missing variable
  INTERPRET: 'conceptual-interpretation', // pick the correct concept/definition
  SCENARIO: 'scenario-application', // apply the concept to a described situation
  CONSEQUENCE: 'consequence-prediction', // predict the effect of a change
  ERROR_ID: 'error-identification', // spot the flawed reasoning
  COMPARE: 'comparison',            // choose between alternatives
});

const FAMILY_LABELS = {
  [FAMILIES.CALC]: 'a calculation',
  [FAMILIES.REVERSE]: 'a reverse (solve-for-the-input) problem',
  [FAMILIES.INTERPRET]: 'a concept question',
  [FAMILIES.SCENARIO]: 'a scenario',
  [FAMILIES.CONSEQUENCE]: 'a “what happens if…” question',
  [FAMILIES.ERROR_ID]: 'an error-spotting question',
  [FAMILIES.COMPARE]: 'a comparison',
};
export function familyLabel(f) { return FAMILY_LABELS[f] || 'a question'; }

// concept id -> family. Concept ids come from each generator's `concept` field.
// Keeping this map explicit (rather than inferring) makes the taxonomy auditable.
export const CONCEPT_FAMILY = Object.freeze({
  // quant / TVM
  'single-sum-fv': FAMILIES.CALC,
  'single-sum-pv': FAMILIES.CALC,
  'annuity-pv': FAMILIES.CALC,
  'effective-annual-rate': FAMILIES.CALC,
  'tvm-direction': FAMILIES.INTERPRET,     // added this sprint (conceptual, not calc)
  // economics
  'elasticity': FAMILIES.CALC,
  'price-controls': FAMILIES.CONSEQUENCE,
  // fsa
  'liquidity-ratios': FAMILIES.CALC,
  'accounting-equation': FAMILIES.INTERPRET,
  // corporate finance
  'npv': FAMILIES.CALC,
  'npv-decision': FAMILIES.CONSEQUENCE,     // added this sprint
  // equity
  'gordon-growth': FAMILIES.CALC,
  'order-types': FAMILIES.INTERPRET,
  // fixed income
  'current-yield': FAMILIES.CALC,
  'price-yield-inverse': FAMILIES.CONSEQUENCE,
  // derivatives
  'option-payoff': FAMILIES.CALC,
  'derivative-features': FAMILIES.INTERPRET,
  // alternative investments
  'alt-categories': FAMILIES.INTERPRET,
  'alt-characteristics': FAMILIES.CONSEQUENCE, // added this sprint
  // portfolio
  'expected-return': FAMILIES.CALC,
  'diversification': FAMILIES.CONSEQUENCE,
  // ethics — scenario application (violation) + reverse (which is compliant)
  'mnpi': FAMILIES.SCENARIO,
  'independence': FAMILIES.SCENARIO,
  'misrepresentation': FAMILIES.SCENARIO,
  'loyalty-employer': FAMILIES.SCENARIO,
  'suitability': FAMILIES.SCENARIO,
  'fair-dealing': FAMILIES.SCENARIO,
  'conflicts-disclosure': FAMILIES.SCENARIO,
  'diligence': FAMILIES.SCENARIO,
  'ethics-compliant': FAMILIES.REVERSE,     // added this sprint (which action is permitted)
});

// The family of a generated item, from its `concept`. Unknown concept => CALC
// (safe default) but that should not happen for tagged generators.
export function familyOf(concept) {
  return CONCEPT_FAMILY[concept] || FAMILIES.CALC;
}

// A stable exposure key for anti-repetition (topic + concept + family).
export function exposureKey(topic, concept) {
  return `${topic}:${concept}:${familyOf(concept)}`;
}
