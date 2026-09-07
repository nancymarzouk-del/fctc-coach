// cfa-progress-ux.test.mjs — CFA learner-facing parity: save/resume/transfer +
// per-learner storage separation. Engine analytics are tested elsewhere.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { emptyCfaState, recordCfaAnswer, cfaStorageKey } from '../lib/certifications/cfa/cfaStore.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const cmp = () => readFileSync(resolve(ROOT, 'components/cfa/CfaExperience.jsx'), 'utf8');

test('state carries resume + greeting fields', () => {
  const s = emptyCfaState();
  assert.equal(s.lastActivity, null);
  assert.equal(s.learnerName, null);
  // recordCfaAnswer never drops them.
  const next = recordCfaAnswer({ ...s, lastActivity: { kind: 'topic', topic: 'quant', label: 'Quantitative Methods' }, learnerName: 'Stefan' },
    { domain: 'quant', subskill: 'tvm', correct: true, difficulty: 2 });
  assert.deepEqual(next.lastActivity, { kind: 'topic', topic: 'quant', label: 'Quantitative Methods' });
  assert.equal(next.learnerName, 'Stefan');
});

// MULTI-LEARNER SAFETY: per-learner storage key — no cross-learner merge.
test('different learners get different CFA storage keys; direct visitor uses the base', () => {
  assert.notEqual(cfaStorageKey('aaaa1111'), cfaStorageKey('bbbb2222'));
  assert.equal(cfaStorageKey(null), 'cfa_v1');
  assert.equal(cfaStorageKey(''), 'cfa_v1');
  assert.equal(cfaStorageKey('abc123'), 'cfa_v1:abc123');
  assert.equal(cfaStorageKey('../evil key'), 'cfa_v1:evilkey'); // sanitized (alnum only)
});

// The component loads/saves scoped to the learner key (not a single shared blob).
test('CfaExperience scopes storage to the handoff learner key', () => {
  const c = cmp();
  assert.match(c, /learnerKeyRef/);
  assert.match(c, /loadCfaState\(learnerKeyRef\.current\)/);
  assert.match(c, /saveCfaState\(next, learnerKeyRef\.current\)/);
  assert.match(c, /replaceState/); // strips the handoff from the URL
});

test('CFA surfaces save confidence, welcome-back/resume, and transfer status', () => {
  const c = cmp();
  // Save confidence (device-local) — no manual Save button.
  assert.match(c, /Progress saved on this device/);
  assert.match(c, /Saving…/);
  assert.match(c, /Unable to save/);
  assert.match(c, /const \[saveState, setSaveState\]/);
  // Welcome-back + resume.
  assert.match(c, /Welcome back/);
  assert.match(c, /continueLast/);
  assert.match(c, /lastActivity/);
  // Transfer status (CFA-specific mastery signal), engine-driven.
  assert.match(c, /Transfer demonstrated/);
  assert.match(c, /needsTransfer/);
  // Alyce next-best-action + strengths/focus/untested already present.
  assert.match(c, /Alyce recommends/);
  assert.match(c, /Strong areas/);
  assert.match(c, /Focus areas/);
  assert.match(c, /Need more evidence/);
});
