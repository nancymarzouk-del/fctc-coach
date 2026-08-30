// ============================================================================
// cfaBlueprint.mjs — GOVERNED source of truth for CFA Level I.
// ----------------------------------------------------------------------------
// Grounded in CFA Institute primary sources (see PROVENANCE_URLS). Mirrors the
// FCTC blueprint shape (lib/fctcBlueprint.mjs) — the SAME governance structure
// (domain -> weight -> subskill -> objective/cognitiveTask/provenance) represents
// a completely different certification, which is the point of Sprint 2.
//
// COPYRIGHT: CFA Institute owns the curriculum, Learning Outcome Statements, and
// official/mock questions. This module records FACTS (topic names, weight ranges,
// structure, policies) and cites the source. No LOS text, curriculum passages, or
// official questions are reproduced. All UALE practice is ORIGINAL and framed as
// "CFA Level I aligned practice" — never "official CFA questions." "CFA" and
// "Chartered Financial Analyst" are trademarks of CFA Institute.
// ============================================================================

export const CERT_ID = 'cfa-level-1';
export const CERT_NAME = 'CFA Level I';
export const BLUEPRINT_SOURCE = 'CFA Institute — CFA Program Level I candidate resources (cfainstitute.org)';
export const PRACTICE_LABEL = 'CFA Level I aligned practice'; // never "official CFA questions"

export const PROVENANCE_URLS = Object.freeze([
  'https://www.cfainstitute.org/programs/cfa-program/candidate-resources/level-i-exam',
  'https://www.cfainstitute.org/about/governance/policies/cfa-calculator-policy',
  'https://www.cfainstitute.org/standards/professionals/code-ethics-standards',
  'https://www.cfainstitute.org/programs/cfa-program/candidate-resources/practical-skills-modules',
  'https://www.cfainstitute.org/programs/cfa-program/curriculum',
]);

// ---- Official exam structure (facts) -------------------------------------------
export const EXAM = Object.freeze({
  totalQuestions: 180,
  sessions: 2,
  minutesPerSession: 135,
  answerChoices: 3,          // A, B, C
  itemSets: false,           // Level I is standalone questions (no vignettes)
  negativeMarking: false,    // no penalty for wrong answers; all equally weighted
  recommendedStudyHours: 300,
  practicalSkillsModuleRequired: true, // one PSM must be completed to receive a result
});

// Approved calculators (exactly two families).
export const APPROVED_CALCULATORS = Object.freeze([
  'Texas Instruments BA II Plus (incl. BA II Plus Professional)',
  'Hewlett Packard 12C (incl. 12C Platinum and anniversary/Prestige variants)',
]);
export const CALCULATOR_ALLOWED = true; // unlike FCTC, CFA REQUIRES an approved calculator

// ---- Topic areas + OFFICIAL weight ranges --------------------------------------
// Weights are published as RANGES (they are not smoothed). `mid` is the range
// midpoint used only to derive a normalized mock allocation; the authoritative
// value is the range. Keys are stable app identifiers; labels are the official names.
export const TOPICS = Object.freeze({
  ethics:         { key: 'ethics',         label: 'Ethical and Professional Standards', min: 10, max: 15, mid: 12.5, calc: false },
  quant:          { key: 'quant',          label: 'Quantitative Methods',               min: 11, max: 14, mid: 12.5, calc: true },
  economics:      { key: 'economics',      label: 'Economics',                          min: 6,  max: 9,  mid: 7.5,  calc: true },
  fsa:            { key: 'fsa',            label: 'Financial Statement Analysis',       min: 11, max: 14, mid: 12.5, calc: true },
  corpFinance:    { key: 'corpFinance',    label: 'Corporate Finance',                  min: 6,  max: 9,  mid: 7.5,  calc: true },
  equity:         { key: 'equity',         label: 'Equities',                           min: 11, max: 14, mid: 12.5, calc: true },
  fixedIncome:    { key: 'fixedIncome',    label: 'Fixed Income',                       min: 11, max: 14, mid: 12.5, calc: true },
  derivatives:    { key: 'derivatives',    label: 'Derivatives and Risk Management',    min: 6,  max: 9,  mid: 7.5,  calc: true },
  altInvestments: { key: 'altInvestments', label: 'Alternative Investments',            min: 6,  max: 9,  mid: 7.5,  calc: false },
  portfolio:      { key: 'portfolio',      label: 'Portfolio Construction',             min: 8,  max: 12, mid: 10.0, calc: true },
});

