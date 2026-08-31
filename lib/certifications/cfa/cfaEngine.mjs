// ============================================================================
// cfaEngine.mjs — CFA Level I question generation, diagnostic, and readiness.
// ----------------------------------------------------------------------------
// Wires the CFA content generators into the governed blueprint and REUSES the
// shared, cert-agnostic metrics engine (lib/metrics.mjs) for mastery/evidence.
// Readiness is evidence-based AND weighted by the OFFICIAL topic weights.
//
// Sprint 2 ships two flagship, deliberately DIFFERENT cognitive demands at quality:
//   • Quant/TVM  — calculation with programmatically-verified keys + misconception
//                  diagnosis (see ./tvm.mjs).
//   • Ethics     — original scenario application against the Code & Standards.
// The blueprint defines all ten topics; the governed question bank expands
// incrementally (quality over volume) without any structural change.
// ============================================================================
import { analyzeSkills, EVIDENCE, WEAK_THRESHOLD, STRONG_THRESHOLD } from '../../metrics.mjs';
import { metricsRegistryFor } from '../../certRegistry.mjs';
import { officialWeights, TOPICS, TOPIC_ORDER, provenanceFor, CERT_ID } from './cfaBlueprint.mjs';
import { TVM_GENERATORS } from './tvm.mjs';
import { generateEthicsItem } from './ethics.mjs';
import { TOPIC_GENERATORS } from './topicGenerators.mjs';
import { recurringMisconceptions } from './misconceptions.mjs';

// Learner-facing misconception dictionary: internal key -> { topic, phrase }. Keeps
// engine/diagnostic IDs out of the UI — only these plain phrases are shown.
export const CFA_MISCONCEPTION_INFO = {
  'present-vs-future-value': { topic: 'quant', phrase: 'reversing present vs. future value (compounding vs. discounting direction)' },
  'compounding': { topic: 'quant', phrase: 'using simple interest instead of compounding' },
  'rate-conversion': { topic: 'quant', phrase: 'confusing nominal and effective/periodic rates' },
  'periods': { topic: 'quant', phrase: 'miscounting the number of compounding periods' },
  'cash-flow-timing': { topic: 'quant', phrase: 'confusing ordinary annuities with annuities due' },
  'arithmetic': { topic: 'quant', phrase: 'calculation slips under time pressure' },
  'bond-price-yield-inverse': { topic: 'fixedIncome', phrase: 'reversing the relationship between bond prices and yields' },
};

// topic:subskill -> generator(rng). Quant/TVM and Ethics ship at depth; the eight
// other topics have a representative foundational generator each (topicGenerators).
// All ten official topics are now generatable; the diagnostic reports coverage honestly.
export const CFA_GENERATORS = {
  'quant:tvm': (rng) => rotate(rng, [TVM_GENERATORS.singleSumFV, TVM_GENERATORS.singleSumPV, TVM_GENERATORS.annuityPV])(rng),
  'quant:rates': (rng) => TVM_GENERATORS.effectiveAnnualRate(rng),
  'ethics:standardsApplication': (rng) => generateEthicsItem(rng),
  'ethics:independenceObjectivity': (rng) => generateEthicsItem(rng),
  'ethics:mnpi': (rng) => generateEthicsItem(rng),
  'ethics:conflicts': (rng) => generateEthicsItem(rng),
  ...TOPIC_GENERATORS, // economics/fsa/corpFinance/equity/fixedIncome/derivatives/altInvestments/portfolio :concepts
};

function rotate(rng, fns) { return fns[Math.floor(rng() * fns.length)]; }

export function hasGenerator(topic, subskill) {
  return typeof CFA_GENERATORS[`${topic}:${subskill}`] === 'function';
}

// Generate one CFA item, stamped with governed provenance. Returns null if the cell
// has no generator yet (caller decides how to surface "coming soon" honestly).
export function generateCfaItem({ topic, subskill, rng }) {
  const gen = CFA_GENERATORS[`${topic}:${subskill}`];
  if (!gen) return null;
  const q = gen(rng);
  return {
    certId: CERT_ID,
    topic,
    subskill,
    prompt: q.prompt,
    options: q.options,
    correct: q.correct,
    explanation: q.explanation,
    meta: { ...(q.meta || {}), concept: q.concept, provenance: provenanceFor(topic, subskill) },
  };
}

// The generatable coverage cells (topic/subskill pairs that have a generator today).
export function generatableCells() {
  return Object.keys(CFA_GENERATORS).map((k) => { const [topic, subskill] = k.split(':'); return { topic, subskill }; });
}

// Build a diagnostic that samples across the OFFICIAL topic blueprint. It samples
// every generatable cell (so the sample spans topics), and honestly reports which
// official topics are NOT yet generatable rather than pretending full coverage.
export function buildCfaDiagnostic(rng, { perCell = 2 } = {}) {
  const cells = generatableCells();
  const plan = [];
  for (const c of cells) for (let i = 0; i < perCell; i++) plan.push({ ...c });
  // Deterministic interleave so topics mix.
  for (let i = plan.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [plan[i], plan[j]] = [plan[j], plan[i]]; }
  const coveredTopics = [...new Set(cells.map((c) => c.topic))];
  const pendingTopics = TOPIC_ORDER.filter((t) => !coveredTopics.includes(t));
  return { plan, coveredTopics, pendingTopics };
}

