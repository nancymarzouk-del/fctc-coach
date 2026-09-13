// time-management-application.test.mjs — Sprint 2 Application Mode ("Plan My Day").
// Verifies coaching logic + STRICT separation from learning mastery + device-local
// privacy. Pure/deterministic. Reuses NOTHING that could mutate Sprint 1 state.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  capacityAnalysis, prioritize, buildPlan, nextBestAction, ambiguityCheck,
  estimationRisk, reviewInsight, applicationInsights, priorityScore,
} from '../lib/certifications/tm/tmApplication.mjs';
import {
  emptyApplicationState, addTask, updateTask, removeTask, setAvailableMinutes,
  decomposeTask, recordReview, tmApplicationStorageKey, loadApplicationState,
  saveApplicationState, setTmApplicationPersistence, localStorageAdapter,
} from '../lib/certifications/tm/tmApplicationStore.mjs';
import { tmStorageKey, emptyTmState, recordTmAnswer } from '../lib/certifications/tm/tmStore.mjs';
import { tmConceptAnalysis } from '../lib/certifications/tm/tmEngine.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

// The prescribed manual scenario (available 3h = 180m).
function scenario() {
  let s = emptyApplicationState({ date: '2026-09-12' });
  s = setAvailableMinutes(s, 180);
  s = addTask(s, { id: 'pres', title: 'Finish quarterly presentation', estimatedMinutes: 120, deadline: 'tomorrow', impact: 'high' });
  s = addTask(s, { id: 'mgr', title: 'Reply to manager', estimatedMinutes: 20, deadline: 'today', blocking: true, urgency: 'high' });
  s = addTask(s, { id: 'sie', title: 'Study SIE', estimatedMinutes: 90, deadline: 'none', impact: 'med' });
  s = addTask(s, { id: 'dent', title: 'Call dentist', estimatedMinutes: 15, deadline: 'none', impact: 'low' });
  s = addTask(s, { id: 'bank', title: 'Review bank statement', estimatedMinutes: 45, deadline: 'none', impact: 'low' });
  return s;
}

// ---- capacity vs planned + overcommitment ---------------------------------------
test('capacity: planned load vs available time is computed and overcommitment surfaced', () => {
  const cap = capacityAnalysis(scenario().tasks, 180);
  assert.equal(cap.plannedMinutes, 290);
  assert.equal(cap.availableMinutes, 180);
  assert.equal(cap.overcommitted, true);
  assert.equal(cap.overBy, 110);
});

// ---- prioritization: impact + urgency + dependency (NOT deadline/shortest only) --
test('prioritization puts the blocking due-today task first, then high-impact — not shortest/soonest', () => {
  const order = prioritize(scenario().tasks).map((p) => p.id);
  assert.equal(order[0], 'mgr', 'blocking + due today leads');
  assert.equal(order[1], 'pres', 'high impact next, even though due tomorrow and longer');
  // a low-impact 15-min task must NOT jump ahead just for being short
  assert.ok(order.indexOf('dent') > order.indexOf('pres'));
  // dependency truly matters: a blocking task outranks a higher-impact non-blocker
  const blocking = priorityScore({ blocking: true, deadline: 'today' });
  const highImpactTomorrow = priorityScore({ impact: 'high', deadline: 'tomorrow' });
  assert.ok(blocking > highImpactTomorrow);
});

// ---- plan defers lower-priority work when over capacity --------------------------
test('plan schedules top priorities within capacity and defers the lower-priority rest', () => {
  const { plan, deferred } = buildPlan(scenario().tasks, 180, { startMinute: 540 });
  const planned = plan.map((b) => b.taskId);
  assert.deepEqual(planned, ['mgr', 'pres'], 'manager then presentation fit the 3h');
  const deferredIds = deferred.map((d) => d.taskId);
  assert.ok(deferredIds.includes('sie') && deferredIds.includes('dent') && deferredIds.includes('bank'), 'lower-priority work moves');
  assert.ok(plan[0].startMinute === 540, 'optional times attach when a start is given');
});

