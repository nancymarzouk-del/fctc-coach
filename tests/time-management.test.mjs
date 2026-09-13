// time-management.test.mjs — Sprint 1 vertical slice contract (prioritization,
// estimation, decomposition). Mirrors sie-teaching.test.mjs and adds the domain's
// two new gates: CONTEXT transfer and SUPPORT dependence. Reuses the shared metrics
// engine unchanged. Deterministic (seeded rng).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { generateTmItem, generateVariedItem, generatableCells, tmConceptAnalysis, TM_MISCONCEPTION_INFO, areaLabel } from '../lib/certifications/tm/tmEngine.mjs';
import { CONCEPT_FAMILY, familyOf } from '../lib/certifications/tm/families.mjs';
import { CONTEXTS, TOPIC_ORDER } from '../lib/certifications/tm/tmBlueprint.mjs';
import { emptyTmState, recordTmAnswer, tmStorageKey, loadTmState, saveTmState, setTmPersistence, localStorageAdapter } from '../lib/certifications/tm/tmStore.mjs';
import { metricsRegistryFor, listCertifications } from '../lib/certRegistry.mjs';
import { EVIDENCE } from '../lib/metrics.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');
function rngFrom(seed) { let s = (seed >>> 0) || 1; return () => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }

// Sample many items per cell across seeds → observe family + context coverage.
function sampleCell(topic, subskill, n = 80) {
  const families = new Set(), contexts = new Set(), keys = new Set();
  for (let i = 1; i <= n; i++) {
    const item = generateTmItem({ topic, subskill, rng: rngFrom(i * 2654435761) });
    if (!item) continue;
    families.add(item.family); contexts.add(item.context);
    for (const k of (item.meta.misconceptions || [])) if (k) keys.add(k);
    // structural invariants
    assert.equal(item.options.length, 4, `${topic}:${subskill} must have 4 options`);
    assert.equal(item.meta.distractorRationale.length, 4, 'rationale aligned to 4 options');
    assert.equal(item.meta.misconceptions.length, 4, 'misconceptions aligned to 4 options');
    assert.equal(item.meta.misconceptions[item.correct], null, 'correct option has no misconception key');
    assert.equal(item.meta.distractorRationale[item.correct], null, 'correct option has no rationale');
    assert.ok(new Set(item.options).size === 4, 'options are distinct');
  }
  return { families, contexts, keys };
}

// ---- structural: every subskill ≥2 families AND ≥2 contexts ----------------------
test('every implemented subskill exposes ≥2 reasoning families and ≥2 contexts', () => {
  for (const c of generatableCells()) {
    const { families, contexts } = sampleCell(c.topic, c.subskill);
    assert.ok(families.size >= 2, `${c.topic}:${c.subskill} has ${families.size} families (need ≥2)`);
    assert.ok(contexts.size >= 2, `${c.topic}:${c.subskill} has ${contexts.size} contexts (need ≥2)`);
    for (const ctx of contexts) assert.ok(CONTEXTS.includes(ctx), `context ${ctx} is a known context`);
  }
});

// ---- stable diagnostic keys: every emitted key is defined ------------------------
test('every misconception key emitted by a generator is defined in the dictionary', () => {
  const emitted = new Set();
  for (const c of generatableCells()) for (const k of sampleCell(c.topic, c.subskill).keys) emitted.add(k);
  assert.ok(emitted.size >= 10, `expected the full slice key set, saw ${emitted.size}`);
  for (const k of emitted) assert.ok(TM_MISCONCEPTION_INFO[k], `key "${k}" must be in TM_MISCONCEPTION_INFO`);
  // and every dictionary entry points at a real implemented area
  const cellSet = new Set(generatableCells().map((c) => `${c.topic}:${c.subskill}`));
  for (const [k, info] of Object.entries(TM_MISCONCEPTION_INFO)) {
    assert.ok(cellSet.has(`${info.topic}:${info.subskill}`), `dictionary key ${k} targets an implemented area`);
  }
});

// ---- CONCEPT_FAMILY covers every concept a generator can emit --------------------
test('every generated concept maps to a family in CONCEPT_FAMILY', () => {
  for (const c of generatableCells()) {
    for (let i = 1; i <= 40; i++) {
      const item = generateTmItem({ topic: c.topic, subskill: c.subskill, rng: rngFrom(i * 7919) });
      assert.ok(CONCEPT_FAMILY[item.concept], `concept ${item.concept} must be in CONCEPT_FAMILY`);
      assert.equal(item.family, familyOf(item.concept));
    }
  }
});

