// sie-scaffold.test.mjs — Sprint 1 SIE seam: verified blueprint, registry wiring,
// per-learner store, zero-fake-data shell. Content generation is out of scope here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { EXAM, TOPICS, TOPIC_ORDER, officialWeights, officialMockAllocation, CERT_ID, CERT_NAME, SUBSKILL_BLUEPRINT } from '../lib/certifications/sie/sieBlueprint.mjs';
import { getCertification, metricsRegistryFor, coverageCells, listCertifications } from '../lib/certRegistry.mjs';
import { emptySieState, recordSieAnswer, sieStorageKey, loadSieState } from '../lib/certifications/sie/sieStore.mjs';
import { analyzeSkills, EVIDENCE } from '../lib/metrics.mjs';
import { emptyMisconceptionMemory, recordMisconception } from '../lib/misconceptions.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

// ---- verified © 2025 FINRA structure (NOT the old 85/10) ------------------------
test('SIE exam metadata matches the verified 2025 FINRA outline', () => {
  assert.equal(EXAM.scoredQuestions, 75);
  assert.equal(EXAM.pretestQuestions, 5);      // NOT 10
  assert.equal(EXAM.totalPresented, 80);       // NOT 85
  assert.equal(EXAM.minutes, 105);             // 1h45m
  assert.equal(EXAM.answerChoices, 4);         // A-D (not CFA's 3)
  assert.equal(EXAM.negativeMarking, false);   // no penalty for guessing
});

test('four official sections with correct weights and scored-item counts', () => {
  assert.deepEqual(TOPIC_ORDER, ['capitalMarkets', 'products', 'trading', 'regulatory']);
  assert.equal(TOPICS.capitalMarkets.pct, 16); assert.equal(TOPICS.capitalMarkets.items, 12);
  assert.equal(TOPICS.products.pct, 44);       assert.equal(TOPICS.products.items, 33);
  assert.equal(TOPICS.trading.pct, 31);        assert.equal(TOPICS.trading.items, 23);
  assert.equal(TOPICS.regulatory.pct, 9);      assert.equal(TOPICS.regulatory.items, 7);
  // counts sum to 75 scored
  assert.equal(TOPIC_ORDER.reduce((a, k) => a + TOPICS[k].items, 0), 75);
});

test('officialWeights sum to 1 and mock allocation reproduces 12/33/23/7 at 75', () => {
  const w = officialWeights();
  assert.ok(Math.abs(TOPIC_ORDER.reduce((a, k) => a + w[k], 0) - 1) < 1e-9);
  assert.deepEqual(officialMockAllocation(75), { capitalMarkets: 12, products: 33, trading: 23, regulatory: 7 });
  // a smaller mock still sums exactly to its total
  const m = officialMockAllocation(40);
  assert.equal(Object.values(m).reduce((a, b) => a + b, 0), 40);
});

// ---- registry wiring (single registration seam) ---------------------------------
test('SIE is registered and drives the shared metrics registry', () => {
  const cert = getCertification('finra-sie');
  assert.ok(cert, 'finra-sie registered');
  assert.equal(cert.id, CERT_ID);
  assert.equal(cert.id, 'finra-sie');
  assert.equal(cert.calculatorAllowed, false);
  assert.equal(cert.examSeconds, 105 * 60);
  const reg = metricsRegistryFor('finra-sie');
  assert.deepEqual(Object.keys(reg), TOPIC_ORDER);
  // each section exposes its subskills (minus the _cognitive descriptor)
  for (const k of TOPIC_ORDER) assert.ok(Object.keys(reg[k].subskills).length >= 3, `${k} has subskills`);
  assert.ok(coverageCells('finra-sie').length >= 25, 'coverage cells enumerated');
  assert.ok(listCertifications().some((c) => c.id === 'finra-sie'));
  // CFA still present (no regression to the registry)
  assert.ok(getCertification('cfa-level-1'));
  assert.ok(getCertification('fctc'));
});

