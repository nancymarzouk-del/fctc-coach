// cfa.test.mjs — CFA Level I blueprint, ethics, certification registry, and engine.
// Locks authoritative structure/weighting, original ethics scenarios, the reusable
// certification abstraction (FCTC + CFA both representable), and evidence-based,
// topic-weighted readiness. Calculation verification lives in cfa-tvm.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TOPICS, TOPIC_ORDER, EXAM, APPROVED_CALCULATORS, STANDARDS, COMMAND_WORDS,
  officialWeights, officialMockAllocation, provenanceFor, PROVENANCE_URLS, PRACTICE_LABEL,
} from '../lib/certifications/cfa/cfaBlueprint.mjs';
import { generateEthicsItem, STANDARD_LABELS, ETHICS_SCENARIO_COUNT } from '../lib/certifications/cfa/ethics.mjs';
import { getCertification, listCertifications, metricsRegistryFor, coverageCells } from '../lib/certRegistry.mjs';
import { generateCfaItem, hasGenerator, buildCfaDiagnostic, cfaReadiness } from '../lib/certifications/cfa/cfaEngine.mjs';

function lcg(seed = 1) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }
function sub(nCorrect, nWrong) {
  const history = [];
  for (let i = 0; i < nCorrect; i++) history.push({ c: true, d: 2 });
  for (let i = 0; i < nWrong; i++) history.push({ c: false, d: 2 });
  return { attempts: nCorrect + nWrong, correct: nCorrect, streak: 0, difficulty: 2, dueIn: 0, lastSeen: 0, history };
}

// ---- Blueprint: authoritative structure + weighting -----------------------------
test('ten official topics with weight ranges; weights normalize to 1', () => {
  assert.equal(TOPIC_ORDER.length, 10);
  for (const k of TOPIC_ORDER) {
    assert.ok(TOPICS[k].min > 0 && TOPICS[k].max >= TOPICS[k].min, `${k} needs a weight range`);
  }
  assert.equal(TOPICS.ethics.label, 'Ethical and Professional Standards');
  assert.equal(TOPICS.ethics.min, 10); assert.equal(TOPICS.ethics.max, 15);
  const w = officialWeights();
  assert.ok(Math.abs(TOPIC_ORDER.reduce((a, k) => a + w[k], 0) - 1) < 1e-9);
  assert.ok(PROVENANCE_URLS.length >= 3 && PROVENANCE_URLS.every((u) => u.startsWith('https://www.cfainstitute.org')));
});

test('mock allocation sums exactly to the requested total (official 180)', () => {
  const a180 = officialMockAllocation();
  assert.equal(Object.values(a180).reduce((x, y) => x + y, 0), 180);
  const a100 = officialMockAllocation(100);
  assert.equal(Object.values(a100).reduce((x, y) => x + y, 0), 100);
  // every topic represented
  for (const k of TOPIC_ORDER) assert.ok(a180[k] >= 1, `topic ${k} missing from mock`);
});

test('official exam facts and calculator policy', () => {
  assert.equal(EXAM.totalQuestions, 180);
  assert.equal(EXAM.sessions, 2);
  assert.equal(EXAM.minutesPerSession, 135);
  assert.equal(EXAM.answerChoices, 3);
  assert.equal(EXAM.itemSets, false);            // standalone at Level I
  assert.equal(EXAM.practicalSkillsModuleRequired, true);
  assert.equal(APPROVED_CALCULATORS.length, 2);  // BA II Plus + HP 12C
  assert.ok(/BA II Plus/.test(APPROVED_CALCULATORS[0]) && /12C/.test(APPROVED_CALCULATORS[1]));
  assert.ok(!COMMAND_WORDS.includes('Discuss'));  // Discuss is Level III only
});

test('provenance stamps official domain + weight range + originality', () => {
  const p = provenanceFor('quant', 'tvm');
  assert.equal(p.certId, 'cfa-level-1');
  assert.equal(p.topicLabel, 'Quantitative Methods');
  assert.equal(p.weightRange, '11-14%');
  assert.equal(p.origin, 'uale-original');
  assert.equal(p.derivedFrom, 'blueprint');
  assert.equal(p.calculatorAllowed, true);
  assert.equal(provenanceFor('ethics', 'mnpi').calculatorAllowed, false); // ethics = no calc
});

// ---- Ethics: original scenarios, application not memorization --------------------
test('the seven Standards with subparts are present', () => {
  for (const r of ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']) {
    assert.ok(STANDARDS[r] && STANDARDS[r].title && Object.keys(STANDARDS[r].subparts).length >= 2, `Standard ${r}`);
  }
  assert.equal(STANDARDS.I.subparts.E, 'Competence'); // current online structure includes I(E)
});