// ---- different-family remediation: varied item avoids the missed concept ---------
test('generateVariedItem returns a DIFFERENT concept than the one just missed', () => {
  for (const c of generatableCells()) {
    const first = generateTmItem({ topic: c.topic, subskill: c.subskill, rng: rngFrom(11) });
    const varied = generateVariedItem({ topic: c.topic, subskill: c.subskill, rng: rngFrom(999), avoidConcepts: [first.concept] });
    assert.ok(varied, 'varied item exists');
    assert.notEqual(varied.concept, first.concept, `${c.topic}:${c.subskill} reteach should switch concept/family`);
  }
});

// ---- fresh learner = Need more evidence (nothing fabricated) ---------------------
test('a fresh learner has no strengths/focus — everything needs more evidence', () => {
  const ca = tmConceptAnalysis(emptyTmState().domains, emptyTmState().misconceptions, {});
  assert.equal(ca.hasEnoughEvidence, false);
  assert.equal(ca.strong.length, 0);
  assert.equal(ca.focus.length, 0);
  assert.equal(ca.needEvidence.length, generatableCells().length);
  assert.equal(ca.recommendation.kind, 'diagnostic');
});

// ---- one wrong ≠ weak -----------------------------------------------------------
test('a single wrong answer does not brand an area weak (insufficient evidence)', () => {
  let st = emptyTmState();
  st = recordTmAnswer(st, { domain: 'prioritization', subskill: 'urgencyVsImportance', correct: false, difficulty: 1, family: 'prioritize', context: 'work' });
  const ca = tmConceptAnalysis(st.domains, st.misconceptions, st.transfer);
  assert.ok(!ca.focus.some((x) => x.key === 'prioritization:urgencyVsImportance'), 'not flagged as focus/weak on one miss');
  assert.ok(ca.needEvidence.some((x) => x.key === 'prioritization:urgencyVsImportance'), 'still needs evidence');
});

// ---- Strong requires family AND context transfer AND unassisted success ----------
function feed(st, { correct, family, context, support = 'none', n = 1 }) {
  for (let i = 0; i < n; i++) st = recordTmAnswer(st, { domain: 'prioritization', subskill: 'urgencyVsImportance', correct, difficulty: 4, family, context, support });
  return st;
}
test('high accuracy in ONE family/context is Developing (needs transfer), not Strong', () => {
  let st = emptyTmState();
  st = feed(st, { correct: true, family: 'prioritize', context: 'work', n: 12 });
  const ca = tmConceptAnalysis(st.domains, st.misconceptions, st.transfer);
  const key = 'prioritization:urgencyVsImportance';
  assert.ok(!ca.strong.some((x) => x.key === key), 'must NOT be Strong with a single family/context');
  const dev = ca.developing.find((x) => x.key === key);
  assert.ok(dev && dev.needsTransfer, 'should be Developing with needsTransfer');
});
test('Strong only after ≥2 families AND ≥2 contexts AND recent unassisted success', () => {
  let st = emptyTmState();
  // spread 12 correct across 2 families and 2 contexts, all unassisted
  st = feed(st, { correct: true, family: 'prioritize', context: 'work', n: 4 });
  st = feed(st, { correct: true, family: 'critique', context: 'study', n: 4 });
  st = feed(st, { correct: true, family: 'prioritize', context: 'study', n: 2 });
  st = feed(st, { correct: true, family: 'critique', context: 'work', n: 2 });
  const ca = tmConceptAnalysis(st.domains, st.misconceptions, st.transfer);
  const key = 'prioritization:urgencyVsImportance';
  assert.ok(ca.strong.some((x) => x.key === key), 'should be Strong with 2 families + 2 contexts, unassisted');
});
test('support dependence gate: if the most recent success is a reteach, not Strong', () => {
  let st = emptyTmState();
  st = feed(st, { correct: true, family: 'prioritize', context: 'work', n: 5 });
  st = feed(st, { correct: true, family: 'critique', context: 'study', n: 5 });
  // last correct is assisted (reteach) → independence not shown
  st = feed(st, { correct: true, family: 'critique', context: 'home', support: 'reteach', n: 1 });
  const ca = tmConceptAnalysis(st.domains, st.misconceptions, st.transfer);
  const key = 'prioritization:urgencyVsImportance';
  assert.ok(!ca.strong.some((x) => x.key === key), 'reteach-dependent recent success blocks Strong');
  assert.ok(ca.developing.some((x) => x.key === key && (x.needs || []).includes('an unassisted success')), 'names the missing unassisted success');
});

