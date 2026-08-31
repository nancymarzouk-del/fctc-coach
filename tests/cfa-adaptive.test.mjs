// cfa-adaptive.test.mjs — anti-memorization + adaptive-teaching + transfer-mastery.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateCfaItem, generateVariedItem, generatableCells, cfaTopicAnalysis } from '../lib/certifications/cfa/cfaEngine.mjs';
import { TOPIC_ORDER } from '../lib/certifications/cfa/cfaBlueprint.mjs';
import { familyOf, CONCEPT_FAMILY, FAMILIES } from '../lib/certifications/cfa/families.mjs';
import { emptyCfaState, recordCfaAnswer } from '../lib/certifications/cfa/cfaStore.mjs';

function lcg(seed = 1) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }
function sub(nCorrect, nWrong) {
  const h = [];
  for (let i = 0; i < nCorrect; i++) h.push({ c: true, d: 2 });
  for (let i = 0; i < nWrong; i++) h.push({ c: false, d: 2 });
  return { attempts: nCorrect + nWrong, correct: nCorrect, streak: 0, difficulty: 2, dueIn: 0, lastSeen: 0, history: h };
}

// Every generated item is tagged with a mapped family (no untagged concepts leak).
test('every generated concept maps to a known family', () => {
  const seen = new Set();
  for (const cell of generatableCells()) {
    for (let s = 0; s < 40; s++) {
      const it = generateCfaItem({ topic: cell.topic, subskill: cell.subskill, rng: lcg(s + 1) });
      assert.ok(it.family, `${cell.topic}:${cell.subskill} item has a family`);
      assert.ok(Object.values(FAMILIES).includes(it.family), `family ${it.family} is in the taxonomy`);
      assert.equal(it.family, familyOf(it.concept));
      seen.add(it.concept);
    }
  }
  for (const c of seen) assert.ok(CONCEPT_FAMILY[c], `concept ${c} must be in CONCEPT_FAMILY`);
});

// ANTI-MEMORIZATION: every one of the ten topics can produce >=2 DISTINCT families,
// so no topic is a single memorizable structure (parameter changes don't count —
// these are different reasoning paths).
test('all ten topics can produce at least two distinct question families', () => {
  for (const t of TOPIC_ORDER) {
    const cells = generatableCells().filter((c) => c.topic === t);
    const fams = new Set();
    for (const c of cells) for (let s = 0; s < 60; s++) {
      fams.add(generateCfaItem({ topic: c.topic, subskill: c.subskill, rng: lcg(s * 7 + 3) }).family);
    }
    assert.ok(fams.size >= 2, `topic ${t} should offer >=2 families, got ${[...fams].join(',')}`);
  }
});

// Anti-repetition picker avoids a recently-seen concept when the cell has alternatives.
test('generateVariedItem avoids a recent concept when alternatives exist', () => {
  // quant:tvm has multiple concepts (calc variants + tvm-direction).
  const first = generateCfaItem({ topic: 'quant', subskill: 'tvm', rng: lcg(5) });
  let avoided = 0, tries = 0;
  for (let s = 0; s < 20; s++) {
    const it = generateVariedItem({ topic: 'quant', subskill: 'tvm', rng: lcg(s + 50), avoidConcepts: [first.concept] });
    tries++;
    if (it.concept !== first.concept) avoided++;
  }
  assert.ok(avoided >= tries * 0.7, 'should usually return a different concept than the avoided one');
  // A single-structure fallback still returns an item (altInvestments:concepts has 2, use a 1-mode cell if any — corpFinance now has 2; assert non-null generally).
  assert.ok(generateVariedItem({ topic: 'ethics', subskill: 'mnpi', rng: lcg(1), avoidConcepts: [] }));
});

// TRANSFER MASTERY: high mastery via a SINGLE family caps at Developing (needsTransfer);
// success across >=2 families is required for Strong.
test('mastery requires transfer across >=2 families', () => {
  const domains = { quant: { tvm: sub(12, 0) } }; // strong mastery numerically
  const oneFamily = { quant: { calculation: { correct: 6, total: 6 } } };
  const a1 = cfaTopicAnalysis(domains, {}, oneFamily);
  assert.ok(!a1.strong.some((x) => x.topic === 'quant'), 'one family should NOT be Strong');
  const dev = a1.developing.find((x) => x.topic === 'quant');
  assert.ok(dev && dev.needsTransfer, 'single-family high mastery is Developing/needsTransfer');

  const twoFamilies = { quant: { calculation: { correct: 5, total: 5 }, 'conceptual-interpretation': { correct: 3, total: 3 } } };
  const a2 = cfaTopicAnalysis(domains, {}, twoFamilies);
  assert.ok(a2.strong.some((x) => x.topic === 'quant'), 'two families + high mastery => Strong');
});

// Store: transfer evidence accumulates per family; recent concepts are tracked/capped.
test('recordCfaAnswer tracks transfer per family and recent concepts', () => {
  let st = emptyCfaState();
  st = recordCfaAnswer(st, { domain: 'quant', subskill: 'tvm', correct: true, difficulty: 2, family: 'calculation', concept: 'single-sum-fv' });
  st = recordCfaAnswer(st, { domain: 'quant', subskill: 'tvm', correct: true, difficulty: 2, family: 'conceptual-interpretation', concept: 'tvm-direction' });
  assert.equal(st.transfer.quant.calculation.correct, 1);
  assert.equal(st.transfer.quant['conceptual-interpretation'].correct, 1);
  assert.deepEqual(st.recentConcepts.slice(0, 2), ['tvm-direction', 'single-sum-fv']); // most-recent first
  // recentConcepts is capped.
  for (let i = 0; i < 20; i++) st = recordCfaAnswer(st, { domain: 'quant', subskill: 'tvm', correct: true, difficulty: 2, family: 'calculation', concept: 'c' + i });
  assert.ok(st.recentConcepts.length <= 12);
});

// The difficulty ladder is now LIVE (was dead): 3 correct in a row raises difficulty.
test('difficulty adapts upward on a success streak', () => {
  let st = emptyCfaState();
  for (let i = 0; i < 3; i++) st = recordCfaAnswer(st, { domain: 'quant', subskill: 'tvm', correct: true, difficulty: 2, family: 'calculation', concept: 'single-sum-fv' });
  assert.ok(st.domains.quant.tvm.difficulty > 2, 'difficulty should rise after a 3-streak');
});
