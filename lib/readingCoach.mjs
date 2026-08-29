// ============================================================================
// readingCoach.mjs — technical-reading strategy coaching.
// ----------------------------------------------------------------------------
// Pure and deterministic. Every technical-reading question is tagged with the
// reading BEHAVIOR it tests (sequence, condition, exception, detail, cause,
// inference, application). After answering, the app teaches the matching
// strategy — the transferable habit, not the specific fact — so the learner
// improves the behavior, then meets it again on a different passage. Tested in
// tests/reading.test.mjs; used by questionEngine's reading generators.
// ============================================================================

export const READING_SKILLS = Object.freeze([
  'sequence', 'condition', 'exception', 'detail', 'cause', 'inference', 'application',
]);

// The strategy taught for each behavior — short, imperative, transferable.
export const READING_STRATEGIES = Object.freeze({
  sequence: 'Reading strategy: watch for sequence words — BEFORE, AFTER, UNTIL, THEN. They fix the order, and the order is usually the answer.',
  condition: 'Reading strategy: find the condition that changes the rule — WITHOUT, UNLESS, IF, ONLY. The rule only holds when that condition is met.',
  exception: 'Reading strategy: limiting words — ONLY, EXCEPT, NEVER, ALL, NONE — flip an answer. Underline them before you choose.',
  detail: 'Reading strategy: match your answer to the exact words in the passage. Go back and check — do not answer from memory.',
  cause: 'Reading strategy: separate cause from effect. Ask what triggers what, and in which direction.',
  inference: 'Reading strategy: separate what is STATED from what you are inferring. Choose only what the text actually supports.',
  application: 'Reading strategy: apply the stated rule to the specifics — compute it or trace it. Do not estimate.',
});

export function readingStrategy(skill) {
  return READING_STRATEGIES[skill] || READING_STRATEGIES.detail;
}

// Classify the reading behavior a question tests from its prompt. Deterministic
// keyword rules, ordered so a limiting/conditional cue wins over a surface word.
export function readingSkillFor(prompt) {
  const p = String(prompt || '').toLowerCase();
  if (/\bwithout\b|\bunless\b|\bif\b|\bonly\b/.test(p)) return 'condition';
  if (/elapsed|how many minutes|below what|90%|maximum psi/.test(p)) return 'application';
  if (/\bbefore\b|\bafter\b|\buntil\b|in order|sequence/.test(p)) return 'sequence';
  if (/combination|except|warning sign/.test(p)) return 'exception';
  return 'detail';
}

// Attach coaching metadata to a reading question. Called by the generators.
export function withReadingCoaching(item, skill) {
  const s = READING_STRATEGIES[skill] ? skill : 'detail';
  return { ...item, meta: { ...(item.meta || {}), readingSkill: s, strategy: READING_STRATEGIES[s] } };
}
