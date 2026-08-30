// ============================================================================
// blueprint.test.mjs — locks FCTC alignment to the official Cal-JAC blueprint.
// ----------------------------------------------------------------------------
// Regression tests for Sprint 1: the four official domains + weighting, the
// calculator-free policy, provenance on every item, the delayed-recall vs
// available-reference reading modes, and the mock distribution (which previously
// EXCLUDED recall entirely — the biggest driver of "doesn't feel representative").
//
// Pure logic is tested directly against the .mjs modules. The wiring that lives in
// .js/.jsx (only bundled by Next, not importable by `node --test`) is locked with
// source-contract assertions, mirroring the app's existing test style.
// ============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  OFFICIAL_TOTAL, OFFICIAL_EXAM_SECONDS, CALCULATOR_ALLOWED,
  DOMAINS, DOMAIN_ORDER, officialMockAllocation, officialWeights,
  SUBSKILL_BLUEPRINT, provenanceFor, presentReading, READING_MODES, BLUEPRINT_SOURCE,
} from '../lib/fctcBlueprint.mjs';
import { mockBlueprint } from '../lib/metrics.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

// Small deterministic rng (allocation counts don't depend on it; it only shuffles).
function lcg(seed = 1) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }

// The subskill key lists, mirroring lib/questionEngine.js SUBSKILLS (counts don't
// depend on how many subskills, only that each domain has >=1).
const DOMAIN_SUBSKILLS = {
  recall: ['observation', 'sequence', 'personnel', 'equipment', 'directional', 'dispatch'],
  mechanical: ['levers', 'pulleys', 'gears', 'belts', 'hydraulics', 'balance', 'inclinedPlane', 'forceMotion'],
  math: ['fractions', 'ratios', 'percentages', 'unitConversion', 'timeDistance', 'areaVolume', 'wordProblem'],
  reading: ['sop', 'equipment', 'incidentReport', 'safety'],
};

// ---- 1. Four official domains + correct target weighting metadata ----------------
test('four official domains exist with official codes/labels/weighting', () => {
  assert.deepEqual(DOMAIN_ORDER, ['recall', 'mechanical', 'math', 'reading']);
  assert.equal(DOMAINS.recall.code, 'A');
  assert.equal(DOMAINS.mechanical.code, 'B');
  assert.equal(DOMAINS.math.code, 'C');
  assert.equal(DOMAINS.reading.code, 'D');
  assert.equal(DOMAINS.recall.label, 'Verbal & Visual Information');
  assert.equal(DOMAINS.reading.label, 'Technical Written Materials'); // the largest domain
  const alloc = officialMockAllocation();
  assert.deepEqual(alloc, { recall: 20, mechanical: 25, math: 20, reading: 35 });
  assert.equal(alloc.recall + alloc.mechanical + alloc.math + alloc.reading, OFFICIAL_TOTAL);
  // official weights are fractions that sum to 1.0
  const w = officialWeights();
  assert.ok(Math.abs(w.recall + w.mechanical + w.math + w.reading - 1) < 1e-9);
});

// ---- 2. Mock distribution matches the official weighting AND includes recall -----
test('mock plan is exactly 20/25/20/35 and INCLUDES recall (regression: was 0)', () => {
  const plan = mockBlueprint(DOMAIN_SUBSKILLS, { total: 100, rng: lcg(7), weights: officialWeights() });
  assert.equal(plan.length, 100);
  const by = plan.reduce((m, p) => ((m[p.domain] = (m[p.domain] || 0) + 1), m), {});
  assert.deepEqual(by, { recall: 20, mechanical: 25, math: 20, reading: 35 });
  assert.ok(by.recall === 20, 'recall must be represented in the mock, not excluded');
  // every subskill of every domain appears; difficulties in range; deterministic.
  for (const [d, subs] of Object.entries(DOMAIN_SUBSKILLS)) {
    for (const s of subs) assert.ok(plan.some((p) => p.domain === d && p.subskill === s), `missing ${d}/${s}`);
  }
  assert.ok(plan.every((p) => p.difficulty >= 1 && p.difficulty <= 5));
  assert.ok(new Set(plan.slice(0, 12).map((p) => p.domain)).size > 1, 'exam must be mixed, not domain-blocked');
  assert.deepEqual(plan, mockBlueprint(DOMAIN_SUBSKILLS, { total: 100, rng: lcg(7), weights: officialWeights() }));
});

// ---- 3. Calculator-free policy (FCTC never allows calculators) -------------------
test('calculator-free policy is encoded everywhere', () => {
  assert.equal(CALCULATOR_ALLOWED, false);
  for (const d of Object.values(DOMAINS)) assert.equal(d.calculator, false);
  assert.equal(provenanceFor('math', 'percentages').calculatorAllowed, false);
});

