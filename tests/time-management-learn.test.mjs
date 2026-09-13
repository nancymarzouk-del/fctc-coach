// time-management-learn.test.mjs — LEARN MODE ("teach before test", Sprint 3+).
// Covers the instructional layer that sits BEFORE adaptive Practice: the three
// core-skill lessons, the strategy TOOLKIT, the strategy SELECTOR, failure
// recovery + motivation patterns, and the instructional-progress store — plus the
// hard invariant that none of it ever touches formal mastery (that stays Practice).
// Deterministic; no I/O beyond a memory persistence adapter.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  LESSONS, LESSON_ORDER, LESSON_STEPS, RETEACH_APPROACHES,
  nextReteachApproach, evaluateQuickCheck, lessonFor,
} from '../lib/certifications/tm/lessons.mjs';
import {
  STRATEGIES, STRATEGY_ORDER, STRATEGY_GROUPS, strategyFor, strategiesInGroup,
  STRATEGY_PROBLEMS, evaluateSelector, MOTIVATION_PATTERNS, FAILURE_RECOVERY, MIXED_LIFE,
} from '../lib/certifications/tm/strategies.mjs';
import {
  emptyLearnState, tmLearnStorageKey, LESSON_STATUS,
  setStepIndex, recordQuickCheck, recordReteach, pickReteach,
  lessonStatus, completedCount, isFreshLearner,
  markStrategyViewed, markStrategyPracticed, strategyViewed, strategyPracticed, strategyProgress,
  recordSelector, selectorCompleted,
  setTmLearnPersistence, loadLearnState, saveLearnState,
} from '../lib/certifications/tm/tmLearnStore.mjs';
import { generateVariedItem, generatableCells, tmConceptAnalysis } from '../lib/certifications/tm/tmEngine.mjs';
import { listCertifications } from '../lib/certRegistry.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');
function rngFrom(seed) { let s = (seed >>> 0) || 1; return () => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }

// A device-local persistence adapter backed by a Map (no real localStorage).
function memoryAdapter() {
  const m = new Map();
  return { load: (k) => (m.has(k) ? JSON.parse(m.get(k)) : null), save: (k, s) => m.set(k, JSON.stringify(s)), _map: m };
}

// ============================================================================
// 1. Core-skill lessons are complete and well-formed
// ============================================================================
test('all three core competencies exist with the full teach→test progression', () => {
  assert.deepEqual([...LESSON_ORDER], ['prioritization', 'estimation', 'decomposition']);
  assert.deepEqual([...LESSON_STEPS], ['intro', 'concept', 'framework', 'worked', 'contrast', 'guided', 'quickcheck']);
  for (const topic of LESSON_ORDER) {
    const l = lessonFor(topic);
    assert.ok(l, `${topic} lesson exists`);
    assert.ok(l.title && l.oneLiner && l.visual, `${topic} has title/oneLiner/visual`);
    // concept: what / why / when / mistakes
    assert.ok(l.concept.what && l.concept.why && l.concept.when, `${topic} concept complete`);
    assert.ok(Array.isArray(l.concept.mistakes) && l.concept.mistakes.length >= 2, `${topic} lists mistakes`);
    // framework: keyIdea + reusable steps
    assert.ok(l.framework.keyIdea && l.framework.steps.length >= 3, `${topic} framework has steps`);
    // worked example: scenario + reasoning steps + a decision
    assert.ok(l.worked.scenario && l.worked.steps.length >= 2 && l.worked.decision, `${topic} worked example complete`);
    assert.ok(Array.isArray(l.worked.tasks) && l.worked.tasks.length >= 1, `${topic} worked example shows tasks`);
    // contrast: weak vs better
    assert.ok(l.contrast.weak && l.contrast.better, `${topic} contrast complete`);
    // guided practice: prompts with valid answers, hints, and coaching
    assert.ok(l.guided.scenario && l.guided.prompts.length >= 1, `${topic} guided practice exists`);
    for (const p of l.guided.prompts) {
      assert.ok(p.options.length >= 2 && p.correct >= 0 && p.correct < p.options.length, `${topic} guided prompt answer valid`);
      assert.ok(p.hint && p.coach, `${topic} guided prompt has hint + coaching (instructional, not punitive)`);
    }
    // quick check: 1–2 items, valid answers, explanations
    assert.ok(l.quickcheck.length >= 1 && l.quickcheck.length <= 2, `${topic} quick check is 1–2 items`);
    for (const q of l.quickcheck) {
      assert.ok(q.correct >= 0 && q.correct < q.options.length, `${topic} quickcheck answer valid`);
      assert.ok(q.explain, `${topic} quickcheck explains`);
    }
    // reteach: several DISTINCT approaches so Alyce can vary the explanation
    assert.ok(l.reteach.length >= 3, `${topic} has multiple reteach approaches`);
    const approaches = l.reteach.map((r) => r.approach);
    assert.equal(new Set(approaches).size, approaches.length, `${topic} reteach approaches are distinct`);
    for (const r of l.reteach) assert.ok(RETEACH_APPROACHES.includes(r.approach) && r.title && r.body, `${topic} reteach card well-formed`);
  }
});