export const TOPIC_ORDER = Object.freeze([
  'ethics', 'quant', 'economics', 'fsa', 'corpFinance',
  'equity', 'fixedIncome', 'derivatives', 'altInvestments', 'portfolio',
]);

// Normalized fractional weights from the range MIDPOINTS (sum = 1.0). Used to
// allocate a mock; clearly derived, not a claim of exact per-exam composition.
export function officialWeights() {
  const total = TOPIC_ORDER.reduce((a, k) => a + TOPICS[k].mid, 0);
  const w = {};
  for (const k of TOPIC_ORDER) w[k] = TOPICS[k].mid / total;
  return w;
}

// Mock allocation: per-topic counts summing EXACTLY to `total` (default = official
// 180) via largest-remainder over the normalized midpoint weights.
export function officialMockAllocation(total = EXAM.totalQuestions) {
  const w = officialWeights();
  const alloc = TOPIC_ORDER.map((k) => {
    const exact = total * w[k];
    return { k, n: Math.floor(exact), frac: exact - Math.floor(exact) };
  });
  let assigned = alloc.reduce((a, b) => a + b.n, 0);
  alloc.sort((a, b) => b.frac - a.frac);
  for (let i = 0; assigned < total; i++, assigned++) alloc[i % alloc.length].n += 1;
  const out = {};
  for (const a of alloc) out[a.k] = a.n;
  return out;
}

// ---- Ethics: Code of Ethics + Standards of Professional Conduct -----------------
// Structure only (fact) — the Standards Handbook text is NOT reproduced. Original
// scenario practice is generated against this structure (see ./ethics.mjs).
export const CODE_OF_ETHICS_COMPONENTS = 6;
export const STANDARDS = Object.freeze({
  I:   { title: 'Professionalism', subparts: { A: 'Knowledge of the Law', B: 'Independence and Objectivity', C: 'Misrepresentation', D: 'Misconduct', E: 'Competence' } },
  II:  { title: 'Integrity of Capital Markets', subparts: { A: 'Material Nonpublic Information', B: 'Market Manipulation' } },
  III: { title: 'Duties to Clients', subparts: { A: 'Loyalty, Prudence, and Care', B: 'Fair Dealing', C: 'Suitability', D: 'Performance Presentation', E: 'Preservation of Confidentiality' } },
  IV:  { title: 'Duties to Employers', subparts: { A: 'Loyalty', B: 'Additional Compensation Arrangements', C: 'Responsibilities of Supervisors' } },
  V:   { title: 'Investment Analysis, Recommendations, and Actions', subparts: { A: 'Diligence and Reasonable Basis', B: 'Communication with Clients and Prospective Clients', C: 'Record Retention' } },
  VI:  { title: 'Conflicts of Interest', subparts: { A: 'Disclosure of Conflicts', B: 'Priority of Transactions', C: 'Referral Fees' } },
  VII: { title: 'Responsibilities as a CFA Institute Member or CFA Candidate', subparts: { A: 'Conduct as Participants in CFA Institute Programs', B: 'Reference to CFA Institute, the CFA Designation, and the CFA Program' } },
});

