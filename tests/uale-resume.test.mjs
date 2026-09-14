// uale-resume.test.mjs — shared incomplete-session RESUME across every module.
// ----------------------------------------------------------------------------
// A learner who leaves a session after 15/30 must return to the SAME session at
// item 16 — no restart, no regeneration, no double-counted evidence — with the
// adaptive/remediation order preserved and full learner isolation. Pure-behavior
// tests of the shared abstraction + source-grep of each module's wiring.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  createActiveSession, recordAnswerAt, setQueue, setIndex, markComplete,
  answeredCount, totalCount, nextUnansweredIndex, isComplete, isResumable, resumeSummary,
  activeSessionKey, sessionToRecord,
  setActiveSessionPersistence, saveActiveSession, loadActiveSession, clearActiveSession,
} from '../lib/activeSession.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

function memoryAdapter() {
  const m = new Map();
  return { load: (k) => (m.has(k) ? JSON.parse(m.get(k)) : null), save: (k, r) => m.set(k, JSON.stringify(r)), remove: (k) => m.delete(k), _map: m };
}
const makeQueue = (n) => Array.from({ length: n }, (_, i) => ({ id: `q${i}`, stem: `Q${i}`, options: ['a', 'b', 'c', 'd'], correct: 0 }));

// ============ core resume behavior ============
test('leave after 15/30 → resume continues at index 15 (the 16th), never at 1', () => {
  let rec = createActiveSession({ module: 'cfa', learnerKey: 'L', sessionType: 'mixed', label: 'Mixed practice', queue: makeQueue(30), nowMs: 1 });
  for (let i = 0; i < 15; i++) { rec = recordAnswerAt(rec, i, { picked: 0, correct: true }, 2); rec = setIndex(rec, i + 1, 2); }
  assert.equal(answeredCount(rec), 15);
  assert.equal(totalCount(rec), 30);
  assert.equal(nextUnansweredIndex(rec), 15);   // 0-based → the 16th question
  assert.equal(isResumable(rec), true);
  assert.deepEqual(resumeSummary(rec), { completed: 15, total: 30, label: 'Mixed practice', sessionType: 'mixed', sessionId: rec.sessionId });
});

test('previously answered items are preserved and never double-counted (idempotent)', () => {
  let rec = createActiveSession({ module: 'sie', learnerKey: 'L', queue: makeQueue(10), nowMs: 1 });
  rec = recordAnswerAt(rec, 0, { picked: 1, correct: false }, 2);
  rec = recordAnswerAt(rec, 0, { picked: 2, correct: true }, 3); // re-answer same index → ignored
  assert.equal(answeredCount(rec), 1);
  assert.deepEqual(rec.answers[0], { picked: 1, correct: false }, 'first submission is authoritative; never overwritten');
});

test('adaptive remediation order is preserved across a resume', () => {
  let rec = createActiveSession({ module: 'fctc', learnerKey: 'L', queue: makeQueue(5), nowMs: 1 });
  rec = recordAnswerAt(rec, 0, { picked: 3, correct: false }, 2);
  // a wrong answer splices a remediation item right after index 0
  const q = rec.queue.slice();
  q.splice(1, 0, { id: 'reteach-A', stem: 'remediation', options: ['a', 'b'], correct: 0, _reteach: true });
  rec = setQueue(rec, q);
  rec = setIndex(rec, 1, 3);
  assert.equal(totalCount(rec), 6);
  assert.equal(rec.queue[1].id, 'reteach-A', 'remediation kept at its inserted position');
  assert.equal(nextUnansweredIndex(rec), 1, 'resume lands on the remediation item next');
});

test('a completed session is not resumable and reports complete', () => {
  let rec = createActiveSession({ module: 'cfa', learnerKey: 'L', queue: makeQueue(3), nowMs: 1 });
  for (let i = 0; i < 3; i++) rec = recordAnswerAt(rec, i, { picked: 0, correct: true }, 2);
  assert.equal(isComplete(rec), true);
  assert.equal(isResumable(rec), false);
  assert.equal(resumeSummary(rec), null);
  const done = markComplete(rec, 9);
  assert.equal(done.status, 'complete');
});

test('a barely-started (0 answered) session is not surfaced as resumable', () => {
  const rec = createActiveSession({ module: 'sie', learnerKey: 'L', queue: makeQueue(10), nowMs: 1 });
  assert.equal(isResumable(rec), false);
  assert.equal(resumeSummary(rec), null);
});

