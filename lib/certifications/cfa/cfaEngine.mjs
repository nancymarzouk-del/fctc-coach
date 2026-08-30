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
import { analyzeSkills, EVIDENCE, readiness as flatReadiness } from '../../metrics.mjs';
import { metricsRegistryFor } from '../../certRegistry.mjs';
import { officialWeights, TOPICS, TOPIC_ORDER, provenanceFor, CERT_ID } from './cfaBlueprint.mjs';
import { TVM_GENERATORS } from './tvm.mjs';
import { generateEthicsItem } from './ethics.mjs';

// topic:subskill -> generator(rng). Only cells with a quality generator are listed;
// coverage is honest (the diagnostic reports which topics are not yet generatable).
export const CFA_GENERATORS = {
  'quant:tvm': (rng) => rotate(rng, [TVM_GENERATORS.singleSumFV, TVM_GENERATORS.singleSumPV, TVM_GENERATORS.annuityPV])(rng),
  'quant:rates': (rng) => TVM_GENERATORS.effectiveAnnualRate(rng),
  'ethics:standardsApplication': (rng) => generateEthicsItem(rng),
  'ethics:independenceObjectivity': (rng) => generateEthicsItem(rng),
  'ethics:mnpi': (rng) => generateEthicsItem(rng),
  'ethics:conflicts': (rng) => generateEthicsItem(rng),
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
