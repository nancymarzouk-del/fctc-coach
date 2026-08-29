// ============================================================================
// tests/metrics.test.mjs — regression + product-rule tests for the metrics core.
// Run: `node --test` (or `npm test`).
// ----------------------------------------------------------------------------
// These lock the ONE rule the coach must never break: "not enough evidence yet"
// is not the same as "a demonstrated weak area." A skill is never called weak on
// one or two attempts, readiness is never a fake precise number, and the
// weakest RAW percentage never wins the recommendation over a real weakness.
// ============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_EVIDENCE, WEAK_THRESHOLD, EVIDENCE,
  classifySkill, analyzeSkills, readiness, nextBestAction, skillNeed,
  masteryEstimate, confidenceEstimate, recencyWeightedAccuracy, improvementTrend,
} from '../lib/metrics.mjs';
import { LEARNERS, REGISTRY, sub, T, F, rep } from './fixtures.mjs';

const clf = (s) => classifySkill(s, { subskillLabel: 'X', domainLabel: 'D' });
const nba = (L) => nextBestAction(L.domains, REGISTRY, { totalAnswered: L.totalAnswered });
const find = (L, dk, sk) => classifySkill(L.domains[dk][sk], {
  domain: dk, subskill: sk, subskillLabel: sk, domainLabel: dk,
});

// ---- Core evidence-model regressions ---------------------------------------

test('REGRESSION: a single miss is NOT a demonstrated weakness (and mastery != 0)', () => {
  const c = clf(sub([F]));
  assert.equal(c.evidenceState, EVIDENCE.INSUFFICIENT);
  assert.equal(c.demonstratedWeak, false, 'one miss must never be "demonstrated weak"');
  assert.ok(c.mastery > 0, `mastery from one miss must not be 0 (was ${c.mastery})`);
  assert.ok(c.mastery < 0.5, 'but it should lean below neutral');
});

test('REGRESSION: a single correct is NOT demonstrated mastery, and confidence is low', () => {
  const c = clf(sub([T]));
  assert.equal(c.demonstratedStrong, false);
  assert.ok(c.confidence < 0.3, `one correct answer must not read as confident (was ${c.confidence})`);
});

test('evidence states gate on MIN_EVIDENCE', () => {
  assert.equal(clf(sub([])).evidenceState, EVIDENCE.UNTESTED);
  assert.equal(clf(sub(rep(T, MIN_EVIDENCE - 1))).evidenceState, EVIDENCE.INSUFFICIENT);
  assert.equal(clf(sub(rep(T, MIN_EVIDENCE))).evidenceState, EVIDENCE.EVALUATED);
});

test('untested skill is never weak and never out-ranks a real weakness', () => {
  const untested = clf(sub([]));
  assert.equal(untested.untested, true);
  assert.equal(untested.demonstratedWeak, false);
  const realWeak = clf(sub(rep(F, 6)));
  assert.ok(skillNeed(realWeak) > skillNeed(untested), 'a demonstrated weakness must rank above an untested skill');
});

test('recency: an early miss then improvement is not weak', () => {
  const c = clf(sub([F, ...rep(T, 9)]));
  assert.equal(c.demonstratedWeak, false);
  assert.ok(recencyWeightedAccuracy(c ? sub([F, ...rep(T, 9)]).history : []) > 0.8);
  assert.ok(c.mastery > 0.7, `recovered mastery should be high (was ${c.mastery})`);
});

test('readiness is withheld until enough skills are evaluated (no false precision)', () => {
  const r1 = readiness(LEARNERS.few_attempts_high_acc().domains, REGISTRY);
  assert.equal(r1.score, null);
  assert.equal(r1.sufficientEvidence, false);
  assert.equal(r1.band, 'building');
  const r2 = readiness(LEARNERS.strong_one_weak().domains, REGISTRY);
  assert.equal(typeof r2.score, 'number');
  assert.equal(r2.sufficientEvidence, true);
});

// ---- The ten simulated learners: key behavioral assertions ------------------

test('L1 new learner: nothing is weak; recommendation is build/new/start, never weak', () => {
  const L = LEARNERS.new_learner();
  const any = analyzeSkills(L.domains, REGISTRY);
  assert.equal(any.some((c) => c.demonstratedWeak), false);
  assert.ok(['build', 'new', 'start'].includes(nba(L).kind));
});