// ---- per-learner store, no merge ------------------------------------------------
test('SIE storage keys are per-learner and sanitized (no cross-learner merge)', () => {
  assert.equal(sieStorageKey(null), 'sie_v1');
  assert.equal(sieStorageKey(''), 'sie_v1');
  assert.equal(sieStorageKey('abc123'), 'sie_v1:abc123');
  assert.notEqual(sieStorageKey('aaaa1111'), sieStorageKey('bbbb2222'));
  assert.equal(sieStorageKey('../evil key'), 'sie_v1:evilkey'); // alnum only
});

test('empty SIE state carries resume + evidence structures and records immutably', () => {
  const s = emptySieState();
  assert.equal(s.certId, 'finra-sie');
  assert.equal(s.lastActivity, null);
  assert.equal(s.learnerName, null);
  assert.equal(s.totalAnswered, 0);
  assert.deepEqual(s.misconceptions, emptyMisconceptionMemory());
  assert.deepEqual(s.transfer, {});
  assert.deepEqual(s.recentConcepts, []);
  assert.deepEqual(Object.keys(s.domains), TOPIC_ORDER); // granular subskill history ready
  // recording preserves resume fields + accrues family/misconception evidence
  const next = recordSieAnswer({ ...s, lastActivity: { kind: 'section', topic: 'products', label: 'x' }, learnerName: 'Stefan' },
    { domain: 'products', subskill: 'equity', correct: false, difficulty: 1, misconceptionKey: 'common-vs-preferred-rights', family: 'compare', concept: 'equity' });
  assert.deepEqual(next.lastActivity, { kind: 'section', topic: 'products', label: 'x' });
  assert.equal(next.learnerName, 'Stefan');
  assert.equal(next.totalAnswered, 1);
  assert.equal(next.transfer['products:equity'].compare.total, 1);
  assert.equal(next.misconceptions.counts['common-vs-preferred-rights'], 1);
});

// ---- ZERO FAKE DATA: a fresh learner is entirely "not assessed" -------------------
test('a fresh learner has no evidence — every subskill UNTESTED, nothing evaluated', () => {
  const s = emptySieState();
  const rows = analyzeSkills(s.domains, metricsRegistryFor('finra-sie'));
  assert.ok(rows.length >= 25);
  assert.ok(rows.every((r) => r.evidenceState === EVIDENCE.UNTESTED), 'no fabricated evidence');
  assert.equal(rows.filter((r) => r.evidenceState === EVIDENCE.EVALUATED).length, 0);
});

// ---- shared misconceptions promotion (CFA re-export intact) ----------------------
test('misconceptions are promoted to shared and CFA re-exports them (no CFA regression)', () => {
  let m = emptyMisconceptionMemory();
  m = recordMisconception(m, 'k'); m = recordMisconception(m, 'k');
  assert.equal(m.counts.k, 2);
  const cfaShim = read('lib/certifications/cfa/misconceptions.mjs');
  assert.match(cfaShim, /export \* from '\.\.\/\.\.\/misconceptions\.mjs'/);
});

// ---- learner shell: honest, no fake data, per-learner, save/resume ---------------
test('SieExperience shell is honest and evidence-aware (no fake readiness/weakness)', () => {
  const c = read('components/sie/SieExperience.jsx');
  assert.match(c, /Back to UALE/);
  assert.match(c, /Professional Certification/);
  assert.match(c, /Progress saved on this device/);          // save badge
  assert.match(c, /Saving…/); assert.match(c, /Unable to save/);
  assert.match(c, /saved on this device/);                    // device-local disclosure
  assert.match(c, /Welcome back/); assert.match(c, /continueLast/); assert.match(c, /lastActivity/);
  assert.match(c, /Not yet assessed/);                        // honest baseline
  assert.match(c, /Alyce recommends/);                        // Alyce card (copy is evidence-driven, not hard-coded)
  assert.match(c, /loadSieState\(learnerKeyRef\.current\)/);  // per-learner load
  assert.match(c, /saveSieState\(next, learnerKeyRef\.current\)/);
  assert.match(c, /replaceState/);                            // strips handoff from URL
  assert.match(c, /TOPIC_ORDER\.map/);                        // the four sections rendered
  // No fabricated readiness percentage anywhere. (Fresh-learner honesty — no strong/
  // focus without evidence — is verified by the sieConceptAnalysis logic tests.)
  assert.ok(!/readiness[^]*\d+%/i.test(c), 'no fake readiness %');
});