// ---- next best action -----------------------------------------------------------
test('next best action produces ONE concrete step (decompose-first if the top is vague)', () => {
  const nba = nextBestAction(scenario().tasks, 180);
  assert.equal(nba.taskId, 'mgr');
  assert.equal(nba.kind, 'start');
  assert.match(nba.action, /Reply to manager/);
  // if the top task is vague, NBA coaches decomposition instead of "start"
  let s = emptyApplicationState(); s = setAvailableMinutes(s, 120);
  s = addTask(s, { id: 'v', title: 'Finish presentation', estimatedMinutes: 60, deadline: 'today', blocking: true });
  const nba2 = nextBestAction(s.tasks, 120);
  assert.equal(nba2.kind, 'decompose');
});

// ---- decomposition of an ambiguous real task ------------------------------------
test('an ambiguous task is flagged and can be decomposed into concrete steps', () => {
  assert.equal(ambiguityCheck({ title: 'Finish presentation' }).vague, true);
  assert.equal(ambiguityCheck({ title: 'Study SIE' }).vague, true);
  assert.equal(ambiguityCheck({ title: 'review slides 1-10' }).vague, false); // has scope
  assert.equal(ambiguityCheck({ title: 'Reply to manager' }).vague, false);
  let s = emptyApplicationState();
  s = addTask(s, { id: 'p', title: 'Finish presentation', estimatedMinutes: 30 });
  s = decomposeTask(s, 'p', ['finish the financial slide', 'rehearse once']);
  assert.deepEqual(s.tasks[0].decomposition, ['finish the financial slide', 'rehearse once']);
  assert.equal(estimationRisk({ estimatedMinutes: 20, decomposition: ['a', 'b', 'c'] }).risk, true);
});

// ---- review captures actual vs estimated and coaches estimation ------------------
test('review captures actual vs estimated time and coaches (no mastery write)', () => {
  let s = emptyApplicationState();
  s = addTask(s, { id: 'r', title: 'Write report', estimatedMinutes: 30 });
  s = recordReview(s, 'r', { status: 'done', actualMinutes: 60 });
  assert.equal(s.tasks[0].status, 'done');
  assert.equal(s.tasks[0].actualMinutes, 60);
  assert.equal(reviewInsight(s.tasks[0]).kind, 'underestimate');
});

// ---- completed tasks surface the estimate-vs-actual coaching (regression) --------
test('completed tasks have a home that surfaces estimate-vs-actual coaching', () => {
  const c = read('components/tm/TmApplication.jsx');
  assert.match(c, /Completed today/);                                  // section exists
  assert.match(c, /filter\(\(t\) => t\.status === 'done'\)/);          // lists done tasks
  assert.match(c, /<ReviewNote task=\{t\} \/>/);                       // renders the coaching note
  // the surfaced logic classifies a 1.5x overrun as underestimate
  assert.equal(reviewInsight({ title: 'x', estimatedMinutes: 20, actualMinutes: 30 }).kind, 'underestimate');
});

// ---- coaching insights are observations, not labels -----------------------------
test('insights surface overcommitment / vague framing without labeling the learner', () => {
  const ins = applicationInsights(scenario());
  const keys = ins.map((i) => i.key);
  assert.ok(keys.includes('overcommitment'));
  assert.ok(keys.includes('vague-framing')); // presentation + SIE are broad
  for (const i of ins) assert.ok(!/lazy|unmotivated|bad at/i.test(i.text), 'no personality labels');
});

// ---- PRIVACY: device-local only; separate namespace; no server sinks -------------
test('application namespace is separate from learning, and isolated per learner', () => {
  assert.equal(tmApplicationStorageKey(null), 'tm_application_v1');
  assert.notEqual(tmApplicationStorageKey(null), tmStorageKey(null)); // separate from learning evidence
  assert.notEqual(tmApplicationStorageKey('amira'), tmApplicationStorageKey('stefan'));
});