// Evidence-based, topic-weight-aware readiness for CFA. NOT a prediction of CFA
// Institute's passing score — it is UALE's demonstrated-mastery estimate weighted by
// the official topic weights, and it is WITHHELD until enough topics are evaluated.
//   domains: the learner state ({ topicKey: { subskillKey: skillState } }).
// Returns { score(0-100)|null, band, evaluatedTopics, perTopic, label }.
export const READINESS_MIN_TOPICS = 3;
export function cfaReadiness(domains) {
  const registry = metricsRegistryFor(CERT_ID);
  const analysis = analyzeSkills(domains || {}, registry);
  const weights = officialWeights();
  // Aggregate evaluated subskills to per-topic mastery.
  const byTopic = {};
  for (const c of analysis) {
    if (c.evidenceState !== EVIDENCE.EVALUATED) continue;
    (byTopic[c.domain] = byTopic[c.domain] || []).push(c.mastery);
  }
  const perTopic = {};
  let wSum = 0, acc = 0;
  for (const t of TOPIC_ORDER) {
    const arr = byTopic[t];
    if (!arr || !arr.length) { perTopic[t] = { evaluated: false, mastery: null }; continue; }
    const m = arr.reduce((a, b) => a + b, 0) / arr.length;
    perTopic[t] = { evaluated: true, mastery: m };
    wSum += weights[t];
    acc += weights[t] * m;
  }
  const evaluatedTopics = Object.values(perTopic).filter((x) => x.evaluated).length;
  if (evaluatedTopics < READINESS_MIN_TOPICS || wSum === 0) {
    return { score: null, band: 'building', evaluatedTopics, perTopic,
      label: `Building your baseline — practice at least ${READINESS_MIN_TOPICS} topics for a readiness estimate.` };
  }
  const score = Math.round((acc / wSum) * 100);
  const band = score >= 75 ? 'on-track' : score >= 55 ? 'developing' : 'early';
  return { score, band, evaluatedTopics, perTopic,
    label: 'Demonstrated mastery weighted by official CFA topic weights (not a prediction of CFA Institute’s passing score).' };
}

// Interpret learner evidence into STRONG / FOCUS / DEVELOPING / NEED-MORE-EVIDENCE
// topic groups plus an evidence-derived next-best action. This is the learner-facing
// interpretation layer (UALE doesn't just compute intelligence — it explains it).
// Evidence-gated: a topic is classified ONLY from its EVALUATED subskills, so a
// single wrong answer never produces a "focus"/weak label. Distinct from readiness
// (a single overall %) — this is the topic-level breakdown. `misconceptions` is the
// cross-question memory; a recurring, evidence-backed pattern is attached to its topic.
export function cfaTopicAnalysis(domains, misconceptions) {
  const registry = metricsRegistryFor(CERT_ID);
  const analysis = analyzeSkills(domains || {}, registry);
  const byTopic = {};
  for (const c of analysis) {
    (byTopic[c.domain] = byTopic[c.domain] || { masteries: [] });
    if (c.evidenceState === EVIDENCE.EVALUATED) byTopic[c.domain].masteries.push(c.mastery);
  }
  const strong = [], focus = [], developing = [], needEvidence = [];
  for (const t of TOPIC_ORDER) {
    const arr = byTopic[t] && byTopic[t].masteries;
    if (!arr || !arr.length) { needEvidence.push(t); continue; }
    const m = arr.reduce((a, b) => a + b, 0) / arr.length;
    if (m >= STRONG_THRESHOLD) strong.push({ topic: t, mastery: m });
    else if (m < WEAK_THRESHOLD) focus.push({ topic: t, mastery: m });
    else developing.push({ topic: t, mastery: m });
  }
  strong.sort((a, b) => b.mastery - a.mastery);
  focus.sort((a, b) => a.mastery - b.mastery);
  developing.sort((a, b) => a.mastery - b.mastery);

  // Surface recurring, evidence-backed misconceptions; attach each to its topic.
  const patterns = recurringMisconceptions(misconceptions || {})
    .map((r) => ({ key: r.key, count: r.count, info: CFA_MISCONCEPTION_INFO[r.key] || null }))
    .filter((r) => r.info);
  for (const p of patterns) {
    const target = [...focus, ...developing].find((x) => x.topic === p.info.topic);
    if (target && !target.pattern) target.pattern = { phrase: p.info.phrase, count: p.count };
  }

  const hasEnoughEvidence = strong.length + focus.length + developing.length >= 1;
  let recommendation;
  if (!hasEnoughEvidence) {
    recommendation = { kind: 'diagnostic', text: 'We need a little more evidence to identify your strongest and weakest areas. A short diagnostic will get us started.' };
  } else if (focus.length) {
    const top = focus[0];
    const pat = top.pattern ? ` You appear to be ${top.pattern.phrase}.` : '';
    recommendation = { kind: 'practice-topic', topic: top.topic, text: `Focus next on ${TOPICS[top.topic].label}.${pat} Keep practicing it to build consistent understanding.` };
  } else if (developing.length) {
    const top = developing[0];
    recommendation = { kind: 'practice-topic', topic: top.topic, text: `You're developing in ${TOPICS[top.topic].label}. A little more practice should move it into your strengths.` };
  } else {
    recommendation = { kind: 'mixed', text: 'Strong across every evaluated topic — keep sharp with mixed practice, and gather evidence in the topics you haven’t tried yet.' };
  }
  return { hasEnoughEvidence, strong, focus, developing, needEvidence, patterns, recommendation };
}
