// ============================================================================
// sieEngine.mjs — FINRA SIE item generation, diagnostic, and concept analysis.
// ----------------------------------------------------------------------------
// Wires the Sprint-2 slice generators into the governed blueprint and REUSES the
// shared, cert-agnostic metrics engine (lib/metrics.mjs). Analysis is per-subskill
// (concept-area) with transfer-gated mastery: an area is "Strong" only when it is
// evaluated-high AND the learner has succeeded across ≥2 question families.
// ============================================================================
import { analyzeSkills, EVIDENCE, WEAK_THRESHOLD, STRONG_THRESHOLD } from '../../metrics.mjs';
import { metricsRegistryFor } from '../../certRegistry.mjs';
import { TOPICS, provenanceFor, CERT_ID } from './sieBlueprint.mjs';
import { SIE_SLICE_GENERATORS } from './generators.mjs';
import { recurringMisconceptions } from '../../misconceptions.mjs';
import { familyOf, familyLabel } from './families.mjs';

// Learner-facing misconception dictionary: stable key -> { topic, subskill, phrase,
// remediation }. Keeps engine IDs out of the UI — only these plain phrases show.
export const SIE_MISCONCEPTION_INFO = {
  'sec-vs-finra-role':            { topic: 'capitalMarkets', subskill: 'regulators',        phrase: 'confusing the SEC (federal agency) with FINRA (an SRO it oversees)',                remediation: 'Anchor on: SEC = government; FINRA = industry SRO overseen by the SEC.' },
  'finra-vs-msrb-role':           { topic: 'capitalMarkets', subskill: 'regulators',        phrase: 'confusing FINRA’s and the MSRB’s responsibilities',                                 remediation: 'MSRB writes municipal-securities rules; FINRA writes BD rules and enforces MSRB rules for non-bank dealers.' },
  'primary-vs-secondary-market':  { topic: 'capitalMarkets', subskill: 'marketStructure',   phrase: 'reversing the primary and secondary markets',                                       remediation: 'Ask: does the ISSUER receive the proceeds? Yes = primary; no = secondary.' },
  'bond-price-yield-direction':   { topic: 'products',       subskill: 'debt',              phrase: 'reversing the inverse relationship between bond prices and yields/rates',            remediation: 'Rates up → existing bond prices down; rates down → prices up.' },
  'current-yield-vs-coupon':      { topic: 'products',       subskill: 'debt',              phrase: 'confusing the coupon rate with current yield/YTM',                                  remediation: 'Coupon uses PAR; current yield uses the market PRICE. At a discount, yields > coupon.' },
  'systematic-vs-nonsystematic':  { topic: 'products',       subskill: 'investmentRisks',   phrase: 'confusing systematic (market) risk with non-systematic (firm-specific) risk',       remediation: 'Systematic = market-wide, undiversifiable; non-systematic = firm-specific, diversifiable.' },
  'market-vs-limit-order':        { topic: 'trading',        subskill: 'orders',            phrase: 'confusing market orders (guarantee execution) with limit orders (guarantee price)', remediation: 'Market = speed/certainty of execution; limit = price control (may not fill).' },
  'mnpi-vs-public-info':          { topic: 'trading',        subskill: 'insiderTrading',    phrase: 'treating public information as nonpublic (or vice versa)',                          remediation: 'Once information is public, trading on it is allowed; MNPI must be material AND not yet public.' },
  'insider-trading-party-confusion': { topic: 'trading',    subskill: 'insiderTrading',    phrase: 'missing that tipping (and the tippee) are also liable for insider trading',         remediation: 'Trading on MNPI, tipping it, and trading on a tip are all prohibited.' },
  'manipulation-category-confusion': { topic: 'trading',    subskill: 'marketManipulation', phrase: 'mixing up manipulation categories (or calling legitimate trading manipulation)',   remediation: 'Manipulation = intent to deceive/fake activity (pump-and-dump, marking the close, front running). Good-faith trading is legitimate.' },
};

// Friendly concept-area labels for the slice subskills (the analytics UI).
export const AREA_LABELS = {
  'capitalMarkets:regulators':      'SEC vs FINRA vs MSRB',
  'capitalMarkets:marketStructure': 'Primary vs secondary market',
  'products:debt':                  'Bond price/yield & current yield',
  'products:investmentRisks':       'Systematic vs non-systematic risk',
  'trading:orders':                 'Market vs limit orders',
  'trading:insiderTrading':         'Insider trading / MNPI',
  'trading:marketManipulation':     'Market manipulation',
};
export function areaLabel(topic, subskill) { return AREA_LABELS[`${topic}:${subskill}`] || subskill; }

export const SIE_GENERATORS = { ...SIE_SLICE_GENERATORS };

export function hasGenerator(topic, subskill) {
  return typeof SIE_GENERATORS[`${topic}:${subskill}`] === 'function';
}

// Generate one SIE item, stamped with governed provenance + reasoning family.
export function generateSieItem({ topic, subskill, rng }) {
  const gen = SIE_GENERATORS[`${topic}:${subskill}`];
  if (!gen) return null;
  const q = gen(rng);
  return {
    certId: CERT_ID,
    topic,
    subskill,
    concept: q.concept,
    family: familyOf(q.concept),
    prompt: q.prompt,
    options: q.options,
    correct: q.correct,
    explanation: q.explanation,
    meta: { ...(q.meta || {}), concept: q.concept, family: familyOf(q.concept), provenance: provenanceFor(topic, subskill) },
  };
}

