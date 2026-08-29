// ============================================================================
// tests/math.test.mjs — math questions carry correct answers AND diagnostic
// distractors. Run: `node --test tests/math.test.mjs`.
// ============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../lib/mechanicalVisuals.mjs';
import { MATH_DIAGNOSIS_BUILDERS, diagnoseMathAnswer } from '../lib/mathDiagnosis.mjs';

const KEYS = Object.keys(MATH_DIAGNOSIS_BUILDERS);

test('every generated math item is well-formed with a valid correct answer', () => {
  for (const key of KEYS) {
    for (let seed = 1; seed <= 80; seed++) {
      const it = MATH_DIAGNOSIS_BUILDERS[key](makeRng(seed), 3);
      assert.equal(it.options.length, 4, `${key}: 4 options`);
      assert.ok(it.correct >= 0 && it.correct < 4, `${key}: correct in range`);
      assert.equal(new Set(it.options).size, 4, `${key}: distinct options`);
      assert.ok(it.meta && it.meta.diagnostics, `${key}: has diagnostics map`);
      // at least one wrong option is diagnostic (tagged)
      assert.ok(Object.keys(it.meta.diagnostics).length >= 1, `${key}: at least one tagged distractor`);
      // the correct option is NOT tagged as an error
      assert.equal(it.meta.diagnostics[it.options[it.correct]], undefined, `${key}: correct not tagged`);
    }
  }
});

test('diagnoseMathAnswer returns a "Likely issue" hypothesis for a tagged wrong pick', () => {
  const it = MATH_DIAGNOSIS_BUILDERS.percentages(makeRng(3), 3);
  const wrong = it.options.find((o, i) => i !== it.correct && it.meta.diagnostics[o]);
  const d = diagnoseMathAnswer(it.meta, wrong);
  assert.ok(d && /likely issue/i.test(d), 'diagnosis must be hedged as a hypothesis');
  // correct pick yields no diagnosis
  assert.equal(diagnoseMathAnswer(it.meta, it.options[it.correct]), null);
});

test('percentage decimal-conversion misconception is represented', () => {
  // pct*base (whole-number percent) should appear as a tagged distractor somewhere.
  let found = false;
  for (let seed = 1; seed <= 40 && !found; seed++) {
    const it = MATH_DIAGNOSIS_BUILDERS.percentages(makeRng(seed), 2);
    if (Object.values(it.meta.diagnostics).some((t) => /whole number|decimal/i.test(t))) found = true;
  }
  assert.ok(found, 'decimal-conversion diagnosis should be generated');
});

test('math builders are deterministic per seed', () => {
  for (const key of KEYS) {
    assert.deepEqual(MATH_DIAGNOSIS_BUILDERS[key](makeRng(9), 3), MATH_DIAGNOSIS_BUILDERS[key](makeRng(9), 3));
  }
});