test('real task content never reaches a server/API/event — the only sink is the local adapter', () => {
  for (const p of ['lib/certifications/tm/tmApplication.mjs', 'lib/certifications/tm/tmApplicationStore.mjs', 'components/tm/TmApplication.jsx']) {
    const src = read(p);
    assert.ok(!/\bfetch\s*\(|XMLHttpRequest|supabase|createClient|['"`]\/api\/|recordEvent\(|product_events|analyticsStore/i.test(src), `${p} performs no network/analytics I/O`);
  }
  // application modules must not IMPORT the learning store or engine mutators
  const appSrc = read('lib/certifications/tm/tmApplication.mjs') + read('lib/certifications/tm/tmApplicationStore.mjs');
  assert.ok(!/^\s*import[^\n]*(tmStore|tmEngine|recordTmAnswer|metrics\.mjs)/m.test(appSrc), 'application logic never imports learning evidence');
  assert.ok(!/\brecordTmAnswer\s*\(/.test(appSrc), 'application logic never calls recordTmAnswer');
});

test('state saves/loads device-local through a swappable adapter, per learner', () => {
  const mem = new Map();
  setTmApplicationPersistence({ load: (k) => (mem.has(k) ? JSON.parse(mem.get(k)) : null), save: (k, s) => mem.set(k, JSON.stringify(s)) });
  try {
    let a = addTask(emptyApplicationState({ date: 'd' }), { title: 'Amira private task' });
    saveApplicationState(a, 'amira');
    let b = addTask(emptyApplicationState({ date: 'd' }), { title: 'Stefan private task' });
    saveApplicationState(b, 'stefan');
    assert.equal(loadApplicationState('amira').tasks[0].title, 'Amira private task');
    assert.equal(loadApplicationState('stefan').tasks[0].title, 'Stefan private task');
    // one learner's tasks never appear under another's key
    assert.ok(!JSON.stringify(loadApplicationState('stefan')).includes('Amira'));
  } finally { setTmApplicationPersistence(localStorageAdapter); }
});

// ---- SEPARATION: application mode never alters learning mastery ------------------
test('application mode does not alter Sprint-1 learning mastery/evidence', () => {
  // build a learning state with real evidence
  let learn = emptyTmState();
  for (let i = 0; i < 6; i++) learn = recordTmAnswer(learn, { domain: 'prioritization', subskill: 'urgencyVsImportance', correct: true, difficulty: 3, family: 'prioritize', context: 'work', support: 'none' });
  const before = JSON.stringify(learn);
  const analysisBefore = JSON.stringify(tmConceptAnalysis(learn.domains, learn.misconceptions, learn.transfer));
  // exercise the entire application flow
  let app = scenario();
  app = decomposeTask(app, 'pres', ['finish financial slide']);
  app = recordReview(app, 'mgr', { status: 'done', actualMinutes: 25 });
  buildPlan(app.tasks, app.availableMinutes); nextBestAction(app.tasks, app.availableMinutes); applicationInsights(app);
  // learning state + its analysis are byte-for-byte unchanged
  assert.equal(JSON.stringify(learn), before, 'learning evidence untouched');
  assert.equal(JSON.stringify(tmConceptAnalysis(learn.domains, learn.misconceptions, learn.transfer)), analysisBefore, 'mastery classification unchanged');
});

// ---- Sprint 1 + other domains untouched -----------------------------------------
test('Sprint 1 practice component + FCTC/CFA/SIE files are not modified by app mode', () => {
  // the mode switch is the ONLY change to the practice component; its adaptive loop is intact
  const exp = read('components/tm/TimeMgmtExperience.jsx');
  assert.match(exp, /recordTmAnswer\(/);            // Sprint 1 loop still present
  assert.match(exp, /TmApplication/);               // application mounted behind the switch
  assert.match(exp, /mode === 'application'/);
  // application code does not import any other cert/domain
  const appSrc = read('lib/certifications/tm/tmApplication.mjs') + read('components/tm/TmApplication.jsx');
  assert.ok(!/certifications\/(sie|cfa)|fctcBlueprint/.test(appSrc), 'no coupling to FCTC/CFA/SIE');
});
