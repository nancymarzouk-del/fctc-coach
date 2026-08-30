// cfa-tvm.test.mjs — CFA Level I Time-Value-of-Money engine.
// Verifies formulas, PROGRAMMATIC answer keys (no AI-authored value trusted), and
// misconception-tagged distractors that power Alyce's diagnosis.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fvSingle, pvSingle, fvAnnuityOrdinary, pvAnnuityOrdinary, toAnnuityDue, ear,
  TVM_GENERATORS, diagnoseTvmAnswer, TVM_MISCONCEPTIONS,
} from '../lib/certifications/cfa/tvm.mjs';

function lcg(seed = 1) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }
const approx = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

test('core formulas are correct and internally consistent', () => {
  assert.ok(approx(fvSingle(1000, 0.05, 2), 1102.5));
  assert.ok(approx(pvSingle(fvSingle(1000, 0.05, 3), 0.05, 3), 1000)); // PV inverts FV
  assert.ok(approx(ear(0.10, 2), 0.1025));                              // 10% semiannual -> 10.25%
  assert.ok(approx(ear(0.12, 12), Math.pow(1.01, 12) - 1));
  // annuity due = ordinary × (1+i)
  const ord = pvAnnuityOrdinary(100, 0.06, 5);
  assert.ok(approx(toAnnuityDue(ord, 0.06), ord * 1.06));
  assert.ok(approx(fvAnnuityOrdinary(100, 0, 5), 500)); // zero-rate edge
});

test('every generated item has a PROGRAMMATICALLY verified correct answer', () => {
  const rng = lcg(42);
  for (const name of Object.keys(TVM_GENERATORS)) {
    for (let k = 0; k < 25; k++) {
      const q = TVM_GENERATORS[name](rng);
      assert.ok(q.options.length === 3, `${name}: must have 3 options (CFA A/B/C)`);
      assert.ok(q.correct >= 0 && q.correct < 3, `${name}: valid correct index`);
      // The displayed correct option must equal the independently recomputed value.
      const shown = q.options[q.correct].replace(/[$,%\s]/g, '');
      const verified = q.verify();
      const shownNum = parseFloat(shown);
      // money is 2dp; EAR verify is a fraction while option is a percent — normalize.
      const verifiedShown = name === 'effectiveAnnualRate' ? verified * 100 : verified;
      assert.ok(approx(shownNum, +verifiedShown.toFixed(2), 0.05), `${name}: shown key ${shownNum} != verified ${verifiedShown}`);
    }
  }
});

test('distractors carry named misconceptions; correct option has none', () => {
  const rng = lcg(7);
  for (const name of Object.keys(TVM_GENERATORS)) {
    const q = TVM_GENERATORS[name](rng);
    assert.equal(diagnoseTvmAnswer(q, q.correct), null, `${name}: correct pick has no misconception`);
    let tagged = 0;
    for (let i = 0; i < 3; i++) {
      if (i === q.correct) continue;
      const d = diagnoseTvmAnswer(q, i);
      if (d) { tagged++; assert.ok(d.misconception && d.note, `${name}: distractor ${i} needs misconception+note`); }
    }
    assert.ok(tagged >= 1, `${name}: at least one distractor must be diagnosable`);
  }
});

test('the direction misconception (PV vs FV) is exercised', () => {
  // singleSumFV includes a discounted-instead-of-compounded distractor.
  const rng = lcg(3);
  const q = TVM_GENERATORS.singleSumFV(rng);
  const kinds = q.meta.diagnostics.filter(Boolean).map((d) => d.misconception);
  assert.ok(kinds.includes(TVM_MISCONCEPTIONS.PV_FV_DIRECTION));
});
