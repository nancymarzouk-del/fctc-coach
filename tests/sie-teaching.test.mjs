// sie-teaching.test.mjs — Sprint 2 deep slice: 4-choice integrity, ≥2 families,
// misconception tagging, transfer-gated mastery, difficulty, anti-repetition, Alyce.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { SIE_SLICE_GENERATORS } from '../lib/certifications/sie/generators.mjs';
import { generateSieItem, generateVariedItem, generatableCells, sieConceptAnalysis, SIE_MISCONCEPTION_INFO } from '../lib/certifications/sie/sieEngine.mjs';
import { familyOf, CONCEPT_FAMILY } from '../lib/certifications/sie/families.mjs';
import { emptySieState, recordSieAnswer } from '../lib/certifications/sie/sieStore.mjs';
import { recurringMisconceptions } from '../lib/misconceptions.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');
const rng = (() => { let s = 12345; return () => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; }; })();

const CELLS = generatableCells();

test('every generated item has exactly 4 valid choices with aligned rationale/keys', () => {
  for (const c of CELLS) {
    for (let i = 0; i < 60; i++) {
      const q = generateSieItem({ topic: c.topic, subskill: c.subskill, rng });
      assert.ok(q, `${c.topic}:${c.subskill} generates`);
      assert.equal(q.options.length, 4, '4 answer choices (A–D)');
      assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, 'valid correct index');
      assert.equal(new Set(q.options).size, 4, 'options are distinct');
      assert.equal(q.meta.distractorRationale.length, 4);
      assert.equal(q.meta.misconceptions.length, 4);
      assert.equal(q.meta.distractorRationale[q.correct], null, 'correct option has no rationale');
      assert.equal(q.meta.misconceptions[q.correct], null, 'correct option has no misconception key');
      assert.ok(q.prompt && q.explanation, 'has prompt + explanation');
      assert.equal(q.family, familyOf(q.concept));
    }
  }
});

test('every concept-area exposes ≥2 question families', () => {
  for (const c of CELLS) {
    const fams = new Set();
    for (let i = 0; i < 80; i++) fams.add(generateSieItem({ topic: c.topic, subskill: c.subskill, rng }).family);
    assert.ok(fams.size >= 2, `${c.topic}:${c.subskill} has ≥2 families (got ${fams.size})`);
  }
});

test('misconception keys are tagged on distractors and all exist in the dictionary', () => {
  const usedKeys = new Set();
  for (const c of CELLS) {
    for (let i = 0; i < 80; i++) {
      const q = generateSieItem({ topic: c.topic, subskill: c.subskill, rng });
      for (const k of q.meta.misconceptions) if (k) usedKeys.add(k);
    }
  }
  assert.ok(usedKeys.size >= 8, 'the slice surfaces many misconception keys');
  for (const k of usedKeys) assert.ok(SIE_MISCONCEPTION_INFO[k], `key ${k} is defined with a learner-facing phrase`);
  // Every dictionary entry maps to a real slice area + has phrase + remediation.
  for (const [k, info] of Object.entries(SIE_MISCONCEPTION_INFO)) {
    assert.ok(info.topic && info.subskill && info.phrase && info.remediation, `${k} fully specified`);
  }
});

test('current-yield calculation answer key is correct (programmatic verify)', () => {
  let saw = 0;
  for (let i = 0; i < 200; i++) {
    const q = generateSieItem({ topic: 'products', subskill: 'debt', rng });
    if (q.concept !== 'current-yield-calc') continue;
    saw++;
    const correctText = q.options[q.correct];
    assert.equal(correctText, `${q.meta.verifyValue.toFixed(2)}%`, 'the marked-correct option equals the computed current yield');
  }
  assert.ok(saw > 0, 'current-yield-calc items were produced');
});

test('anti-repetition: generateVariedItem avoids a recently-seen concept when it can', () => {
  const c = { topic: 'trading', subskill: 'insiderTrading' };
  const first = generateSieItem({ topic: c.topic, subskill: c.subskill, rng });
  const varied = generateVariedItem({ ...c, rng, avoidConcepts: [first.concept] });
  assert.ok(varied, 'varied item produced');
  assert.notEqual(varied.concept, first.concept, 'avoided the recent concept (multi-concept area)');
});

// ---- evidence gating + transfer-gated mastery -----------------------------------
function skill(correct, wrong, difficulty = 3) {
  const history = [];
  for (let i = 0; i < correct; i++) history.push({ c: true, d: difficulty });
  for (let i = 0; i < wrong; i++) history.push({ c: false, d: difficulty });
  return { attempts: correct + wrong, correct, streak: 0, difficulty, dueIn: 0, lastSeen: 0, history };
}

test('a fresh learner is entirely Need-more-evidence (no fabricated strong/weak)', () => {
  const a = sieConceptAnalysis(emptySieState().domains, {}, {});
  assert.equal(a.strong.length, 0);
  assert.equal(a.focus.length, 0);
  assert.equal(a.developing.length, 0);
  assert.equal(a.needEvidence.length, CELLS.length, 'all slice areas await evidence');
  assert.equal(a.recommendation.kind, 'diagnostic');
});

test('one wrong answer never brands an area weak (insufficient evidence)', () => {
  const domains = { capitalMarkets: { regulators: skill(0, 1) } };
  const a = sieConceptAnalysis(domains, {}, {});
  assert.ok(!a.focus.some((x) => x.subskill === 'regulators'), 'one attempt is not enough to be a focus area');
  assert.ok(a.needEvidence.some((x) => x.subskill === 'regulators'));
});

