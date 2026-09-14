// adaptive-core-parity.test.mjs — UALE Consolidation Phase 1 (fctc-coach side).
// Pins the ORIGINAL fctc-coach engine to the SAME golden vectors asserted by
// Florence's tests/adaptive-core.test.mjs against its byte-identical fork. If both
// suites pass, the platform fork (lib/adaptive/**) and the fctc-coach originals are
// behaviorally equivalent — no cross-repo runtime import required. fctc-coach runtime
// is UNCHANGED by Phase 1; this is a test-only safety net.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../lib/metrics.mjs';
import * as MC from '../lib/misconceptions.mjs';
import * as S from '../lib/activeSession.mjs';

const r6 = (x) => (x == null ? null : Math.round(x * 1e6) / 1e6);
const STRONG = { attempts: 6, difficulty: 3, dueIn: 1, history: [true, true, true, true, true, true] };
const WEAK = { attempts: 6, difficulty: 2, dueIn: 1, history: [false, false, true, false, false, false] };

test('constants parity', () => {
  assert.equal(M.MIN_EVIDENCE, 4);
  assert.equal(M.WEAK_THRESHOLD, 0.6);
  assert.equal(M.STRONG_THRESHOLD, 0.85);
  assert.equal(M.RECENT_WINDOW, 6);
  assert.equal(MC.MISCONCEPTION_FLAG_THRESHOLD, 3);
});

test('evidence classification parity', () => {
  assert.equal(M.evidenceState(0), 'untested');
  assert.equal(M.evidenceState(2), 'insufficient');
  assert.equal(M.evidenceState(5), 'evaluated');
});

test('mastery / readiness / classification parity — strong', () => {
  const c = M.classifySkill(STRONG, { domain: 'd', subskill: 's' });
  assert.equal(r6(c.mastery), 0.8);
  assert.equal(r6(c.confidence), 0.75);
  assert.equal(r6(c.weightedAccuracy), 1);
  assert.equal(c.evidenceState, 'evaluated');
  assert.equal(c.demonstratedStrong, true);
  assert.equal(r6(M.skillNeed(c)), 0.275);
});

test('mastery / NBA parity — weak', () => {
  const c = M.classifySkill(WEAK, { domain: 'd', subskill: 's' });
  assert.equal(r6(c.mastery), 0.285714);
  assert.equal(r6(c.weightedAccuracy), 0.142857);
  assert.equal(c.demonstratedWeak, true);
  assert.equal(r6(M.skillNeed(c)), 1.022321);
});

test('misconception parity', () => {
  let mem = MC.emptyMisconceptionMemory();
  for (let i = 0; i < 3; i++) mem = MC.recordMisconception(mem, 'confuses-pv-fv');
  const rec = MC.recurringMisconceptions(mem);
  assert.equal(rec.length, 1);
  assert.equal(rec[0].key, 'confuses-pv-fv');
});

test('active-session serialization/resume/idempotency parity', () => {
  let rs = S.createActiveSession({ module: 'sie', learnerKey: 'L', sessionType: 'mixed', label: 'Mixed', queue: [{ id: 'q0' }, { id: 'q1' }, { id: 'q2' }], nowMs: 1 });
  rs = S.recordAnswerAt(rs, 0, { picked: 0, correct: true }, 2);
  rs = S.recordAnswerAt(rs, 0, { picked: 1, correct: false }, 3);
  assert.equal(S.answeredCount(rs), 1);
  assert.equal(S.totalCount(rs), 3);
  assert.equal(S.nextUnansweredIndex(rs), 1);
  assert.equal(S.isResumable(rs), true);
  assert.deepEqual(rs.answers[0], { picked: 0, correct: true });
});