// ---- 4. Provenance stamped with governed metadata -------------------------------
test('provenanceFor returns full governed metadata (auditable, original-not-copied)', () => {
  const p = provenanceFor('mechanical', 'gears');
  assert.equal(p.blueprintSource, BLUEPRINT_SOURCE);
  assert.equal(p.officialDomain, 'B');
  assert.equal(p.officialDomainLabel, 'Mechanical Reasoning');
  assert.ok(p.objective && /gear/i.test(p.objective));
  assert.ok(p.cognitiveTask);
  assert.equal(p.origin, 'uale-original');    // generated, aligned
  assert.equal(p.derivedFrom, 'concept');     // grounded in concepts, never copied items
  assert.equal(p.calculatorAllowed, false);
  // works for every domain/subskill in the blueprint
  for (const [d, subs] of Object.entries(SUBSKILL_BLUEPRINT)) {
    for (const s of Object.keys(subs)) {
      if (s.startsWith('_')) continue;
      const pr = provenanceFor(d, s);
      assert.ok(pr.officialDomain && pr.objective, `provenance incomplete for ${d}/${s}`);
    }
  }
});

// ---- 5. Delayed recall: source becomes UNAVAILABLE before answering --------------
test('delayed reading mode removes the source before the answer step', () => {
  const item = { prompt: 'Q?', passage: 'ESSAY TEXT', options: ['a', 'b', 'c', 'd'], correct: 1 };
  const delayed = presentReading(item, READING_MODES.DELAYED);
  assert.equal(delayed.mode, 'delayed');
  assert.equal(delayed.study.passage, 'ESSAY TEXT');  // shown during study
  assert.equal(delayed.quiz.passage, null);           // REMOVED before answering (recall from memory)
  assert.equal(delayed.quiz.prompt, 'Q?');
});

// ---- 6. Available-reference: source stays accessible while answering -------------
test('available reading mode keeps the source with the question', () => {
  const item = { prompt: 'Q?', passage: 'ESSAY TEXT', options: ['a', 'b'], correct: 0 };
  const avail = presentReading(item, READING_MODES.AVAILABLE);
  assert.equal(avail.mode, 'available');
  assert.equal(avail.quiz.passage, 'ESSAY TEXT');     // source visible
  assert.equal(avail.study, null);
});

// ---- 7. The two reading modes are tracked separately in the blueprint -----------
test('reading blueprint marks available-reference; recall blueprint marks delayed', () => {
  for (const s of ['sop', 'equipment', 'incidentReport', 'safety']) {
    assert.equal(SUBSKILL_BLUEPRINT.reading[s].mode, READING_MODES.AVAILABLE, `${s} should be available-reference`);
  }
  for (const s of Object.keys(SUBSKILL_BLUEPRINT.recall)) {
    if (s.startsWith('_')) continue;
    assert.equal(SUBSKILL_BLUEPRINT.recall[s].delayed, true, `recall/${s} should be delayed (study then hide)`);
  }
});

// ---- 8. No unwarranted firefighter trivia: answerable from shown/studied material -
test('reading/recall are answerable from shown material; math/mechanical are self-contained', () => {
  // Reading = passage-based; recall = study-then-recall. Neither requires outside
  // firefighter knowledge — the needed information is in the shown/studied material.
  for (const s of Object.keys(SUBSKILL_BLUEPRINT.reading)) {
    if (s.startsWith('_')) continue;
    assert.equal(SUBSKILL_BLUEPRINT.reading[s].format, 'passage-mcq');
  }
  for (const s of Object.keys(SUBSKILL_BLUEPRINT.recall)) {
    if (s.startsWith('_')) continue;
    assert.equal(SUBSKILL_BLUEPRINT.recall[s].format, 'study-then-recall');
  }
  // Mechanical visual subskills declare a diagram requirement (answerable from the picture).
  for (const s of ['levers', 'pulleys', 'gears', 'belts', 'hydraulics', 'balance']) {
    assert.equal(SUBSKILL_BLUEPRINT.mechanical[s].visual, true, `${s} must be diagram-based`);
  }
});

// ---- 9. Official 2-hour clock ---------------------------------------------------
test('official exam clock is 2 hours', () => {
  assert.equal(OFFICIAL_EXAM_SECONDS, 120 * 60);
});

// ---- 10. Wiring contracts in the .js/.jsx that node --test cannot import ---------
test('questionEngine stamps provenance and uses the official domain labels', () => {
  const src = read('lib/questionEngine.js');
  assert.match(src, /provenance: provenanceFor\(domain, sk\)/);
  assert.match(src, /label: 'Technical Written Materials'/);
  assert.match(src, /label: 'Verbal & Visual Information'/);
  assert.match(src, /label: 'Mathematical Problems'/);
});

test('buildMockPlan includes recall and uses the official weighting', () => {
  const src = read('lib/learningEngine.js');
  assert.ok(!/if \(dKey === 'recall'\) continue/.test(src), 'recall must no longer be excluded from the mock');
  assert.match(src, /weights: officialWeights\(\)/);
});

test('MockExam uses the official 2-hour clock and includes recall in the breakdown', () => {
  const src = read('components/MockExam.jsx');
  assert.match(src, /EXAM_SECONDS = OFFICIAL_EXAM_SECONDS/);
  assert.match(src, /domOrder = \['recall', 'mechanical', 'math', 'reading'\]/);
  assert.ok(!/not official FCTC section weighting/.test(src), 'stale disclaimer must be removed');
});