test('prioritization explicitly teaches URGENT ≠ IMPORTANT and that short ≠ best-first', () => {
  const k = LESSONS.prioritization.framework.keyIdea.toLowerCase();
  assert.ok(k.includes('urgent') && k.includes('important'), 'names urgency vs importance');
  assert.ok(k.includes('short'), 'names the short-task trap');
});

test('estimation teaches a multi-step process with buffer; decomposition reaches a concrete next action', () => {
  assert.ok(LESSONS.estimation.framework.steps.length >= 5, 'estimation has a multi-step process');
  const estText = JSON.stringify(LESSONS.estimation).toLowerCase();
  assert.ok(estText.includes('buffer'), 'estimation teaches buffer');
  const decText = JSON.stringify(LESSONS.decomposition).toLowerCase();
  assert.ok(decText.includes('next action'), 'decomposition teaches the next action');
});

// ============================================================================
// 2. Reteaching VARIES the approach (never repeat the same paragraph)
// ============================================================================
test('nextReteachApproach returns unused approaches first, then rotates', () => {
  const avail = ['a', 'b', 'c'];
  assert.equal(nextReteachApproach([], avail), 'a');
  assert.equal(nextReteachApproach(['a'], avail), 'b');
  assert.equal(nextReteachApproach(['a', 'b'], avail), 'c');
  // all used → still returns something deterministic (rotates)
  assert.ok(avail.includes(nextReteachApproach(['a', 'b', 'c'], avail)));
});

test('pickReteach varies with recorded history for a competency', () => {
  let s = emptyLearnState();
  const available = LESSONS.prioritization.reteach.map((r) => r.approach);
  const first = pickReteach(s, 'prioritization', available);
  s = recordReteach(s, 'prioritization', first);
  const second = pickReteach(s, 'prioritization', available);
  assert.notEqual(first, second, 'a second struggle gets a different approach');
});

// ============================================================================
// 3. Quick check gates readiness (all-correct) but NEVER marks mastery
// ============================================================================
test('evaluateQuickCheck passes only when every item is correct', () => {
  const items = LESSONS.estimation.quickcheck;
  const allRight = {}; items.forEach((q, i) => { allRight[i] = q.correct; });
  assert.equal(evaluateQuickCheck(items, allRight).passed, true);
  const oneWrong = { ...allRight, 0: (items[0].correct + 1) % items[0].options.length };
  assert.equal(evaluateQuickCheck(items, oneWrong).passed, false);
  assert.equal(evaluateQuickCheck([], {}).passed, false);
});

test('passing a quick check marks the lesson COMPLETE — instructional only, no mastery fields', () => {
  let s = emptyLearnState();
  s = setStepIndex(s, 'prioritization', 3);
  assert.equal(lessonStatus(s, 'prioritization'), LESSON_STATUS.IN_PROGRESS);
  s = recordQuickCheck(s, 'prioritization', true);
  assert.equal(lessonStatus(s, 'prioritization'), LESSON_STATUS.COMPLETE);
  assert.equal(completedCount(s), 1);
  // The learn state must carry NO mastery structures whatsoever.
  assert.equal(s.domains, undefined, 'no mastery domains in learn state');
  assert.equal(s.misconceptions, undefined, 'no misconceptions in learn state');
  assert.equal(s.transfer, undefined, 'no transfer evidence in learn state');
  // Reading/passing a lesson is not "Strong" — there is no such concept here.
  assert.ok(!('mastery' in s), 'learn state never encodes mastery');
});

