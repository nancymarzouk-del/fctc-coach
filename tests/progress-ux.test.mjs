// progress-ux.test.mjs — the learner-facing progress/save/resume surfacing.
// The engine is already tested; here we lock the EVIDENCE STATES the dashboard shows
// (untested != weak, strengths/focus are demonstrated, insufficient is separate) and
// the UI wiring for save-confidence / welcome-back / strengths / Alyce.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { classifySkill, EVIDENCE } from '../lib/metrics.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const page = () => readFileSync(resolve(ROOT, 'app/page.js'), 'utf8');
function sub(nCorrect, nWrong) {
  const h = [];
  for (let i = 0; i < nCorrect; i++) h.push({ c: true, d: 2 });
  for (let i = 0; i < nWrong; i++) h.push({ c: false, d: 2 });
  return { attempts: nCorrect + nWrong, correct: nCorrect, streak: 0, difficulty: 2, dueIn: 0, lastSeen: 0, history: h };
}
const meta = { subskillLabel: 'X', domainLabel: 'D' };

// ---- evidence states the learner sees ------------------------------------------
test('an untested skill is never shown as weak OR strong', () => {
  const c = classifySkill(sub(0, 0), meta);
  assert.equal(c.evidenceState, EVIDENCE.UNTESTED);
  assert.equal(c.demonstratedWeak, false);
  assert.equal(c.demonstratedStrong, false);
});

test('insufficient evidence is separate — not weak, not strong', () => {
  const c = classifySkill(sub(1, 1), meta); // 2 attempts < MIN_EVIDENCE
  assert.equal(c.evidenceState, EVIDENCE.INSUFFICIENT);
  assert.equal(c.demonstratedWeak, false);
  assert.equal(c.demonstratedStrong, false);
});

test('a STRENGTH requires demonstrated evidence (evaluated + consistently correct)', () => {
  const c = classifySkill(sub(8, 0), meta);
  assert.equal(c.evidenceState, EVIDENCE.EVALUATED);
  assert.equal(c.demonstratedStrong, true);
  assert.equal(c.demonstratedWeak, false);
});

test('a FOCUS AREA requires demonstrated weakness (evaluated + low accuracy), not low activity', () => {
  const c = classifySkill(sub(1, 7), meta);
  assert.equal(c.evidenceState, EVIDENCE.EVALUATED);
  assert.equal(c.demonstratedWeak, true);
  assert.equal(c.demonstratedStrong, false);
});

// ---- learner-facing UI wiring (page.js) ----------------------------------------
test('save confidence is surfaced (autosave visible, device-local disclosure, no manual Save)', () => {
  const p = page();
  assert.match(p, /const \[saveState, setSaveState\]/);
  assert.match(p, /setSaveState\('saving'\)/);          // flashes on autosave
  assert.match(p, /Progress saved on this device/);      // steady state + device-local disclosure
  assert.match(p, /Saving…/);
  assert.match(p, /Unable to save/);
  assert.ok(!/Save progress<\/button>|onClick=\{[^}]*manualSave/.test(p), 'no manual Save button');
});

test('return/resume + strengths + Alyce are surfaced', () => {
  const p = page();
  assert.match(p, /Welcome back, /);                     // return framing
  assert.match(p, /Continue \{cont\.label\}/);           // resume the last activity
  assert.match(p, /demonstratedStrong/);                 // Strengths from real evidence
  assert.match(p, />Strengths</);                        // a distinct Strengths section
  assert.match(p, /Focus areas/);                        // and a distinct Focus areas section
  assert.match(p, /Alyce recommends/);                   // next-best action attributed to Alyce
  assert.match(p, /\{nba\.why\}/);                       // the learner-facing "why"
});