test('Strong requires transfer: high mastery in ONE family caps at Developing (needsTransfer)', () => {
  const domains = { capitalMarkets: { regulators: skill(16, 0) } };
  const oneFamily = { 'capitalMarkets:regulators': { identification: { correct: 4, total: 4 } } };
  const a1 = sieConceptAnalysis(domains, {}, oneFamily);
  assert.ok(!a1.strong.some((x) => x.subskill === 'regulators'), 'not Strong from one family');
  assert.ok(a1.developing.some((x) => x.subskill === 'regulators' && x.needsTransfer), 'Developing + needsTransfer');

  const twoFamilies = { 'capitalMarkets:regulators': { identification: { correct: 4, total: 4 }, comparison: { correct: 3, total: 3 } } };
  const a2 = sieConceptAnalysis(domains, {}, twoFamilies);
  assert.ok(a2.strong.some((x) => x.subskill === 'regulators' && x.families >= 2), 'Strong once transfer across ≥2 families is shown');
});

test('sufficient weak evidence => Focus area, and Alyce points to it', () => {
  const domains = { products: { debt: skill(1, 8) } };
  const a = sieConceptAnalysis(domains, {}, {});
  assert.ok(a.focus.some((x) => x.subskill === 'debt'));
  assert.equal(a.recommendation.kind, 'practice-area');
  assert.equal(a.recommendation.subskill, 'debt');
});

// ---- difficulty ladder ----------------------------------------------------------
test('difficulty steps UP on a 3-correct streak and DOWN on a miss', () => {
  let s = emptySieState();
  const ans = (correct) => { s = recordSieAnswer(s, { domain: 'trading', subskill: 'orders', correct, difficulty: s.domains.trading.orders.difficulty, family: 'identification', concept: 'order-identify' }); };
  assert.equal(s.domains.trading.orders.difficulty, 1);
  ans(true); ans(true); ans(true);
  assert.equal(s.domains.trading.orders.difficulty, 2, 'stepped up after 3 correct');
  ans(false);
  assert.equal(s.domains.trading.orders.difficulty, 1, 'stepped down after a miss');
});

// ---- recurring misconception ----------------------------------------------------
test('a recurring misconception (≥3) surfaces and attaches to its area', () => {
  let s = emptySieState();
  for (let i = 0; i < 3; i++) s = recordSieAnswer(s, { domain: 'products', subskill: 'debt', correct: false, difficulty: 1, misconceptionKey: 'bond-price-yield-direction', family: 'consequence-prediction', concept: 'price-yield-direction' });
  // add enough attempts so debt is evaluated (and weak) so the pattern attaches to a focus/developing row
  for (let i = 0; i < 6; i++) s = recordSieAnswer(s, { domain: 'products', subskill: 'debt', correct: false, difficulty: 1, family: 'consequence-prediction', concept: 'price-yield-direction' });
  const rec = recurringMisconceptions(s.misconceptions);
  assert.ok(rec.some((r) => r.key === 'bond-price-yield-direction' && r.count >= 3));
  const a = sieConceptAnalysis(s.domains, s.misconceptions, s.transfer);
  const debtRow = [...a.focus, ...a.developing].find((x) => x.subskill === 'debt');
  assert.ok(debtRow && debtRow.pattern && /price/i.test(debtRow.pattern.phrase), 'the recurring pattern is attached in plain language');
});

// ---- learner-separation + persistence shape -------------------------------------
test('transfer evidence is keyed per concept-area (subskill), not per section', () => {
  let s = emptySieState();
  s = recordSieAnswer(s, { domain: 'trading', subskill: 'orders', correct: true, difficulty: 1, family: 'identification', concept: 'order-identify' });
  assert.ok(s.transfer['trading:orders'] && s.transfer['trading:orders'].identification.correct === 1);
  assert.ok(!s.transfer.trading, 'not keyed by bare section');
});

// ---- component: teaching loop, remediation, analytics, no fake data --------------
test('SieExperience wires the full teaching loop + honest analytics', () => {
  const c = read('components/sie/SieExperience.jsx');
  // ASSESS→DIAGNOSE→TEACH→PRACTICE DIFFERENTLY→ADAPT
  assert.match(c, /recordSieAnswer/);
  assert.match(c, /q\.meta\?\.misconceptions\?\.\[session\.picked\]/); // captures the picked misconception key
  assert.match(c, /generateVariedItem\(\{ topic: q\.topic, subskill: q\.subskill[\s\S]*avoidConcepts: \[q\.concept\]/); // different-family remediation
  assert.match(c, /_reteach/);
  assert.match(c, /Alyce · /);                         // teaching card
  assert.match(c, /steppedUp/); assert.match(c, /steppedDown/); // adaptive difficulty feedback
  assert.match(c, /recurring\.some\(\(r\) => r\.key === pickedKey && r\.count >= 3\)/); // recurring intervention
  // analytics
  assert.match(c, /sieConceptAnalysis/);
  assert.match(c, /Transfer demonstrated/);            // transfer status
  assert.match(c, /Need more evidence/);
  assert.match(c, /Alyce recommends/);
  assert.match(c, /TrendChip/);
  // honest baseline
  assert.match(c, /Not yet assessed/);
  assert.ok(!/\d+%\s*(ready|readiness)/i.test(c), 'no fake readiness %');
});