// ============================================================================
// 4. First-use: brand-new learner is fresh (must be routed to Learn, not questions)
// ============================================================================
test('isFreshLearner is true for an untouched learner and false once anything is touched', () => {
  assert.equal(isFreshLearner(emptyLearnState()), true);
  assert.equal(isFreshLearner(setStepIndex(emptyLearnState(), 'prioritization', 1)), false);
  assert.equal(isFreshLearner(markStrategyViewed(emptyLearnState(), 'time-boxing')), false);
});

// ============================================================================
// 5. Strategy TOOLKIT is complete and well-formed
// ============================================================================
test('every toolkit strategy has what/when/how/example/failure/guided', () => {
  assert.ok(STRATEGY_ORDER.length >= 15, 'a substantial toolkit');
  for (const id of STRATEGY_ORDER) {
    const s = STRATEGIES[id];
    assert.equal(s.id, id, `${id} id matches key`);
    assert.ok(s.name && s.tagline && s.group, `${id} has name/tagline/group`);
    assert.ok(s.what && s.when && s.whenNot, `${id} has what/when/whenNot`);
    assert.ok(Array.isArray(s.how) && s.how.length >= 3, `${id} has how-to steps`);
    assert.ok(s.example && s.example.good && s.example.bad, `${id} has good vs not-this example`);
    assert.ok(s.failure, `${id} names a common failure`);
    assert.ok(s.guided && s.guided.options.length >= 2 && s.guided.correct >= 0 && s.guided.correct < s.guided.options.length, `${id} guided answer valid`);
    assert.ok(s.guided.hint && s.guided.coach, `${id} guided has hint + coaching`);
  }
});

test('the toolkit covers the required core methods', () => {
  const required = ['time-boxing', 'time-blocking', 'priority-matrix', 'impact-effort', 'top-1-3',
    'time-audit', 'task-decomposition', 'five-minute-start', 'implementation-intentions', 'focus-sprints',
    'distraction-control', 'task-batching', 'backward-planning', 'buffer-planning', 'not-today',
    'renegotiating', 'daily-review', 'weekly-review'];
  for (const id of required) assert.ok(STRATEGIES[id], `toolkit includes ${id}`);
});

test('strategy groups partition the whole toolkit (every strategy shown exactly once)', () => {
  const grouped = STRATEGY_GROUPS.flatMap((g) => strategiesInGroup(g.key));
  assert.equal(grouped.length, STRATEGY_ORDER.length, 'no strategy is orphaned or duplicated');
  assert.deepEqual(new Set(grouped), new Set(STRATEGY_ORDER));
});

// ============================================================================
// 6. Strategy SELECTION — the "choose the right method" skill
// ============================================================================
test('every selector problem has a valid answer and resolvable "also consider" strategies', () => {
  assert.ok(STRATEGY_PROBLEMS.length >= 6, 'covers the common problems');
  for (const p of STRATEGY_PROBLEMS) {
    assert.ok(p.problem && p.why, 'problem states the situation and the reasoning');
    assert.ok(p.correct >= 0 && p.correct < p.options.length, 'selector answer valid');
    for (const sid of (p.also || [])) assert.ok(strategyFor(sid), `selector references a real strategy: ${sid}`);
  }
});

test('evaluateSelector passes on a strong majority, fails on all-wrong', () => {
  const allRight = {}; STRATEGY_PROBLEMS.forEach((p, i) => { allRight[i] = p.correct; });
  assert.equal(evaluateSelector(STRATEGY_PROBLEMS, allRight).passed, true);
  const allWrong = {}; STRATEGY_PROBLEMS.forEach((p, i) => { allWrong[i] = (p.correct + 1) % p.options.length; });
  assert.equal(evaluateSelector(STRATEGY_PROBLEMS, allWrong).passed, false);
});

// ============================================================================
// 7. Motivation patterns (observable, never "lazy") + recovery + mixed life
// ============================================================================
test('motivation patterns are observable, resolve to real strategies, and never say "lazy"', () => {
  assert.ok(MOTIVATION_PATTERNS.length >= 6, 'covers the common patterns');
  const blob = JSON.stringify(MOTIVATION_PATTERNS).toLowerCase();
  assert.ok(!/\blaz(y|iness|ily)\b/.test(blob), 'never labels the learner lazy');
  for (const m of MOTIVATION_PATTERNS) {
    assert.ok(m.label && m.soundsLike && m.cause && m.note, 'pattern is fully described');
    assert.ok(m.strategies.length >= 1, 'pattern maps to at least one strategy');
    for (const sid of m.strategies) assert.ok(strategyFor(sid), `motivation pattern references a real strategy: ${sid}`);
  }
});

