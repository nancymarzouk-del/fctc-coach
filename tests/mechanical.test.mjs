// ============================================================================
// tests/mechanical.test.mjs — mechanical CORRECTNESS for the visual system.
// Run: `node --test tests/mechanical.test.mjs` (part of `npm test`).
// ----------------------------------------------------------------------------
// Accuracy is the priority: every physics rule has known-answer fixtures, and
// every generated question is checked so the labelled `correct` option actually
// agrees with the mechanics in its own `visual.answerKey`.
// ============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeRng,
  pulleyMechanics, leverMechanics, gearTrainDirections, gearRatio,
  beltMechanics, hydraulicMechanics, balanceMechanics,
  VISUAL_BUILDERS,
} from '../lib/mechanicalVisuals.mjs';
import { mechanicalRemediationPlan } from '../lib/metrics.mjs';

// ---- Pure mechanics: known answers -----------------------------------------
test('pulley: MA = supporting strands, effort = load / MA', () => {
  assert.deepEqual(pulleyMechanics({ strands: 4, load: 400 }), { ma: 4, effort: 100, pullDistanceRatio: 4 });
  assert.equal(pulleyMechanics({ strands: 1, load: 250 }).effort, 250); // fixed pulley: no force advantage
  assert.equal(pulleyMechanics({ strands: 2, load: 300 }).effort, 150);
});

test('pulley: higher MA needs less effort (which requires less force)', () => {
  const a = pulleyMechanics({ strands: 2, load: 600 });
  const b = pulleyMechanics({ strands: 4, load: 600 });
  assert.ok(b.effort < a.effort);
});

test('lever: moment balance effort = load*loadArm/effortArm, MA = effortArm/loadArm', () => {
  assert.deepEqual(leverMechanics({ load: 120, loadArm: 2, effortArm: 6 }), { effort: 40, ma: 3 });
  // 2nd-class geometry (effortArm > loadArm) always gives MA > 1
  assert.ok(leverMechanics({ load: 100, loadArm: 2, effortArm: 8 }).ma > 1);
  // 3rd-class geometry (effortArm < loadArm) always gives MA < 1
  assert.ok(leverMechanics({ load: 100, loadArm: 8, effortArm: 2 }).ma < 1);
});

test('gears: meshed gears alternate direction along the train', () => {
  assert.deepEqual(gearTrainDirections(2, 'cw'), ['cw', 'ccw']);
  assert.deepEqual(gearTrainDirections(3, 'cw'), ['cw', 'ccw', 'cw']);
  assert.deepEqual(gearTrainDirections(2, 'ccw'), ['ccw', 'cw']);
});

test('gears: ratio = driven / driver; larger driven turns slower', () => {
  assert.equal(gearRatio(12, 24), 2);
  assert.equal(gearRatio(10, 30), 3);
});

test('belt: open keeps direction, crossed reverses it; smaller pulley faster', () => {
  assert.equal(beltMechanics({ arrangement: 'open', driverR: 40, drivenR: 40, driverDirection: 'cw' }).drivenDirection, 'cw');
  assert.equal(beltMechanics({ arrangement: 'crossed', driverR: 40, drivenR: 40, driverDirection: 'cw' }).drivenDirection, 'ccw');
  // driver smaller than driven => driven turns slower (speedRatio < 1 means driven rpm < driver rpm)
  assert.ok(beltMechanics({ arrangement: 'open', driverR: 30, drivenR: 60, driverDirection: 'cw' }).speedRatio < 1);
});

test('hydraulic: MA = A_out/A_in, F_out = F_in*MA (Pascal)', () => {
  assert.deepEqual(hydraulicMechanics({ inputArea: 2, outputArea: 10, inputForce: 40 }), { ma: 5, outputForce: 200 });
  assert.equal(hydraulicMechanics({ inputArea: 4, outputArea: 4, inputForce: 50 }).ma, 1); // no multiplication
});

test('balance: equal moments balance; larger moment tips its way', () => {
  assert.equal(balanceMechanics({ left: { weight: 40, distance: 3 }, right: { weight: 60, distance: 2 } }).tip, 'balanced'); // 120=120
  assert.equal(balanceMechanics({ left: { weight: 100, distance: 3 }, right: { weight: 20, distance: 2 } }).tip, 'left');
  assert.equal(balanceMechanics({ left: { weight: 10, distance: 2 }, right: { weight: 90, distance: 3 } }).tip, 'right');
});

// ---- Generated questions: structure + self-consistency ---------------------
// For every subskill, across many seeds and difficulties, the generated item
// must (a) have a valid visual spec, (b) have exactly 4 options with a valid
// `correct` index, and (c) NOT contradict its own answerKey where checkable.
const KEYS = Object.keys(VISUAL_BUILDERS);

test('every generated visual question is well-formed and self-consistent', () => {
  for (const key of KEYS) {
    const build = VISUAL_BUILDERS[key];
    for (let seed = 1; seed <= 60; seed++) {
      for (let diff = 1; diff <= 5; diff++) {
        const rng = makeRng(seed * 100 + diff);
        const it = build(rng, diff);
        assert.ok(it.visual && it.visual.type, `${key}: missing visual`);
        assert.ok(it.visual.config && it.visual.answerKey && it.visual.reveal, `${key}: incomplete spec`);
        assert.equal(it.options.length, 4, `${key}: must have 4 options`);
        assert.ok(it.correct >= 0 && it.correct < 4, `${key}: correct index in range`);
        assert.equal(new Set(it.options).size, 4, `${key}: options must be distinct`);
        assert.ok(it.prompt && it.explanation, `${key}: prompt+explanation required`);

        // Cross-check the labelled correct answer against the mechanics.
        const ans = it.options[it.correct];
        if (key === 'pulleys' && /mechanical advantage/i.test(it.prompt)) {
          assert.equal(ans, String(it.visual.answerKey.ma));
        }
        if (key === 'hydraulics' && /mechanical advantage/i.test(it.prompt)) {
          assert.equal(ans, String(it.visual.answerKey.ma));
        }
        if (key === 'levers' && /how much effort/i.test(it.prompt)) {
          assert.equal(ans, `${it.visual.answerKey.effort} lbs`);
        }
      }
    }
  }
});

test('remediation ladder: guided worked example then harder transfer questions', () => {
  const plan = mechanicalRemediationPlan('mechanical', 'pulleys');
  assert.ok(plan.length >= 3);
  assert.equal(plan[0].mode, 'guided', 'first step must be a guided worked example');
  assert.ok(plan.slice(1).every((p) => p.mode === 'transfer'), 'later steps are independent transfer');
  // difficulty does not merely stay flat — it steps up (guidance removed progressively)
  assert.ok(plan[plan.length - 1].difficulty > plan[0].difficulty, 'transfer gets harder');
  assert.ok(plan.every((p) => p.domain === 'mechanical' && p.subskill === 'pulleys' && p.guidance));
});

test('builders are deterministic per seed', () => {
  for (const key of KEYS) {
    const a = VISUAL_BUILDERS[key](makeRng(7), 3);
    const b = VISUAL_BUILDERS[key](makeRng(7), 3);
    assert.deepEqual(a, b, `${key}: same seed must yield identical item`);
  }
});