// ============ persistence + learner isolation ============
test('save/load round-trips, and Start over (clear) removes the session', () => {
  const adapter = memoryAdapter();
  setActiveSessionPersistence(adapter);
  try {
    let rec = createActiveSession({ module: 'tm', learnerKey: 'amira', sessionType: 'area', label: 'Prioritization', queue: makeQueue(8), nowMs: 1 });
    rec = recordAnswerAt(rec, 0, { picked: 0, correct: true }, 2);
    saveActiveSession(rec);
    const loaded = loadActiveSession('tm', 'amira');
    assert.equal(loaded.queue.length, 8);
    assert.equal(answeredCount(loaded), 1);
    clearActiveSession('tm', 'amira');           // Start over archives the incomplete session
    assert.equal(loadActiveSession('tm', 'amira'), null);
  } finally { setActiveSessionPersistence(null); }
});

test('learner A never sees learner B’s session (per-learner, per-module keys)', () => {
  const adapter = memoryAdapter();
  setActiveSessionPersistence(adapter);
  try {
    let a = createActiveSession({ module: 'cfa', learnerKey: 'A', queue: makeQueue(10), nowMs: 1 });
    a = recordAnswerAt(a, 0, { picked: 0, correct: true }, 2);
    saveActiveSession(a);
    assert.equal(loadActiveSession('cfa', 'B'), null, 'B has no session');
    assert.notEqual(activeSessionKey('cfa', 'A'), activeSessionKey('cfa', 'B'));
    // module isolation too: same learner, different module → different slot
    assert.notEqual(activeSessionKey('cfa', 'A'), activeSessionKey('sie', 'A'));
  } finally { setActiveSessionPersistence(null); }
});

test('sessionToRecord captures the live session shape (queue + answers + idx) for resume', () => {
  const session = { queue: makeQueue(4), answers: { 0: { picked: 0, correct: true } }, idx: 1, label: 'Diagnostic', sessionType: 'diagnostic', sessionId: 'cfa-1', startedAt: 1, targetCount: 4 };
  const rec = sessionToRecord(session, { module: 'cfa', learnerKey: 'L', nowMs: 5 });
  assert.equal(rec.module, 'cfa');
  assert.equal(rec.learnerKey, 'L');
  assert.equal(totalCount(rec), 4);
  assert.equal(answeredCount(rec), 1);
  assert.equal(rec.status, 'in-progress');
  assert.equal(nextUnansweredIndex(rec), 1);
});

// ============ per-module wiring (source) ============
const QUESTION_MODULES = [
  { name: 'FCTC', file: 'app/page.js', module: 'fctc' },
  { name: 'CFA', file: 'components/cfa/CfaExperience.jsx', module: 'cfa' },
  { name: 'SIE', file: 'components/sie/SieExperience.jsx', module: 'sie' },
  { name: 'Time Management Practice', file: 'components/tm/TimeMgmtExperience.jsx', module: 'time' },
];

for (const m of QUESTION_MODULES) {
  test(`${m.name}: wires the shared resume abstraction (persist, resume-at-next, start-over, clear-on-complete)`, () => {
    const src = read(m.file);
    assert.match(src, /from '.*lib\/activeSession\.mjs'/, `${m.name} imports the shared abstraction`);
    assert.match(src, new RegExp(`RESUME_MODULE = '${m.module}'`), `${m.name} declares its module id`);
    assert.match(src, /saveActiveSession\(/, `${m.name} persists the in-progress session`);
    assert.match(src, /nextUnansweredIndex\(/, `${m.name} resumes at the next unanswered item (not index 0)`);
    assert.match(src, /clearActiveSession\(/, `${m.name} clears on completion / start over`);
    assert.match(src, /resumeSession/, `${m.name} has a resume handler`);
    assert.match(src, /restartSession/, `${m.name} has a start-over handler`);
    // learner-scoped (isolation)
    assert.match(src, /(learnerKeyRef\.current|userId)/, `${m.name} keys the session by learner`);
  });

  test(`${m.name}: surfaces a prominent "Continue where you left off … completed" card with Start over`, () => {
    const src = read(m.file);
    assert.match(src, /Continue where you left off/);
    assert.match(src, /completed}? of {resumable\.total|resumable\.completed/); // "X of Y completed"
    assert.match(src, /Start over/);
    assert.match(src, /resumeSession/);
    assert.match(src, /restartSession/);
  });
}

// ============ timed mock policy (preserved, documented) ============
test('FCTC timed mock stays single-sitting: it is NOT wired into the resumable session store', () => {
  const mock = read('components/MockExam.jsx');
  // The mock keeps its timer + answers in memory only — no persistence, no resume.
  assert.ok(!/activeSession|saveActiveSession|loadActiveSession/.test(mock), 'mock does not use the resume store');
  assert.match(mock, /const \[timeLeft, setTimeLeft\] = useState/); // in-memory timer
  // Entering a mock does not create a resumable question session (it is setPage('mock'),
  // handled by MockExam, not the startSession resume path).
  const app = read('app/page.js');
  assert.match(app, /a\.kind === 'mock'\) setPage\('mock'\)/);
});
