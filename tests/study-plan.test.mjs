// study-plan.test.mjs — cert-agnostic study-planning foundation.
// Confirms: exam date is optional (no schedule invented), effort recalculates from
// weight × gap × priority, and weekly commitments appear only when a date is set —
// in a Sprint-3-ready shape.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStudyPlan, updateStudyPlan, recalcPlan, weeksUntil } from '../lib/studyPlan.mjs';

const TOPICS = [
  { key: 'ethics', weight: 0.175 },
  { key: 'quant', weight: 0.10 },
  { key: 'fixedIncome', weight: 0.11 },
  { key: 'equity', weight: 0.11 },
];

test('a new plan has no exam date and invents no schedule', () => {
  const plan = createStudyPlan({ certId: 'cfa-level-1' });
  assert.equal(plan.examDate, null);
  const r = recalcPlan(plan, { topics: TOPICS });
  assert.equal(r.hasExamDate, false);
  assert.equal(r.weeksRemaining, null);
  assert.equal(r.scheduled, false);
  assert.deepEqual(r.commitments, []);        // no date => no commitments
  // effort shares are always available and sum to ~1
  const sum = r.shares.reduce((a, s) => a + s.effortShare, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
});

test('effort biases toward heavier-weight, larger-gap topics', () => {
  const plan = createStudyPlan({ certId: 'cfa-level-1' });
  // ethics fully mastered, quant untouched -> quant should get more than ethics
  const r = recalcPlan(plan, { topics: TOPICS, progress: { ethics: 1.0, quant: 0.0 } });
  const share = (k) => r.shares.find((s) => s.key === k).effortShare;
  assert.ok(share('quant') > share('ethics'), 'a big gap should outweigh a mastered heavy topic');
});

test('priority multiplier increases a topic\'s share', () => {
  const base = recalcPlan(createStudyPlan({ certId: 'cfa' }), { topics: TOPICS });
  const boosted = recalcPlan(createStudyPlan({ certId: 'cfa', topicPriorities: { equity: 3 } }), { topics: TOPICS });
  const s = (r, k) => r.shares.find((x) => x.key === k).effortShare;
  assert.ok(s(boosted, 'equity') > s(base, 'equity'));
});

test('adding an exam date later yields weekly commitments (Sprint-3 shape)', () => {
  let plan = createStudyPlan({ certId: 'cfa-level-1', weeklyMinutes: 600 });
  const now = Date.UTC(2026, 0, 1);
  const exam = new Date(Date.UTC(2026, 2, 1)).toISOString(); // ~8-9 weeks out
  plan = updateStudyPlan(plan, { examDate: exam });
  const r = recalcPlan(plan, { topics: TOPICS, nowMs: now });
  assert.ok(r.weeksRemaining >= 1);
  assert.equal(r.scheduled, true);
  assert.equal(r.commitments.length, TOPICS.length);
  for (const c of r.commitments) {
    assert.equal(c.kind, 'study');            // generic, life-planner-consumable
    assert.equal(c.certId, 'cfa-level-1');
    assert.ok(typeof c.minutesPerWeek === 'number');
  }
  const totalWeekly = r.commitments.reduce((a, c) => a + c.minutesPerWeek, 0);
  assert.ok(Math.abs(totalWeekly - 600) <= TOPICS.length, 'weekly minutes allocated across topics');
});

test('weeksUntil is null without a date/now or for a past date', () => {
  assert.equal(weeksUntil(null, Date.now()), null);
  assert.equal(weeksUntil(new Date(Date.UTC(2020, 0, 1)).toISOString(), Date.UTC(2026, 0, 1)), null);
  assert.ok(weeksUntil(new Date(Date.UTC(2026, 6, 1)).toISOString(), Date.UTC(2026, 0, 1)) > 1);
});
