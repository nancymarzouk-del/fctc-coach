// cfa-refinement.test.mjs — learner-facing strengths/focus analysis, CFA/FCTC
// metadata isolation, and Back-to-UALE navigation (Sprint: learner-experience refinement).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { cfaTopicAnalysis } from '../lib/certifications/cfa/cfaEngine.mjs';
import { emptyMisconceptionMemory, recordMisconception } from '../lib/certifications/cfa/misconceptions.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

function sub(nCorrect, nWrong) {
  const history = [];
  for (let i = 0; i < nCorrect; i++) history.push({ c: true, d: 2 });
  for (let i = 0; i < nWrong; i++) history.push({ c: false, d: 2 });
  return { attempts: nCorrect + nWrong, correct: nCorrect, streak: 0, difficulty: 2, dueIn: 0, lastSeen: 0, history };
}
const mem = (pairs) => { let m = emptyMisconceptionMemory(); for (const [k, n] of pairs) for (let i = 0; i < n; i++) m = recordMisconception(m, k); return m; };

// ---- strengths / focus classification (evidence-gated) --------------------------
test('a brand-new learner gets no fake strengths/weaknesses; recommendation is a diagnostic', () => {
  const a = cfaTopicAnalysis({}, emptyMisconceptionMemory());
  assert.equal(a.hasEnoughEvidence, false);
  assert.equal(a.strong.length, 0);
  assert.equal(a.focus.length, 0);
  assert.equal(a.needEvidence.length, 10, 'all ten topics await evidence');
  assert.equal(a.recommendation.kind, 'diagnostic');
});

test('a single wrong answer never produces a focus/weak label or a misconception', () => {
  const a = cfaTopicAnalysis({ quant: { tvm: sub(0, 1) } }, mem([['present-vs-future-value', 1]]));
  assert.ok(!a.focus.some((x) => x.topic === 'quant'), 'one attempt is insufficient evidence');
  assert.ok(a.needEvidence.includes('quant'));
  assert.equal(a.patterns.length, 0, 'one observation is not a recurring misconception');
});

test('sufficient strong evidence => strong area; sufficient weak evidence => focus area', () => {
  const transfer = { quant: { calculation: { correct: 6, total: 6 }, 'conceptual-interpretation': { correct: 3, total: 3 } } };
  const a = cfaTopicAnalysis({ quant: { tvm: sub(12, 0) }, fixedIncome: { concepts: sub(1, 6) } }, emptyMisconceptionMemory(), transfer);
  assert.ok(a.strong.some((x) => x.topic === 'quant'));
  assert.ok(a.focus.some((x) => x.topic === 'fixedIncome'));
  assert.equal(a.recommendation.kind, 'practice-topic');
  assert.equal(a.recommendation.topic, 'fixedIncome'); // weakest focus drives the next step
});

test('analysis evolves as evidence changes (need-evidence -> focus -> strong)', () => {
  assert.ok(cfaTopicAnalysis({}, {}).needEvidence.includes('equity'));
  assert.ok(cfaTopicAnalysis({ equity: { concepts: sub(1, 6) } }, {}).focus.some((x) => x.topic === 'equity'));
  const tr = { equity: { calculation: { correct: 6, total: 6 }, 'conceptual-interpretation': { correct: 3, total: 3 } } };
  assert.ok(cfaTopicAnalysis({ equity: { concepts: sub(12, 0) } }, {}, tr).strong.some((x) => x.topic === 'equity'));
});

test('all ten topics can participate in the analysis', () => {
  const domains = {};
  for (const t of ['ethics', 'quant', 'economics', 'fsa', 'corpFinance', 'equity', 'fixedIncome', 'derivatives', 'altInvestments', 'portfolio']) {
    domains[t] = { concepts: sub(6, 0) };
  }
  const a = cfaTopicAnalysis(domains, {});
  assert.equal(a.strong.length + a.developing.length, 10);
  assert.equal(a.needEvidence.length, 0);
});

test('a recurring, evidence-backed misconception attaches to its focus topic in plain language', () => {
  const a = cfaTopicAnalysis({ fixedIncome: { concepts: sub(1, 6) } }, mem([['bond-price-yield-inverse', 3]]));
  const fi = a.focus.find((x) => x.topic === 'fixedIncome');
  assert.ok(fi && fi.pattern, 'the focus topic should carry the pattern');
  assert.match(fi.pattern.phrase, /bond prices and yields/);
  assert.match(a.recommendation.text, /bond prices and yields/); // Alyce weaves it into the next step
  // No engine IDs leak into learner-facing text.
  assert.ok(!/misconception|diagnostic|json|rpc/i.test(a.recommendation.text));
});

// ---- CFA vs FCTC metadata isolation --------------------------------------------
test('/cfa has CFA/UALE metadata and does NOT inherit the FCTC firefighter title', () => {
  const cfa = read('app/cfa/page.js');
  assert.match(cfa, /title:\s*'CFA Level I \| UALE'/);
  // Only the metadata block matters (comments may legitimately mention FCTC).
  const metaBlock = cfa.slice(cfa.indexOf('export const metadata'), cfa.indexOf('export default'));
  assert.ok(metaBlock.length > 0 && !/FCTC|Firefighter/i.test(metaBlock), 'CFA metadata must not carry FCTC/firefighter branding');
});

test('the FCTC app retains its own FCTC metadata (no cross-contamination)', () => {
  const layout = read('app/layout.tsx');
  assert.match(layout, /title:\s*'FCTC — Firefighter Written Test Prep'/);
  // The FCTC home does not override to a CFA title.
  const home = read('app/page.js');
  assert.ok(!/CFA Level I \| UALE/.test(home));
});

// ---- Back-to-UALE navigation (does not grant access) ----------------------------
test('CFA provides a Back-to-UALE link to the UALE home and grants no capabilities', () => {
  const src = read('components/cfa/CfaExperience.jsx');
  assert.match(src, /Back to UALE/);
  assert.match(src, /florence-sand-phi\.vercel\.app/); // returns to the capability-aware UALE home
  // Navigation only — the CFA client contains no authorization/capability-granting logic.
  assert.ok(!/is_admin|hasCapability|grantCapability|beta_testers/i.test(src), 'CFA client must not implement authorization');
});
