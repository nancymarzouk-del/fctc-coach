// ============================================================================
// tests/reading.test.mjs — technical-reading strategy coaching.
// Run: `node --test tests/reading.test.mjs`.
// ============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { READING_SKILLS, READING_STRATEGIES, readingStrategy, readingSkillFor, withReadingCoaching } from '../lib/readingCoach.mjs';

test('every reading skill has a transferable strategy sentence', () => {
  for (const s of READING_SKILLS) {
    assert.ok(READING_STRATEGIES[s] && /reading strategy/i.test(READING_STRATEGIES[s]), `missing strategy for ${s}`);
  }
});

test('readingSkillFor prioritises limiting/conditional cues over surface words', () => {
  assert.equal(readingSkillFor('What is the maximum PSI the pump operator may use without confirmation?'), 'condition');
  assert.equal(readingSkillFor('According to this SOP, what must happen before the attack line is charged?'), 'sequence');
  assert.equal(readingSkillFor('How many minutes elapsed between dispatch and arrival?'), 'application');
  assert.equal(readingSkillFor('Which combination is described as a warning sign of imminent flashover?'), 'exception');
  assert.equal(readingSkillFor('What did the first crew do on arrival?'), 'detail');
});

test('withReadingCoaching attaches a strategy without dropping existing fields', () => {
  const item = withReadingCoaching({ prompt: 'x', options: ['a'], correct: 0, explanation: 'e' }, 'condition');
  assert.equal(item.prompt, 'x');
  assert.equal(item.meta.readingSkill, 'condition');
  assert.ok(/UNLESS|WITHOUT|IF|ONLY/i.test(item.meta.strategy));
});

test('unknown skill falls back to detail', () => {
  assert.equal(withReadingCoaching({ prompt: 'x' }, 'nonsense').meta.readingSkill, 'detail');
  assert.ok(readingStrategy('nope'));
});
