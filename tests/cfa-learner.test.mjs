// cfa-learner.test.mjs — Sprint 2B learner-layer: cross-question misconception
// memory, PSM tracking, calculator selection, and the eight expanded topic
// generators (well-formed + calculation self-consistency).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyMisconceptionMemory, recordMisconception, recurringMisconceptions,
  misconceptionPhrase, MISCONCEPTION_FLAG_THRESHOLD,
} from '../lib/certifications/cfa/misconceptions.mjs';
import { PSM_OPTIONS, PSM_STATUS, createPsmTracker, selectPsm, setPsmStatus, PSM_REQUIREMENT_NOTE } from '../lib/certifications/cfa/psm.mjs';
import { createStudyPlan, updateStudyPlan } from '../lib/studyPlan.mjs';
import { TOPIC_GENERATORS } from '../lib/certifications/cfa/topicGenerators.mjs';
import { emptyCfaState, recordCfaAnswer } from '../lib/certifications/cfa/cfaStore.mjs';

function lcg(seed = 1) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }

// ---- cross-question misconception memory ----------------------------------------
test('a single mistake never flags a recurring misconception', () => {
  let mem = emptyMisconceptionMemory();
  mem = recordMisconception(mem, 'present-vs-future-value');
  assert.equal(recurringMisconceptions(mem).length, 0, 'one observation is not "recurring"');
  assert.match(misconceptionPhrase('present-vs-future-value', 1), /may indicate/i);
});

test('a misconception recurring across questions is flagged, most-frequent first', () => {
  let mem = emptyMisconceptionMemory();
  for (let i = 0; i < MISCONCEPTION_FLAG_THRESHOLD; i++) mem = recordMisconception(mem, 'rate-conversion');
  mem = recordMisconception(mem, 'periods');
  const rec = recurringMisconceptions(mem);
  assert.equal(rec.length, 1);
  assert.equal(rec[0].key, 'rate-conversion');
  assert.ok(rec[0].count >= MISCONCEPTION_FLAG_THRESHOLD);
  assert.match(misconceptionPhrase('rate-conversion', rec[0].count), /times across different questions/i);
  assert.equal(recordMisconception(mem, null).total, mem.total, 'a correct answer (null key) is a no-op');
});

// ---- PSM tracking ----------------------------------------------------------------
test('PSM: honest requirement + selection/status lifecycle', () => {
  assert.equal(PSM_OPTIONS.length, 2);
  assert.match(PSM_REQUIREMENT_NOTE, /CFA Institute/);
  assert.match(PSM_REQUIREMENT_NOTE, /does not host/i);
  let t = createPsmTracker();
  assert.equal(t.status, PSM_STATUS.NOT_SELECTED);
  t = setPsmStatus(t, PSM_STATUS.IN_PROGRESS);
  assert.equal(t.status, PSM_STATUS.NOT_SELECTED, 'cannot progress without a selection');
  t = selectPsm(t, 'Bogus Module');
  assert.equal(t.selected, null, 'invalid module rejected');
  t = selectPsm(t, 'Financial Modeling');
  assert.equal(t.status, PSM_STATUS.NOT_STARTED);
  t = setPsmStatus(t, PSM_STATUS.COMPLETED);
  assert.equal(t.status, PSM_STATUS.COMPLETED);
});

// ---- calculator selection (never chosen for the learner) ------------------------
test('study plan stores an optional calculator without choosing one', () => {
  const plan = createStudyPlan({ certId: 'cfa-level-1' });
  assert.equal(plan.calculator, null, 'no calculator chosen by default');
  const updated = updateStudyPlan(plan, { calculator: 'TI BA II Plus' });
  assert.equal(updated.calculator, 'TI BA II Plus');
  assert.equal(updateStudyPlan(updated, { calculator: null }).calculator, null);
});

// ---- CFA learner state store ----------------------------------------------------
test('cfaStore records answers into the metrics skill-state shape + accumulates misconceptions', () => {
  let st = emptyCfaState();
  assert.equal(st.certId, 'cfa-level-1');
  assert.equal(Object.keys(st.domains).length, 10, 'all ten topics initialized');
  st = recordCfaAnswer(st, { domain: 'quant', subskill: 'tvm', correct: false, difficulty: 2, misconceptionKey: 'present-vs-future-value' });
  st = recordCfaAnswer(st, { domain: 'quant', subskill: 'tvm', correct: true, difficulty: 2 });
  const s = st.domains.quant.tvm;
  assert.equal(s.attempts, 2);
  assert.equal(s.correct, 1);
  assert.equal(s.history.length, 2);
  assert.equal(st.totalAnswered, 2);
  assert.equal(st.misconceptions.counts['present-vs-future-value'], 1); // only the wrong answer recorded a key
});

// ---- eight expanded topic generators: well-formed + calc self-consistent --------
test('every topic generator is well-formed; calculation answers are self-consistent', () => {
  for (const [key, gen] of Object.entries(TOPIC_GENERATORS)) {
    for (let s = 0; s < 30; s++) {
      const q = gen(lcg(s + 1));
      assert.equal(q.options.length, 3, `${key}: 3 choices`);
      assert.equal(new Set(q.options).size, 3, `${key}: options unique`);
      assert.ok(q.correct >= 0 && q.correct < 3, `${key}: valid correct index`);
      assert.ok(q.explanation && q.explanation.length > 10, `${key}: has explanation`);
      // For calculation items, the displayed correct option must match the value
      // stated in the (programmatically-derived) explanation.
      if (typeof q.verify === 'function') {
        assert.ok(Number.isFinite(q.verify()), `${key}: verify() returns a number`);
        assert.ok(q.explanation.includes(q.options[q.correct]),
          `${key}: correct option must match the computed answer in the explanation`);
      }
    }
  }
});