test('failure recovery and the mixed-life evening are well-formed teaching scenarios', () => {
  assert.ok(FAILURE_RECOVERY.principles.length >= 4, 'recovery lists concrete principles');
  assert.ok(FAILURE_RECOVERY.scenario.correct >= 0 && FAILURE_RECOVERY.scenario.correct < FAILURE_RECOVERY.scenario.options.length, 'recovery scenario answer valid');
  assert.ok(FAILURE_RECOVERY.scenario.coach, 'recovery scenario coaches');
  assert.ok(MIXED_LIFE.setup.length >= 4, 'mixed-life scenario has competing demands');
  assert.ok(MIXED_LIFE.correct >= 0 && MIXED_LIFE.correct < MIXED_LIFE.options.length, 'mixed-life answer valid');
  // The "fit everything in" option must NOT be the taught answer — tradeoffs win.
  assert.ok(/tradeoff|shrink|reduce|defer|non-negotiable/i.test(MIXED_LIFE.options[MIXED_LIFE.correct]), 'mixed-life answer teaches tradeoffs');
});

// ============================================================================
// 8. Instructional-progress store: toolkit + selector, separate from mastery
// ============================================================================
test('toolkit progress records viewing and practicing, distinct from mastery', () => {
  let s = emptyLearnState();
  assert.equal(strategyViewed(s, 'time-boxing'), false);
  s = markStrategyViewed(s, 'time-boxing');
  assert.equal(strategyViewed(s, 'time-boxing'), true);
  assert.equal(strategyPracticed(s, 'time-boxing'), false);
  s = markStrategyPracticed(s, 'time-boxing');
  assert.equal(strategyPracticed(s, 'time-boxing'), true);
  const prog = strategyProgress(s, STRATEGY_ORDER.length);
  assert.equal(prog.viewed, 1);
  assert.equal(prog.practiced, 1);
  assert.equal(prog.total, STRATEGY_ORDER.length);
  // still no mastery
  assert.equal(s.domains, undefined);
});

test('selector progress records attempts and completion without touching mastery', () => {
  let s = emptyLearnState();
  assert.equal(selectorCompleted(s), false);
  s = recordSelector(s, 3, 7, false);
  assert.equal(selectorCompleted(s), false);
  assert.equal(s.selector.attempts, 1);
  s = recordSelector(s, 7, 7, true);
  assert.equal(selectorCompleted(s), true);
  assert.equal(s.selector.attempts, 2);
  assert.equal(s.selector.bestCorrect, 7);
  assert.equal(s.domains, undefined);
});

test('learn store is per-learner namespaced and round-trips through a device-local adapter', () => {
  const adapter = memoryAdapter();
  setTmLearnPersistence(adapter);
  try {
    assert.equal(tmLearnStorageKey(null), 'tm_learn_v1');
    assert.equal(tmLearnStorageKey('learner-A'), 'tm_learn_v1:learnerA');
    assert.notEqual(tmLearnStorageKey('learner-A'), tmLearnStorageKey('learner-B'), 'learners are isolated');

    let a = markStrategyPracticed(setStepIndex(emptyLearnState(), 'prioritization', 2), 'focus-sprints');
    saveLearnState(a, 'learner-A');
    // A different learner sees a clean slate.
    assert.equal(isFreshLearner(loadLearnState('learner-B')), true);
    // Learner A resumes exactly where they left off.
    const resumed = loadLearnState('learner-A');
    assert.equal(lessonStatus(resumed, 'prioritization'), LESSON_STATUS.IN_PROGRESS);
    assert.equal(strategyPracticed(resumed, 'focus-sprints'), true);
  } finally {
    setTmLearnPersistence(localStorageAdapterOrNull());
  }
});