test('ethics items are 3-choice, map to a real Standard, and vary across seeds', () => {
  const seenStandards = new Set();
  for (let s = 0; s < 60; s++) {
    const q = generateEthicsItem(lcg(s + 1));
    assert.equal(q.options.length, 3, 'CFA uses three answer choices');
    assert.ok(q.correct >= 0 && q.correct < 3);
    assert.ok(q.explanation && q.explanation.length > 10);
    assert.ok(q.meta.standard && STANDARD_LABELS[q.meta.standard], 'maps to a real Standard');
    // the correct option is a valid Standard label
    assert.ok(Object.values(STANDARD_LABELS).includes(q.options[q.correct]));
    seenStandards.add(q.meta.standard);
  }
  assert.ok(seenStandards.size >= 4, 'scenarios must cover several distinct Standards (transfer)');
  assert.ok(ETHICS_SCENARIO_COUNT >= 6);
});

// ---- Certification registry: the reusable abstraction ---------------------------
test('registry represents BOTH FCTC and CFA (generalization proof)', () => {
  const ids = listCertifications().map((c) => c.id);
  assert.ok(ids.includes('fctc') && ids.includes('cfa-level-1'));
  assert.ok(getCertification('fctc') && getCertification('cfa-level-1'));
  // FCTC still representable in the new abstraction (regression-safe): 4 domains.
  const fctcReg = metricsRegistryFor('fctc');
  assert.equal(Object.keys(fctcReg).length, 4);
  // CFA: 10 topics, each with >=1 subskill in the metrics registry.
  const cfaReg = metricsRegistryFor('cfa-level-1');
  assert.equal(Object.keys(cfaReg).length, 10);
  for (const k of Object.keys(cfaReg)) assert.ok(Object.keys(cfaReg[k].subskills).length >= 1, `${k} has subskills`);
  assert.ok(coverageCells('cfa-level-1').length >= 10);
});

// ---- Engine: generation, diagnostic, readiness ----------------------------------
test('generateCfaItem produces provenance-stamped items for quant and ethics', () => {
  const rng = lcg(11);
  const tvm = generateCfaItem({ topic: 'quant', subskill: 'tvm', rng });
  assert.equal(tvm.certId, 'cfa-level-1');
  assert.equal(tvm.options.length, 3);
  assert.ok(tvm.correct >= 0 && tvm.correct < 3);
  assert.equal(tvm.meta.provenance.origin, 'uale-original');
  const eth = generateCfaItem({ topic: 'ethics', subskill: 'mnpi', rng });
  assert.equal(eth.meta.provenance.topicLabel, 'Ethical and Professional Standards');
  // Every official topic is now generatable (foundational coverage).
  const der = generateCfaItem({ topic: 'derivatives', subskill: 'concepts', rng });
  assert.ok(der && der.options.length === 3, 'derivatives now has a generator');
  assert.equal(hasGenerator('quant', 'tvm'), true);
  assert.equal(hasGenerator('derivatives', 'concepts'), true);
});

test('diagnostic samples across ALL ten official topics', () => {
  const { plan, coveredTopics, pendingTopics } = buildCfaDiagnostic(lcg(5), { perCell: 1 });
  assert.ok(plan.length >= 10);
  for (const t of TOPIC_ORDER) assert.ok(coveredTopics.includes(t), `diagnostic must cover ${t}`);
  assert.equal(pendingTopics.length, 0, 'all ten topics are now generatable');
  assert.equal(coveredTopics.length, TOPIC_ORDER.length);
});

test('readiness is withheld until >=3 topics evaluated, then evidence + weight based', () => {
  const twoTopics = { ethics: { standardsApplication: sub(6, 0) }, quant: { tvm: sub(6, 0) } };
  assert.equal(cfaReadiness(twoTopics).score, null, 'withheld with <3 evaluated topics');
  const threeTopics = { ethics: { standardsApplication: sub(6, 0) }, quant: { tvm: sub(6, 0) }, economics: { concepts: sub(6, 0) } };
  const r = cfaReadiness(threeTopics);
  assert.ok(typeof r.score === 'number' && r.score >= 0 && r.score <= 100);
  assert.ok(/not a prediction/i.test(r.label));
});

test('readiness is weighted by official topic weights (heavy weak topic hurts more)', () => {
  const strong = () => sub(6, 0);   // ~0.8 mastery
  const weak = () => sub(1, 6);     // ~0.2 mastery
  // A: ETHICS (weight 12.5) is the weak topic; B: ECONOMICS (weight 7.5) is the weak topic.
  const A = { ethics: { standardsApplication: weak() }, quant: { tvm: strong() }, economics: { concepts: strong() }, equity: { concepts: strong() } };
  const B = { ethics: { standardsApplication: strong() }, quant: { tvm: strong() }, economics: { concepts: weak() }, equity: { concepts: strong() } };
  const sA = cfaReadiness(A).score, sB = cfaReadiness(B).score;
  assert.ok(sA < sB, `a weak HEAVY topic should hurt readiness more (A=${sA} vs B=${sB})`);
});