// ---- Subskill blueprint (objectives + cognitive tasks; original, no LOS text) ---
// Seeded deep where Sprint 2 builds quality content (ethics, quant); other topics
// carry their objective so the blueprint is COMPLETE and the bank can expand
// incrementally without structural change. cognitiveTask reflects the CFA command-
// word emphasis (calculate/interpret/evaluate/determine — never "Discuss", which is
// Level III only).
export const SUBSKILL_BLUEPRINT = {
  ethics: {
    _cognitive: 'Apply the Code and Standards to an original scenario (not memorize definitions)',
    standardsApplication: { objective: 'Determine which Standard a described action most likely violates', cognitiveTask: 'apply/determine', format: 'scenario-mcq' },
    independenceObjectivity: { objective: 'Evaluate independence/objectivity threats (gifts, issuer-paid work)', cognitiveTask: 'evaluate', format: 'scenario-mcq' },
    mnpi: { objective: 'Apply material nonpublic information rules', cognitiveTask: 'apply', format: 'scenario-mcq' },
    conflicts: { objective: 'Identify required disclosure / priority of transactions', cognitiveTask: 'identify', format: 'scenario-mcq' },
  },
  quant: {
    _cognitive: 'Calculate and interpret quantitative results with correct method',
    tvm: { objective: 'Calculate time value of money (single sums, annuities, rate conversion)', cognitiveTask: 'calculate', format: 'calc-mcq', calc: true },
    rates: { objective: 'Convert nominal/effective rates and compounding frequencies', cognitiveTask: 'calculate', format: 'calc-mcq', calc: true },
    statistics: { objective: 'Interpret measures of central tendency and dispersion', cognitiveTask: 'interpret', format: 'calc-mcq', calc: true },
  },
  economics:      { _cognitive: 'Interpret economic relationships', concepts: { objective: 'Interpret supply/demand, elasticity, and market structures', cognitiveTask: 'interpret', format: 'mcq' } },
  fsa:            { _cognitive: 'Analyze financial statements', concepts: { objective: 'Analyze statement relationships and common ratios', cognitiveTask: 'analyze', format: 'mcq' } },
  corpFinance:    { _cognitive: 'Apply corporate finance concepts', concepts: { objective: 'Evaluate capital budgeting and cost of capital concepts', cognitiveTask: 'evaluate', format: 'mcq' } },
  equity:         { _cognitive: 'Value and analyze equities', concepts: { objective: 'Apply equity valuation and market organization concepts', cognitiveTask: 'apply', format: 'mcq' } },
  fixedIncome:    { _cognitive: 'Analyze fixed-income instruments', concepts: { objective: 'Interpret bond pricing, yields, and risk measures', cognitiveTask: 'interpret', format: 'mcq' } },
  derivatives:    { _cognitive: 'Understand derivatives', concepts: { objective: 'Describe forwards/futures/options/swaps and pricing basics', cognitiveTask: 'describe', format: 'mcq' } },
  altInvestments: { _cognitive: 'Understand alternative investments', concepts: { objective: 'Describe real assets, private capital, and hedge fund basics', cognitiveTask: 'describe', format: 'mcq' } },
  portfolio:      { _cognitive: 'Apply portfolio construction', concepts: { objective: 'Apply risk/return, diversification, and IPS concepts', cognitiveTask: 'apply', format: 'mcq' } },
};

// CFA Program official command-word taxonomy (LOS verbs). Fact list — used to keep
// generated objectives aligned to how the exam frames tasks. ("Discuss" is L3 only.)
export const COMMAND_WORDS = Object.freeze([
  'Analyze', 'Calculate', 'Compare', 'Contrast', 'Define', 'Demonstrate', 'Describe',
  'Determine', 'Estimate', 'Evaluate', 'Explain', 'Formulate', 'Identify', 'Interpret',
  'Justify', 'Recommend',
]);

// Governed provenance stamp for a generated CFA item.
export function provenanceFor(topic, subskill) {
  const t = TOPICS[topic];
  const sk = SUBSKILL_BLUEPRINT[topic]?.[subskill];
  return {
    certId: CERT_ID,
    blueprintSource: BLUEPRINT_SOURCE,
    topic,
    topicLabel: t ? t.label : null,
    weightRange: t ? `${t.min}-${t.max}%` : null,
    objective: sk?.objective || SUBSKILL_BLUEPRINT[topic]?._cognitive || null,
    cognitiveTask: sk?.cognitiveTask || null,
    calculatorAllowed: t ? !!t.calc : CALCULATOR_ALLOWED,
    origin: 'uale-original',   // aligned to LOS/structure; never copied
    derivedFrom: 'blueprint',  // grounded in the official structure, not official items
  };
}