// v1 → v2 migration: an old state (no strategies/selector) loads with the new
// fields defaulted, without losing its lesson progress.
test('a v1 learn state migrates forward to v2 (strategies + selector) losslessly', () => {
  const adapter = memoryAdapter();
  setTmLearnPersistence(adapter);
  try {
    const v1 = { schemaVersion: 1, competencies: { prioritization: { status: 'complete', stepIndex: 6, quickCheckPassed: true, reteachApproachesUsed: [], attempts: 1 } } };
    adapter.save(tmLearnStorageKey('old'), v1);
    const loaded = loadLearnState('old');
    assert.equal(loaded.schemaVersion, 2);
    assert.equal(lessonStatus(loaded, 'prioritization'), LESSON_STATUS.COMPLETE);
    assert.deepEqual(loaded.strategies, { viewed: [], practiced: [] });
    assert.ok(loaded.selector && loaded.selector.completed === false);
  } finally {
    setTmLearnPersistence(localStorageAdapterOrNull());
  }
});
function localStorageAdapterOrNull() { return { load: () => null, save: () => {} }; }

// ============================================================================
// 9. Isolation: the instructional layer must not import the mastery engine
// ============================================================================
test('lessons + toolkit content modules are pure data (no mastery/engine imports)', () => {
  for (const f of ['lib/certifications/tm/lessons.mjs', 'lib/certifications/tm/strategies.mjs']) {
    const src = read(f);
    const imports = src.split('\n').filter((l) => /^\s*import\b/.test(l));
    assert.equal(imports.length, 0, `${f} imports nothing (pure content + helpers)`);
  }
});

test('tmLearnStore never imports the mastery store or engine (progress ≠ mastery)', () => {
  const src = read('lib/certifications/tm/tmLearnStore.mjs');
  const imports = src.split('\n').filter((l) => /^\s*import\b/.test(l));
  for (const line of imports) {
    assert.ok(!/tmStore|tmEngine|metrics|tmApplication/.test(line), `learn store must not import mastery: ${line.trim()}`);
  }
  // Its only dependency is the lesson content module.
  assert.ok(imports.some((l) => /lessons\.mjs/.test(l)), 'learn store reads lesson order/reteach helpers only');
});

// ============================================================================
// 10. Wiring: three modes, Learn rendered, fresh learners default to Learn
// ============================================================================
test('TimeMgmtExperience wires three modes and defaults fresh learners into Learn', () => {
  const src = read('components/tm/TimeMgmtExperience.jsx');
  assert.ok(/import\s+TmLearn\s+from\s+'\.\/TmLearn'/.test(src), 'imports TmLearn');
  assert.ok(/<TmLearn\b/.test(src), 'renders TmLearn');
  assert.ok(/setMode\('learn'\)/.test(src), 'has a Learn mode toggle / default');
  assert.ok(/isFreshLearner\(/.test(src), 'checks freshness to route new learners into Learn');
  // The Practice CTA from Learn goes through the real Practice engine.
  assert.ok(/onGoPractice=\{goPracticeTopic\}/.test(src), 'Learn hands off to Practice via goPracticeTopic');
});

test('TmLearn renders lessons, the toolkit, the selector, recovery, and the toolkit summary', () => {
  const src = read('components/tm/TmLearn.jsx');
  for (const frag of ['LessonScreen', 'StrategyScreen', 'SelectorScreen', 'RecoveryScreen', 'ToolkitScreen']) {
    assert.ok(src.includes(frag), `TmLearn includes ${frag}`);
  }
  assert.ok(/from '\.\.\/\.\.\/lib\/certifications\/tm\/strategies\.mjs'/.test(src), 'imports the strategy toolkit');
});

// ============================================================================
// 11. Regression: Practice engine + registry unchanged; other modules intact
// ============================================================================
test('Practice engine still generates valid items and analysis (unchanged by Learn)', () => {
  const cells = generatableCells();
  assert.ok(cells.length >= 3, 'practice cells still available');
  const item = generateVariedItem({ topic: 'prioritization', subskill: cells.find((c) => c.topic === 'prioritization').subskill, rng: rngFrom(42) });
  assert.ok(item && item.options.length === 4, 'practice item still well-formed');
  const ca = tmConceptAnalysis({}, {}, {});
  assert.equal(ca.hasEnoughEvidence, false, 'no fabricated evidence for an empty learner');
});

test('Time Management is still registered and Plan My Day source is intact', () => {
  assert.ok(listCertifications().some((c) => c.id === 'time-management'), 'time-management still registered');
  const app = read('components/tm/TmApplication.jsx');
  assert.ok(app.length > 0, 'Plan My Day component still present');
  // Learn must not have reached into the application (Plan My Day) namespace.
  const learnSrc = read('components/tm/TmLearn.jsx');
  assert.ok(!/tmApplicationStore|tm_application_v1/.test(learnSrc), 'Learn does not touch Plan My Day state');
});