// Anti-repetition picker: generate for a cell while AVOIDING recently-seen concepts
// where the cell can produce alternatives. Deterministic given rng.
export function generateVariedItem({ topic, subskill, rng, avoidConcepts = [] }) {
  let last = null;
  for (let i = 0; i < 8; i++) {
    const item = generateSieItem({ topic, subskill, rng });
    if (!item) return null;
    last = item;
    if (!avoidConcepts.includes(item.concept)) return item;
  }
  return last;
}

// The generatable coverage cells (subskills with a generator today = the slice).
export function generatableCells() {
  return Object.keys(SIE_GENERATORS).map((k) => { const [topic, subskill] = k.split(':'); return { topic, subskill }; });
}

// A diagnostic sampling every generatable cell (spans the slice), interleaved.
export function buildSieDiagnostic(rng, { perCell = 1 } = {}) {
  const cells = generatableCells();
  const plan = [];
  for (const c of cells) for (let i = 0; i < perCell; i++) plan.push({ ...c });
  for (let i = plan.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [plan[i], plan[j]] = [plan[j], plan[i]]; }
  return { plan };
}

// Per-concept-area analysis: strong / focus / developing / need-more-evidence + an
// evidence-derived next-best action. Only the IMPLEMENTED slice subskills are
// considered (honest — untested areas aren't invented). Transfer-gated: an area is
// "Strong" only when evaluated-high AND ≥2 families passed in that area.
export function sieConceptAnalysis(domains, misconceptions, transfer = {}) {
  const registry = metricsRegistryFor(CERT_ID);
  const analysis = analyzeSkills(domains || {}, registry);
  const cells = generatableCells();
  const cellSet = new Set(cells.map((c) => `${c.topic}:${c.subskill}`));
  const byArea = {};
  for (const c of analysis) {
    const key = `${c.domain}:${c.subskill}`;
    if (!cellSet.has(key)) continue; // only the implemented slice
    byArea[key] = c;
  }
  const familiesPassed = (key) => {
    const fam = (transfer && transfer[key]) || {};
    return Object.keys(fam).filter((f) => (fam[f] && fam[f].correct) > 0).length;
  };

  const strong = [], focus = [], developing = [], needEvidence = [];
  for (const c of cells) {
    const key = `${c.topic}:${c.subskill}`;
    const row = byArea[key];
    const base = { topic: c.topic, subskill: c.subskill, label: areaLabel(c.topic, c.subskill), key,
      trend: row && row.trend && row.trend.trend !== 'na' ? row.trend.trend : null };
    if (!row || row.evidenceState !== EVIDENCE.EVALUATED) { needEvidence.push(base); continue; }
    const m = row.mastery;
    const nFam = familiesPassed(key);
    if (m >= STRONG_THRESHOLD && nFam >= 2) strong.push({ ...base, mastery: m, families: nFam });
    else if (m >= STRONG_THRESHOLD) developing.push({ ...base, mastery: m, needsTransfer: true });
    else if (m < WEAK_THRESHOLD) focus.push({ ...base, mastery: m });
    else developing.push({ ...base, mastery: m });
  }
  strong.sort((a, b) => b.mastery - a.mastery);
  focus.sort((a, b) => a.mastery - b.mastery);
  developing.sort((a, b) => a.mastery - b.mastery);

  // Attach recurring, evidence-backed misconceptions to their area (plain language).
  const patterns = recurringMisconceptions(misconceptions || {})
    .map((r) => ({ key: r.key, count: r.count, info: SIE_MISCONCEPTION_INFO[r.key] || null }))
    .filter((r) => r.info);
  for (const p of patterns) {
    const areaKey = `${p.info.topic}:${p.info.subskill}`;
    const target = [...focus, ...developing].find((x) => x.key === areaKey);
    if (target && !target.pattern) target.pattern = { phrase: p.info.phrase, remediation: p.info.remediation, count: p.count };
  }

  const hasEnoughEvidence = strong.length + focus.length + developing.length >= 1;
  let recommendation;
  if (!hasEnoughEvidence) {
    recommendation = { kind: 'diagnostic', text: 'We need a little more evidence to see your strengths and gaps. A short mixed set will get us started.' };
  } else if (focus.length) {
    const top = focus[0];
    const pat = top.pattern ? ` You appear to be ${top.pattern.phrase}.` : '';
    recommendation = { kind: 'practice-area', topic: top.topic, subskill: top.subskill, text: `Focus next on ${top.label}.${pat} Keep practicing to build consistent understanding.` };
  } else if (developing.length) {
    const top = developing[0];
    const note = top.needsTransfer
      ? ` You’re getting these right in one style — let’s confirm you can apply ${top.label} a different way before calling it mastered.`
      : ' A little more practice should move it into your strengths.';
    recommendation = { kind: 'practice-area', topic: top.topic, subskill: top.subskill, text: `You’re developing in ${top.label}.${note}` };
  } else {
    recommendation = { kind: 'mixed', text: 'Strong across every evaluated area — keep sharp with mixed practice, and start the areas you haven’t tried yet.' };
  }
  return { hasEnoughEvidence, strong, focus, developing, needEvidence, patterns, recommendation };
}