// ---- difficulty ladder up/down --------------------------------------------------
test('difficulty steps up on a 3-correct streak and down on a miss', () => {
  let st = emptyTmState();
  const at = () => st.domains.estimation.durationEstimation.difficulty;
  for (let i = 0; i < 3; i++) st = recordTmAnswer(st, { domain: 'estimation', subskill: 'durationEstimation', correct: true, difficulty: 1, family: 'estimate', context: 'work' });
  assert.equal(at(), 2, 'stepped up after 3 correct');
  st = recordTmAnswer(st, { domain: 'estimation', subskill: 'durationEstimation', correct: false, difficulty: 2, family: 'estimate', context: 'work' });
  assert.equal(at(), 1, 'stepped down after a miss');
});

// ---- recurring misconception coaching attaches to its area ----------------------
test('a recurring misconception (≥3) attaches to its area with plain-language coaching', () => {
  let st = emptyTmState();
  for (let i = 0; i < 4; i++) st = recordTmAnswer(st, { domain: 'prioritization', subskill: 'urgencyVsImportance', correct: false, difficulty: 1, misconceptionKey: 'urgency-importance-conflation', family: 'prioritize', context: 'work' });
  const ca = tmConceptAnalysis(st.domains, st.misconceptions, st.transfer);
  assert.ok(ca.patterns.some((p) => p.key === 'urgency-importance-conflation'), 'pattern surfaced');
  const area = [...ca.focus, ...ca.developing].find((x) => x.key === 'prioritization:urgencyVsImportance');
  assert.ok(area && area.pattern && /urgent/.test(area.pattern.phrase), 'coaching phrase attached to the area');
});

// ---- learner separation (per-learner storage keys) ------------------------------
test('different learners never share a storage key', () => {
  assert.notEqual(tmStorageKey('amira'), tmStorageKey('stefan'));
  assert.notEqual(tmStorageKey('amira'), tmStorageKey(null));
  assert.equal(tmStorageKey(null), 'tm_v1');
  assert.equal(tmStorageKey('a!b@c'), 'tm_v1:abc');
});

// ---- save/resume through the STORE ABSTRACTION (sync-ready adapter) --------------
test('state saves and resumes through a swappable adapter (no direct localStorage coupling)', () => {
  const mem = new Map();
  setTmPersistence({ load: (k) => (mem.has(k) ? JSON.parse(mem.get(k)) : null), save: (k, s) => mem.set(k, JSON.stringify(s)) });
  try {
    let st = emptyTmState();
    st = recordTmAnswer(st, { domain: 'decomposition', subskill: 'trueNextAction', correct: true, difficulty: 1, family: 'decompose', context: 'study' });
    saveTmState(st, 'stefan');
    const resumed = loadTmState('stefan');
    assert.equal(resumed.domains.decomposition.trueNextAction.attempts, 1, 'progress resumed');
    assert.equal(resumed.certId, 'time-management');
    // scoring is pure/serializable — round-trips through JSON with no loss
    assert.deepEqual(JSON.parse(JSON.stringify(st)).transfer, st.transfer);
  } finally { setTmPersistence(localStorageAdapter); }
});

// ---- registry: TM registered; FCTC/CFA/SIE untouched (no regression) ------------
test('time-management is registered and the other domains still resolve', () => {
  const reg = metricsRegistryFor('time-management');
  assert.ok(reg.prioritization && reg.estimation && reg.decomposition, 'TM registry built from blueprint');
  assert.ok(Object.keys(reg.prioritization.subskills).length === 5);
  for (const id of ['fctc', 'cfa-level-1', 'finra-sie']) {
    assert.ok(Object.keys(metricsRegistryFor(id)).length > 0, `${id} registry still resolves`);
  }
  const ids = listCertifications().map((c) => c.id);
  for (const id of ['fctc', 'cfa-level-1', 'finra-sie', 'time-management']) assert.ok(ids.includes(id), `${id} listed`);
});

// ---- component wiring: full loop + no fabricated percentages ---------------------
test('TimeMgmtExperience wires the adaptive loop through the store and shows no fake %', () => {
  const c = read('components/tm/TimeMgmtExperience.jsx');
  assert.match(c, /recordTmAnswer\(/); assert.match(c, /generateVariedItem\(/);
  assert.match(c, /_reteach: true/);                 // different-family practice on a miss
  assert.match(c, /support = q\._reteach \? 'reteach' : 'none'/); // support-dependence captured
  assert.match(c, /context: q\.context/);            // context transfer captured
  assert.match(c, /loadTmState|saveTmState/);        // store abstraction only
  assert.ok(!/localStorage\.(get|set|remove)Item/.test(c), 'component must not call the localStorage API directly');
  assert.ok(!/mastery \* 100/.test(c), 'no fabricated mastery percentages in the UI');
});
