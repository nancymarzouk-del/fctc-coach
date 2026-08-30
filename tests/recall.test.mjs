// ============================================================================
// tests/recall.test.mjs — visual-recall detail-type tracking + coaching.
// Run: `node --test tests/recall.test.mjs`.
// ============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DETAIL_TYPES, RECALL_STRATEGIES, recallStrategy, classifyRecallDetail,
  detailTypeToBoardKind, recordRecallMiss, focusDetailType,
} from '../lib/recallCoach.mjs';

test('every detail type has a memory strategy', () => {
  for (const t of DETAIL_TYPES) {
    assert.ok(RECALL_STRATEGIES[t] && /memory tip/i.test(RECALL_STRATEGIES[t]), `missing strategy for ${t}`);
  }
});

test('classifyRecallDetail maps prompts to the right detail type', () => {
  assert.equal(classifyRecallDetail({ prompt: 'How many units were on the board?' }), 'count');
  assert.equal(classifyRecallDetail({ prompt: 'What hazard was marked on the plan?' }), 'hazard');
  assert.equal(classifyRecallDetail({ prompt: 'What helmet color did Chen wear?' }), 'attribute');
  assert.equal(classifyRecallDetail({ prompt: 'Which side of the building had the hazard?' }), 'hazard'); // hazard wins (safety-critical)
  assert.equal(classifyRecallDetail({ prompt: 'Which side was the entry point?' }), 'direction');
  assert.equal(classifyRecallDetail({ prompt: 'Which room contained the victim?' }), 'spatial');
  assert.equal(classifyRecallDetail({ prompt: 'Which unit arrived first?' }), 'sequence');
  assert.equal(classifyRecallDetail({ prompt: 'Which compartment held the Halligan bar?' }), 'equipment');
  assert.equal(classifyRecallDetail({ prompt: "What was Engine 12's assignment?" }), 'personnel');
  // falls back to subskill when the prompt has no keyword
  assert.equal(classifyRecallDetail({ subskill: 'directional', prompt: 'blah' }), 'direction');
  assert.equal(classifyRecallDetail({ prompt: 'blah' }), 'identity');
});

test('missed detail types accumulate and drive focus (with evidence)', () => {
  let m = {};
  m = recordRecallMiss(m, 'equipment');
  assert.equal(focusDetailType(m), null, 'one miss is not yet a focus');
  m = recordRecallMiss(m, 'equipment');
  assert.equal(focusDetailType(m), 'equipment', 'two misses => a clear focus');
  // a competing type with more misses wins
  m = recordRecallMiss(recordRecallMiss(recordRecallMiss(m, 'direction'), 'direction'), 'direction');
  assert.equal(focusDetailType(m), 'direction');
});

test('focus detail type maps to a board kind that exercises it (or any)', () => {
  assert.equal(detailTypeToBoardKind('equipment'), 'equipment');
  assert.equal(detailTypeToBoardKind('spatial'), 'floorplan');
  assert.equal(detailTypeToBoardKind('sequence'), 'command');
  assert.equal(detailTypeToBoardKind('count'), null); // count is testable on any board
});

test('recordRecallMiss is immutable and ignores empty detail type', () => {
  const a = { equipment: 1 };
  const b = recordRecallMiss(a, 'equipment');
  assert.equal(a.equipment, 1, 'original not mutated');
  assert.equal(b.equipment, 2);
  assert.deepEqual(recordRecallMiss(a, null), a);
});