test('L2 early miss then strong: levers evaluated but NOT weak; NBA not that skill', () => {
  const L = LEARNERS.early_miss_then_strong();
  const lev = find(L, 'mechanical', 'levers');
  assert.equal(lev.demonstratedWeak, false);
  assert.notEqual(nba(L).subskill, 'levers');
});

test('L3 strong + one weak: NBA targets the weak skill with concrete evidence', () => {
  const L = LEARNERS.strong_one_weak();
  const a = nba(L);
  assert.equal(a.kind, 'weak');
  assert.equal(a.subskill, 'pulleys');
  assert.match(a.why, /missed \d+ of your last \d+/i);
});

test('L4 few attempts high accuracy: insufficient, not mastered, readiness withheld', () => {
  const L = LEARNERS.few_attempts_high_acc();
  const r = find(L, 'math', 'ratios');
  assert.equal(r.evidenceState, EVIDENCE.INSUFFICIENT);
  assert.equal(r.demonstratedStrong, false);
  assert.equal(readiness(L.domains, REGISTRY).score, null);
});

test('L5 sustained weakness: demonstrated weak, high confidence, NBA weak', () => {
  const L = LEARNERS.sustained_weak();
  const h = find(L, 'mechanical', 'hydraulics');
  assert.equal(h.demonstratedWeak, true);
  assert.ok(h.confidence > 0.3, `sustained weakness should be fairly confident (was ${h.confidence})`);
  assert.equal(nba(L).subskill, 'hydraulics');
});

test('L6 rapid improvement: trend improving, recovered, not the top weakness', () => {
  const L = LEARNERS.rapid_improve();
  const g = find(L, 'mechanical', 'gears');
  assert.equal(g.trend.trend, 'improving');
  assert.ok(g.weightedAccuracy > 0.5, `recency should reward the recovery (was ${g.weightedAccuracy})`);
});

test('L7 alternating: unstable => low confidence', () => {
  const L = LEARNERS.alternating();
  const p = find(L, 'math', 'percentages');
  assert.ok(p.confidence < 0.35, `alternating results must read as low-confidence (was ${p.confidence})`);
});

test('L8 lucky streak: 3/3 is insufficient evidence, not mastered', () => {
  const L = LEARNERS.lucky_streak();
  const g = find(L, 'mechanical', 'gears');
  assert.equal(g.evidenceState, EVIDENCE.INSUFFICIENT);
  assert.equal(g.demonstratedStrong, false);
  assert.notEqual(nba(L).kind, 'maintain');
});

test('L9 stale domain: with no weaknesses, NBA is a spaced review of the overdue skill', () => {
  const L = LEARNERS.stale_domain();
  const a = nba(L);
  assert.equal(a.kind, 'review');
  assert.match(a.why, /while|spaced|review/i);
});

test('L10 thin-evidence trap: weakest RAW % (1 wrong) is IGNORED; real weakness wins', () => {
  const L = LEARNERS.thin_evidence_trap();
  const hyd = find(L, 'mechanical', 'hydraulics'); // 0% raw, 1 attempt
  const pul = find(L, 'mechanical', 'pulleys');    // ~55%, evaluated
  assert.equal(hyd.demonstratedWeak, false, 'a 1-attempt 0% must not be called weak');
  assert.equal(pul.demonstratedWeak, true);
  const a = nba(L);
  assert.equal(a.subskill, 'pulleys', 'NBA must pick the evidenced weakness, not the thin 0%');
});

// ---- NBA copy always answers "what next AND why" ----------------------------
test('every non-start next-best-action carries a why sentence', () => {
  for (const make of Object.values(LEARNERS)) {
    const L = make();
    const a = nextBestAction(L.domains, REGISTRY, { totalAnswered: L.totalAnswered });
    assert.ok(a.title && a.why && a.why.length > 12, `${L.label}: NBA must explain itself`);
  }
});

// ---- Determinism ------------------------------------------------------------
test('metrics are deterministic (same input => same output)', () => {
  const L = LEARNERS.strong_one_weak();
  assert.deepEqual(nba(L), nba(L));
  assert.deepEqual(analyzeSkills(L.domains, REGISTRY), analyzeSkills(L.domains, REGISTRY));
});
