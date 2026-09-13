// ============================================================================
// sieBlueprint.mjs — GOVERNED source of truth for the FINRA SIE exam.
// ----------------------------------------------------------------------------
// Grounded in the © 2025 FINRA SIE Examination Content Outline (see
// PROVENANCE_URLS). Mirrors the CFA/FCTC blueprint shape (domain -> weight ->
// subskill -> objective/cognitiveTask) so the SHARED cert-agnostic metrics engine
// (lib/metrics.mjs) and certRegistry consume it unchanged.
//
// COPYRIGHT / TRADEMARK: "FINRA" and "SIE" and "Securities Industry Essentials"
// are marks of FINRA. This module records FACTS ONLY (section names, official
// weights, scored-item counts, exam structure, and the published topic outline).
// No FINRA question content is reproduced. All UALE practice is ORIGINAL and framed
// as "FINRA SIE aligned practice" — never "official FINRA/SIE questions."
//
// Sprint 1 scope: this is the SEAM — the blueprint carries the full official topic/
// subskill STRUCTURE (so the bank can expand incrementally without structural
// change) but NO question content. Deep content lands in Sprint 2.
// ============================================================================

export const CERT_ID = 'finra-sie';
export const CERT_NAME = 'FINRA SIE';
export const BLUEPRINT_SOURCE = 'FINRA — © 2025 Securities Industry Essentials (SIE) Examination Content Outline (finra.org)';
export const PRACTICE_LABEL = 'FINRA SIE aligned practice'; // never "official FINRA/SIE questions"

export const PROVENANCE_URLS = Object.freeze([
  'https://www.finra.org/registration-exams-ce/qualification-exams/securities-industry-essentials-exam',
  'https://www.finra.org/sites/default/files/2025-10/SIE_Content_Outline.pdf',
]);

// ---- Official exam structure (verified facts, © 2025 outline) -------------------
export const EXAM = Object.freeze({
  scoredQuestions: 75,      // scored, multiple-choice
  pretestQuestions: 5,      // unscored, randomly distributed (NOT the old 10)
  totalPresented: 80,       // 75 scored + 5 pretest (NOT the old 85)
  minutes: 105,             // 1 hour 45 minutes
  answerChoices: 4,         // A, B, C, D — NOT CFA's 3
  itemSets: false,          // standalone items (no vignettes)
  negativeMarking: false,   // "no penalty for guessing"
  // Passing score is NOT printed in the content outline (scores are equated).
  // FINRA publishes the SIE passing score as 70% on its student page; confirm
  // before displaying it against any readiness line.
  passingScorePublished: 70,
});

export const CALCULATOR_ALLOWED = false; // candidates may not bring reference materials

// ---- Sections (called "topics" in the shared shape) + OFFICIAL allocation --------
// SIE publishes EXACT scored-item counts per section (not ranges), so weights are
// derived directly from `items / scoredQuestions`. Keys are stable app identifiers;
// labels are the official section names.
export const TOPICS = Object.freeze({
  capitalMarkets: { key: 'capitalMarkets', label: 'Knowledge of Capital Markets',                                          pct: 16, items: 12 },
  products:       { key: 'products',       label: 'Understanding Products and Their Risks',                                pct: 44, items: 33 },
  trading:        { key: 'trading',        label: 'Understanding Trading, Customer Accounts and Prohibited Activities',    pct: 31, items: 23 },
  regulatory:     { key: 'regulatory',     label: 'Overview of the Regulatory Framework',                                  pct: 9,  items: 7  },
});

export const TOPIC_ORDER = Object.freeze(['capitalMarkets', 'products', 'trading', 'regulatory']);

// Normalized fractional weights from the OFFICIAL scored-item counts (sum = 1.0).
export function officialWeights() {
  const total = TOPIC_ORDER.reduce((a, k) => a + TOPICS[k].items, 0); // = 75
  const w = {};
  for (const k of TOPIC_ORDER) w[k] = TOPICS[k].items / total;
  return w;
}

// Mock allocation: per-section counts summing EXACTLY to `total` (default = 75
// scored) via largest-remainder over the official weights. For total=75 this
// reproduces the exact official 12 / 33 / 23 / 7.
export function officialMockAllocation(total = EXAM.scoredQuestions) {
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

// ---- Subskill blueprint (official topic structure; objectives are ORIGINAL) -----
// Faithful to the © 2025 outline's numbered topics. Each subskill carries an
// original objective + primary cognitiveTask + intended item format so the bank can
// expand without structural change. No FINRA outline text is reproduced verbatim.
export const SUBSKILL_BLUEPRINT = {
  capitalMarkets: {
    _cognitive: 'Understand who regulates the markets, how markets are structured, and how offerings work',
    regulators:        { objective: 'Distinguish the roles/authority of the SEC, SROs (FINRA/MSRB/CBOE) and other agencies (Fed, Treasury/IRS, SIPC, FDIC, state)', cognitiveTask: 'comparison/rule-application', format: 'mcq' },
    marketParticipants:{ objective: 'Identify the role of each market participant (BDs, IAs, municipal advisors, issuers/underwriters, market makers, custodians, transfer agents, DTCC/OCC)', cognitiveTask: 'recall/identification', format: 'mcq' },
    marketStructure:   { objective: 'Classify a transaction across primary / secondary / third / fourth markets', cognitiveTask: 'conceptual/comparison', format: 'mcq' },
    economicFactors:   { objective: 'Interpret Fed monetary vs fiscal policy, rates, the business cycle and indicators, and effects on markets', cognitiveTask: 'interpret/market-mechanics', format: 'mcq' },
    offerings:         { objective: 'Apply offering concepts (public vs private, IPO/secondary/follow-on, firm-commitment vs best-efforts, offering docs, exemptions)', cognitiveTask: 'rule-application', format: 'mcq' },
  },
  products: {
    _cognitive: 'Understand each security product, how it works, and its characteristic risks',
    equity:            { objective: 'Compare common vs preferred (rights, liquidation order, voting, convertible) and rights/warrants/ADRs', cognitiveTask: 'comparison', format: 'mcq' },
    debt:              { objective: 'Apply debt concepts incl. the price–yield relationship, coupon/par/yield, ratings, callable/convertible, muni GO vs revenue', cognitiveTask: 'conceptual/calculation', format: 'mcq' },
    options:           { objective: 'Apply options basics (calls/puts, strike/premium/expiry, ITM/OTM, covered/uncovered, exercise/assignment, ODD/OCC)', cognitiveTask: 'conceptual/scenario', format: 'mcq' },
    packagedProducts:  { objective: 'Compare investment companies (open/closed-end, UITs, variable annuities); NAV, loads, share classes, breakpoints, ROA/LOI', cognitiveTask: 'comparison', format: 'mcq' },
    muniFundSecurities:{ objective: 'Describe municipal fund securities (529 plans, LGIPs, ABLE) and their tax treatment', cognitiveTask: 'recall/conceptual', format: 'mcq' },
    dpp:               { objective: 'Describe DPPs (LPs, TIC): pass-through taxation, illiquidity, unlisted', cognitiveTask: 'conceptual', format: 'mcq' },
    reits:             { objective: 'Describe REIT types (private / non-listed / listed) and their income/tax features', cognitiveTask: 'conceptual/comparison', format: 'mcq' },
    hedgeFunds:        { objective: 'Describe hedge fund structure, minimums, and illiquidity', cognitiveTask: 'recall/conceptual', format: 'mcq' },
    etp:               { objective: 'Distinguish ETFs vs ETNs and vs mutual funds (fees, active/passive, structure)', cognitiveTask: 'comparison', format: 'mcq' },
    investmentRisks:   { objective: 'Match risk type to product/scenario (systematic vs non-systematic, credit, interest-rate/reinvestment, liquidity, inflation, prepayment) and mitigation', cognitiveTask: 'product-risk-analysis', format: 'mcq' },
  },
  trading: {
    _cognitive: 'Understand trade mechanics, customer accounts/compliance, and prohibited conduct',
    orders:              { objective: 'Choose the correct order type/strategy for a stated goal (market, limit, stop, GTC, discretionary, solicited/unsolicited); principal vs agency', cognitiveTask: 'scenario-application', format: 'mcq' },
    returns:             { objective: 'Compute/interpret returns, dividend dates, and yields (current yield, YTM, YTC, total return, basis points)', cognitiveTask: 'calculation', format: 'mcq' },
    settlement:          { objective: 'Apply settlement rules (T+1, physical vs book-entry) and eligibility dates (ex-dividend/record)', cognitiveTask: 'calculation/market-mechanics', format: 'mcq' },
    corporateActions:    { objective: 'Determine the effect of corporate actions (splits/reverse, buybacks, tenders, rights offerings, M&A) on price/cost basis', cognitiveTask: 'consequence/prediction', format: 'mcq' },
    accountTypes:        { objective: 'Distinguish account types (cash, margin, options, discretionary, fee vs commission)', cognitiveTask: 'comparison', format: 'mcq' },
    accountRegistrations:{ objective: 'Identify the correct registration (individual, joint, trust, UTMA, corporate, partnership, IRA/qualified — RMDs, contributions)', cognitiveTask: 'rule-application', format: 'mcq' },
    aml:                 { objective: 'Recognize AML triggers and stages (SAR, CTR, FinCEN, OFAC/SDN; placement/layering/structuring)', cognitiveTask: 'rule-trigger-recognition', format: 'mcq' },
    booksRecordsPrivacy: { objective: 'Apply books/records retention and privacy rules (confirmations/statements, Reg S-P, BCP)', cognitiveTask: 'rule-application', format: 'mcq' },
    communications:      { objective: 'Apply communications, KYC and best-interest/suitability obligations (telemarketing/do-not-call, what is a recommendation)', cognitiveTask: 'rule-application/scenario', format: 'mcq' },
    marketManipulation:  { objective: 'Recognize prohibited market manipulation (pump-and-dump, front running, marking the close/open, freeriding, backing away)', cognitiveTask: 'prohibited-practice-recognition', format: 'mcq' },
    insiderTrading:      { objective: 'Apply insider-trading rules (MNPI, parties, penalties)', cognitiveTask: 'rule-application', format: 'mcq' },
    otherProhibited:     { objective: 'Recognize other prohibited activities (IPO restrictions, misuse of customer funds, borrowing from customers, senior exploitation, unregistered activity, falsifying records)', cognitiveTask: 'prohibited-practice-recognition', format: 'mcq' },
  },
  regulatory: {
    _cognitive: 'Understand registration/CE requirements and reportable employee conduct',
    registrationCE:  { objective: 'Apply SRO registration/qualification and CE rules (registered vs non-registered activities, statutory disqualification, fingerprinting, Firm/Regulatory Element)', cognitiveTask: 'rule-application', format: 'mcq' },
    employeeConduct: { objective: 'Apply Form U4/U5 requirements, customer-complaint handling, and red flags', cognitiveTask: 'rule-trigger-recognition', format: 'mcq' },
    reportableEvents:{ objective: 'Recognize reportable events (outside business activities, private securities transactions, political contributions, gifts/gratuities limits, felonies/liens/bankruptcy)', cognitiveTask: 'rule-trigger-recognition', format: 'mcq' },
  },
};

// provenanceFor — stamp for generated items (mirrors CFA's shape). Records the
// governed source; never claims official FINRA content.
export function provenanceFor(topic, subskill) {
  return Object.freeze({
    certId: CERT_ID,
    source: BLUEPRINT_SOURCE,
    url: PROVENANCE_URLS[1],
    label: PRACTICE_LABEL,
    topic: topic || null,
    subskill: subskill || null,
  });
}
