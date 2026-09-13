// ============================================================================
// generators.mjs — ORIGINAL Time-Management practice for the Sprint-1 vertical slice.
// ----------------------------------------------------------------------------
// One generator per implemented subskill. Each ROTATES ≥2 reasoning families and ≥2
// CONTEXTS (work / study / cert-prep / home), with 4 answer choices, meaningful
// distractors, and stable misconception keys aligned to each distractor. Items
// diagnose OBSERVABLE execution behavior, never personality. Meaningful variants —
// different scenarios and reasoning, not cosmetic swaps.
//
// Generator contract (consumed by tmEngine.generateTmItem):
//   (rng) => { concept, context, prompt, options:[4], correct:index,
//              explanation, meta:{ distractorRationale:[], misconceptions:[] } }
// ============================================================================

const pick = (rng, a) => a[Math.floor(rng() * a.length)];
const shuffle = (rng, a) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

// Build 4 shuffled options from one correct answer + 3 distractors ({text, why, key?}).
// Keeps each option's rationale + misconception key aligned to its final index; the
// correct option's rationale/key = null. Distractors must be distinct.
function assemble4(rng, correct, distractors) {
  const entries = [{ text: correct, why: null, key: null, correct: true }];
  const seen = new Set([correct]);
  for (const d of distractors) {
    if (seen.has(d.text)) continue;
    seen.add(d.text);
    entries.push({ text: d.text, why: d.why, key: d.key || null, correct: false });
    if (entries.length >= 4) break;
  }
  const shuffled = shuffle(rng, entries);
  return {
    options: shuffled.map((e) => e.text),
    correct: shuffled.findIndex((e) => e.correct),
    distractorRationale: shuffled.map((e) => (e.correct ? null : e.why)),
    misconceptions: shuffled.map((e) => (e.correct ? null : e.key)),
  };
}
const wrap = (concept, context, prompt, built, explanation) => ({
  concept, context, prompt, options: built.options, correct: built.correct, explanation,
  meta: { distractorRationale: built.distractorRationale, misconceptions: built.misconceptions, context },
});

// ============================ PRIORITIZATION =================================

// urgency vs importance — act on impact, not on what is merely loud/soon.
function urgencyVsImportance(rng) {
  const concept = pick(rng, ['uvi-prioritize', 'uvi-critique']);
  const context = pick(rng, ['work', 'study', 'cert-prep', 'home']);
  const V = {
    work: {
      important: 'Draft the client proposal due Thursday that could win a major contract',
      urgent:    'Reply to a “quick question” chat that pinged you two minutes ago',
      easy:      'Reorganize your email folders',
      low:       'Read an FYI newsletter someone forwarded',
    },
    study: {
      important: 'Start the term paper worth 40% that is due next week',
      urgent:    'Answer a classmate’s text asking what page the reading was on',
      easy:      'Color-code your notes',
      low:       'Watch an optional supplementary video',
    },
    'cert-prep': {
      important: 'Do a timed practice set on your weakest exam domain',
      urgent:    'Reply to a study-group message about meeting times',
      easy:      'Reformat your study tracker spreadsheet',
      low:       'Browse the forum for exam-day tips',
    },
    home: {
      important: 'Book the overdue medical appointment before the slots fill',
      urgent:    'Answer a robo-call reminder that just rang',
      easy:      'Alphabetize the spice rack',
      low:       'Skim a store flyer that arrived today',
    },
  }[context];
  if (concept === 'uvi-critique') {
    const built = assemble4(rng, 'They treated “most recent/loudest” as “most important,” so a low-stakes interruption displaced high-stakes work.',
      [
        { text: 'They spent too long on the important task.', why: 'the important task was never started — the problem is what they did instead', key: 'consequence-underweighting' },
        { text: 'They correctly did the most time-sensitive thing first.', why: 'time-sensitive ≠ important; the interruption was low-consequence', key: 'urgency-importance-conflation' },
        { text: 'They should have done the quickest task to build momentum.', why: 'quick ≠ valuable; momentum on trivia still leaves the high-impact work undone', key: 'easy-over-important' },
      ]);
    return wrap(concept, context, `Someone dropped everything to "${V.urgent.toLowerCase()}" and never got to "${V.important.toLowerCase()}." What is the flaw in how they prioritized?`, built,
      'Urgency (time pressure) is not the same as importance (consequence). A loud, soon, or quick task can be low-impact; protect the high-consequence work first.');
  }
  const built = assemble4(rng, V.important,
    [
      { text: V.urgent, why: 'this is urgent (just arrived) but low-consequence — urgency is not importance', key: 'urgency-importance-conflation' },
      { text: V.easy, why: 'this is quick and easy but low-value — easy is not important', key: 'easy-over-important' },
      { text: V.low, why: 'this has little consequence either way — low impact', key: 'consequence-underweighting' },
    ]);
  return wrap(concept, context, `You have one focused hour ${context === 'home' ? 'today' : 'this morning'}. Which should you do first?`, built,
    `Do the highest-consequence work first: "${V.important}". The others are urgent, easy, or low-impact — none changes the outcome the way the important task does.`);
}

// consequence / impact — weigh downstream effect, including a tradeoff variant.
function consequenceImpact(rng) {
  const concept = pick(rng, ['ci-prioritize', 'ci-tradeoff']);
  const context = pick(rng, ['work', 'study', 'cert-prep', 'home']);
  const V = {
    work: { high: 'Fix the payroll error that will underpay the team on Friday', med: 'Prepare slides for next month’s all-hands', low: 'Tidy the shared drive' },
    study: { high: 'Submit the scholarship application closing tonight', med: 'Pre-read next week’s chapter', low: 'Refill your printer paper' },
    'cert-prep': { high: 'Re-sit the practice question types you keep failing', med: 'Skim a domain you already score well on', low: 'Update your streak tracker' },
    home: { high: 'Pay the bill whose late fee triggers at midnight', med: 'Plan next week’s meals', low: 'Dust the shelves' },
  }[context];
  if (concept === 'ci-tradeoff') {
    const built = assemble4(rng, V.high,
      [
        { text: V.med, why: 'useful but its consequence is deferred; the high-impact item has an immediate, larger downside if missed', key: 'consequence-underweighting' },
        { text: V.low, why: 'low consequence either way', key: 'easy-over-important' },
        { text: 'Split your time evenly across all three', why: 'even splitting ignores that one option has a far larger consequence — impact should decide', key: 'everything-is-priority' },
      ]);
    return wrap(concept, context, `Your ${context === 'home' ? 'evening' : 'afternoon'} just got cut in half. Only one thing will realistically get done. Which do you protect?`, built,
      `When time is cut, protect the item with the largest downside if missed: "${V.high}". Deferring the medium/low items costs little by comparison.`);
  }
  const built = assemble4(rng, V.high,
    [
      { text: V.med, why: 'moderate impact and not time-critical', key: 'consequence-underweighting' },
      { text: V.low, why: 'minimal impact', key: 'easy-over-important' },
      { text: 'Whichever you can finish fastest', why: 'speed of completion is not impact; finishing a trivial task first can miss the costly one', key: 'easy-over-important' },
    ]);
  return wrap(concept, context, 'Rank by impact: which task has the largest consequence if it is NOT done?', built,
    `"${V.high}" carries the biggest, most immediate consequence, so it ranks first regardless of how quick or pleasant the others are.`);
}

// competing priorities — sequence under deadlines + dependencies.
function competingPriorities(rng) {
  const concept = pick(rng, ['cp-prioritize', 'cp-tradeoff']);
  const context = pick(rng, ['work', 'study', 'cert-prep', 'home']);
  const V = {
    work: { dep: 'Send the data file your colleague needs before they can build the report due today', self: 'Polish your own slides due Friday', block: 'their report is blocked until you send it' },
    study: { dep: 'Return the shared lab notes your partner needs to finish tonight’s submission', self: 'Reformat your personal study guide', block: 'your partner cannot submit until they get the notes' },
    'cert-prep': { dep: 'Confirm the exam booking that must be done before the group can schedule a review', self: 'Redo flashcards you already know', block: 'the group review can’t be set until the booking is confirmed' },
    home: { dep: 'Drop the prescription so it can be filled before the pharmacy closes', self: 'Reorganize the medicine cabinet', block: 'nothing can be picked up until it’s dropped off' },
  }[context];
  const built = assemble4(rng, V.dep,
    [
      { text: V.self, why: 'this is only yours and not time-critical; doing it first leaves others blocked', key: 'consequence-underweighting' },
      { text: 'Whichever feels easier to start', why: 'ease of starting ignores that one task unblocks someone else with a hard deadline', key: 'easy-over-important' },
      { text: 'Both at once, a little of each', why: `splitting delays the blocking task — ${V.block}`, key: 'everything-is-priority' },
    ]);
  return wrap(concept, context, `Two tasks compete. First: ${V.dep}. Second: ${V.self.toLowerCase()}. What do you do first?`, built,
    `Do the task others depend on first: ${V.block}. Unblocking a dependency with a hard deadline outranks self-contained, later work.`);
}

// choosing what NOT to do — drop / defer / delegate.
function chooseWhatNotToDo(rng) {
  const concept = pick(rng, ['cwntd-tradeoff', 'cwntd-critique']);
  const context = pick(rng, ['work', 'study', 'cert-prep', 'home']);
  const V = {
    work: { keep: 'the deliverable your manager is waiting on', drop: 'the optional formatting pass on an internal doc' },
    study: { keep: 'the graded assignment due tomorrow', drop: 're-reading a chapter you already understand' },
    'cert-prep': { keep: 'timed practice on your weakest domain', drop: 'making your notes prettier' },
    home: { keep: 'the time-sensitive errand', drop: 'a deep-clean that can wait a week' },
  }[context];
  if (concept === 'cwntd-critique') {
    const built = assemble4(rng, 'They tried to keep everything, so nothing important got enough time.',
      [
        { text: 'They dropped too much and had free time left over.', why: 'the problem was the opposite — refusing to drop anything', key: 'everything-is-priority' },
        { text: 'They correctly gave every task equal time.', why: 'equal time across unequal tasks starves the important one — deliberate dropping is the skill', key: 'everything-is-priority' },
        { text: 'They should have started with the easiest item.', why: 'starting easy doesn’t address the real issue: too many commitments for the time available', key: 'easy-over-important' },
      ]);
    return wrap(concept, context, 'A learner kept every task on today’s list "just in case," worked all day, and still missed the one that mattered. What went wrong?', built,
      'Choosing what NOT to do is a core skill. When commitments exceed capacity, deliberately drop, defer, or delegate the low-value items so the important one gets real time.');
  }
  const built = assemble4(rng, `Defer or drop ${V.drop}`,
    [
      { text: `Defer ${V.keep}`, why: 'this is the high-value, time-sensitive item — it should be protected, not deferred', key: 'consequence-underweighting' },
      { text: 'Keep all of it and work faster', why: 'when commitments exceed capacity, working faster rarely closes the gap — something must give', key: 'everything-is-priority' },
      { text: 'Do the smaller items first to shorten the list', why: 'shrinking the count by clearing trivia still risks missing the item that matters', key: 'easy-over-important' },
    ]);
  return wrap(concept, context, `You cannot finish everything ${context === 'home' ? 'today' : 'this week'}. To protect ${V.keep}, what should you cut?`, built,
    `Protect the high-value item by cutting the low-value one: ${V.drop}. Deciding what not to do is how the important work gets enough time.`);
}

// everything feels urgent — impose a real ordering.
function everythingFeelsUrgent(rng) {
  const concept = pick(rng, ['efu-prioritize', 'efu-critique']);
  const context = pick(rng, ['work', 'study', 'cert-prep', 'home']);
  if (concept === 'efu-critique') {
    const built = assemble4(rng, 'Everything was labeled "top priority," which is the same as having no priority — nothing guided the order.',
      [
        { text: 'They had too few tasks to bother ordering.', why: 'the issue was too many equally-flagged tasks, not too few', key: 'everything-is-priority' },
        { text: 'They ordered strictly by deadline, which is always correct.', why: 'deadline-only ordering ignores impact and dependencies; nearest deadline isn’t always highest priority', key: 'urgency-importance-conflation' },
        { text: 'They should have done them in the order they arrived.', why: 'arrival order is arbitrary; it ignores impact, deadline, and dependencies', key: 'easy-over-important' },
      ]);
    return wrap(concept, context, 'Someone marked all eight of today’s tasks "urgent" and then froze, unsure where to start. What’s the underlying problem?', built,
      'When everything is a priority, nothing is. Re-rank by impact and true deadline so a real order emerges; "everything urgent" is a signal to discriminate, not to panic.');
  }
  const built = assemble4(rng, 'Rank them by impact and true deadline, then start the single top item.',
    [
      { text: 'Start whichever is loudest or most recent.', why: 'recency/volume is not priority — that’s how low-impact tasks jump the queue', key: 'urgency-importance-conflation' },
      { text: 'Do a little of each so all move forward.', why: 'spreading thin when everything "feels" urgent finishes nothing; impose an order instead', key: 'everything-is-priority' },
      { text: 'Do the quickest ones to shrink the list.', why: 'clearing quick items feels productive but can leave the highest-impact task untouched', key: 'easy-over-important' },
    ]);
  return wrap(concept, context, `Every task on your ${context === 'cert-prep' ? 'study' : context} list feels like a priority right now. What’s the right move?`, built,
    'Convert the felt-panic into a ranking: score by impact and real deadline, then commit to the single top task. A real order dissolves the "all-urgent" illusion.');
}

// ============================ TIME ESTIMATION ===============================

function durationEstimation(rng) {
  const concept = pick(rng, ['de-estimate', 'de-critique']);
  const context = pick(rng, ['work', 'study', 'cert-prep', 'home']);
  const V = {
    work: { task: 'write a two-page status report you have written monthly for a year', typical: 'about 90 minutes', optimistic: '20 minutes' },
    study: { task: 'write a 1,500-word essay from an outline', typical: 'about 4 hours', optimistic: '1 hour' },
    'cert-prep': { task: 'complete and fully review a 30-question practice set', typical: 'about 2 hours', optimistic: '30 minutes' },
    home: { task: 'do a full grocery run for the week', typical: 'about 90 minutes', optimistic: '25 minutes' },
  }[context];
  if (concept === 'de-critique') {
    const built = assemble4(rng, 'The estimate assumes everything goes perfectly with zero interruptions — a best-case, not a realistic, number.',
      [
        { text: 'The estimate was too generous and wasted time.', why: 'the flaw is under-estimating, not over-estimating', key: 'duration-underestimation' },
        { text: 'The task simply can’t be estimated at all.', why: 'similar tasks give a usable range; "unknowable" is an excuse to under-plan', key: 'ignores-historical-evidence' },
        { text: 'The estimate correctly used the fastest time they’d ever done it.', why: 'the fastest-ever time is best-case, not typical — it repeats the underestimate', key: 'optimistic-repeat-estimate' },
      ]);
    return wrap(concept, context, `Someone budgeted "${V.optimistic}" to ${V.task}, then blew past it again. What’s wrong with the estimate?`, built,
      `A realistic estimate is the typical time under normal conditions (~${V.typical.replace('about ', '')}), not the best case. Best-case numbers guarantee overruns.`);
  }
  const built = assemble4(rng, V.typical,
    [
      { text: V.optimistic, why: 'this is a best-case time that ignores normal friction and interruptions', key: 'duration-underestimation' },
      { text: 'However long is left before it’s due', why: 'time-available is not time-required; fitting the estimate to the deadline hides the real duration', key: 'ignores-historical-evidence' },
      { text: 'Half your first guess, to stay motivated', why: 'shrinking an estimate to feel good is not estimation — it repeats the optimism error', key: 'optimistic-repeat-estimate' },
    ]);
  return wrap(concept, context, `Realistically, how long should you budget to ${V.task}?`, built,
    `Budget the typical, normal-conditions time (${V.typical}). You’ve done this kind of task before — use that, not the best case.`);
}

function planningFallacy(rng) {
  const concept = pick(rng, ['pf-reverse', 'pf-critique']);
  const context = pick(rng, ['work', 'study', 'cert-prep', 'home']);
  const V = {
    work: 'a project you promised in a week took three, for the third quarter running',
    study: 'a paper you planned for one evening took the whole weekend, again',
    'cert-prep': 'a "quick" review that you scheduled for an hour ran to an afternoon, again',
    home: 'a "weekend" home project that has now spilled into a third weekend',
  }[context];
  if (concept === 'pf-critique') {
    const built = assemble4(rng, 'Each estimate was built fresh from an optimistic single scenario, ignoring how long the same kind of work actually took before.',
      [
        { text: 'The work is simply always unpredictable.', why: 'the repeated overrun is a pattern, not randomness — the estimate method is the cause', key: 'ignores-historical-evidence' },
        { text: 'They added too much buffer each time.', why: 'the outcome was under-running the estimate; buffer was missing, not excessive', key: 'no-buffer-planning' },
        { text: 'They should just work faster next time.', why: '"work faster" ignores the systematic optimism; calibrating the estimate is the fix', key: 'optimistic-repeat-estimate' },
      ]);
    return wrap(concept, context, `A learner keeps hitting the same trap: ${V}. What best explains it?`, built,
      'The planning fallacy: estimating from a best-case single scenario and ignoring your own track record. Counter it by anchoring on how long similar work really took.');
  }
  const built = assemble4(rng, 'Base the new estimate on how long similar tasks actually took, then adjust for this task’s differences.',
    [
      { text: 'Trust the fresh best-case estimate — this time will be different.', why: 'that is the planning fallacy itself; "this time is different" rarely holds', key: 'optimistic-repeat-estimate' },
      { text: 'Estimate only from the ideal, no-interruption scenario.', why: 'ideal-scenario estimating is exactly what caused the repeated overruns', key: 'duration-underestimation' },
      { text: 'Assume it’s unpredictable and don’t estimate.', why: 'past actuals give a usable range; refusing to estimate abandons planning', key: 'ignores-historical-evidence' },
    ]);
  return wrap(concept, context, `Given that ${V}, how should you make the NEXT estimate?`, built,
    'Beat the planning fallacy with an outside view: start from what similar work actually took, then adjust — don’t re-run a fresh optimistic guess.');
}

function historicalEvidence(rng) {
  const concept = pick(rng, ['he-estimate', 'he-reverse']);
  const context = pick(rng, ['work', 'study', 'cert-prep', 'home']);
  const V = {
    work: { past: 'The last three monthly reports took 80, 95, and 100 minutes', ask: 'the next monthly report', ans: 'About 90–100 minutes, in line with the last three', bad: '30 minutes' },
    study: { past: 'Your last three problem sets took 3.5, 4, and 4.5 hours', ask: 'the next problem set', ans: 'About 4 hours, matching your recent actuals', bad: '1 hour' },
    'cert-prep': { past: 'Your last three practice sets took 105, 120, and 115 minutes', ask: 'the next practice set', ans: 'About 2 hours, consistent with your recent sets', bad: '40 minutes' },
    home: { past: 'The last three big grocery runs took 85, 95, and 90 minutes', ask: 'this week’s grocery run', ans: 'About 90 minutes, like the last three', bad: '25 minutes' },
  }[context];
  if (concept === 'he-reverse') {
    const built = assemble4(rng, 'They ignored their own recent actuals and guessed fresh from optimism.',
      [
        { text: 'They used too much historical data.', why: 'the problem was ignoring history, not over-using it', key: 'ignores-historical-evidence' },
        { text: 'Their past times were irrelevant to this task.', why: 'the past tasks were the same kind of work — highly relevant', key: 'ignores-historical-evidence' },
        { text: 'They added an unnecessary buffer.', why: 'no buffer was involved; the miss came from a low fresh guess', key: 'no-buffer-planning' },
      ]);
    return wrap(concept, context, `${V.past}. This time they budgeted ${V.bad} and overran badly. What’s the root cause?`, built,
      'Your own recent actuals for the same kind of work are the best predictor. Ignoring them in favor of a fresh optimistic guess is the error.');
  }
  const built = assemble4(rng, V.ans,
    [
      { text: `${V.bad}, because you’ll be more focused this time`, why: 'a fresh optimistic guess ignores three consistent data points', key: 'ignores-historical-evidence' },
      { text: 'Whatever time is left before it’s due', why: 'available time is not required time', key: 'duration-underestimation' },
      { text: 'It’s impossible to say', why: 'three consistent actuals give a confident range', key: 'ignores-historical-evidence' },
    ]);
  return wrap(concept, context, `${V.past}. How long should you budget for ${V.ask}?`, built,
    `Use the evidence: three similar tasks clustered around the same duration, so ${V.ans.toLowerCase()}.`);
}

function bufferSizing(rng) {
  const concept = pick(rng, ['bs-estimate', 'bs-critique']);
  const context = pick(rng, ['work', 'study', 'cert-prep', 'home']);
  const V = {
    work: { task: 'a 2-hour deliverable with a hard 5pm client deadline', ans: 'Start with a buffer — plan for ~2.5–3 hours so an interruption doesn’t blow the deadline' },
    study: { task: 'a 3-hour assignment due at midnight', ans: 'Plan ~3.5–4 hours so a snag still leaves you on time' },
    'cert-prep': { task: 'a 2-hour mock exam before a scheduled review call', ans: 'Budget ~2.5 hours so setup and breaks don’t eat the review slot' },
    home: { task: 'a 90-minute errand chain before an appointment', ans: 'Allow ~2 hours for traffic and lines so you’re not late' },
  }[context];
  if (concept === 'bs-critique') {
    const built = assemble4(rng, 'The plan packed tasks back-to-back with zero slack, so the first interruption cascaded into missing everything after it.',
      [
        { text: 'The plan had far too much idle buffer.', why: 'the failure was no buffer, not excess', key: 'no-buffer-planning' },
        { text: 'The individual estimates were too high.', why: 'estimates weren’t the issue; the absence of slack between them was', key: 'no-buffer-planning' },
        { text: 'They should have simply worked through lunch.', why: 'skipping breaks isn’t buffer; unplanned events still cascade without slack', key: 'no-buffer-planning' },
      ]);
    return wrap(concept, context, 'A perfectly back-to-back schedule fell apart after one 15-minute interruption in the morning. What was the design flaw?', built,
      'A plan with no buffer is fragile: one delay cascades through everything after it. Build slack for interruptions and estimate error, especially before hard deadlines.');
  }
  const built = assemble4(rng, V.ans,
    [
      { text: 'Book exactly the estimated time, no slack', why: 'zero buffer means any interruption or overrun breaks the deadline', key: 'no-buffer-planning' },
      { text: 'Book less than the estimate to force focus', why: 'under-booking guarantees overrun and adds pressure — the opposite of buffering', key: 'duration-underestimation' },
      { text: 'Fill every free minute with more tasks', why: 'over-packing removes the slack that absorbs the unexpected', key: 'no-buffer-planning' },
    ]);
  return wrap(concept, context, `You must finish ${V.task}. How should you schedule it?`, built,
    `${V.ans}. Buffer absorbs interruptions and estimate error so a single snag doesn’t miss the deadline.`);
}

function correctionAfterMiss(rng) {
  const concept = pick(rng, ['cam-estimate', 'cam-reverse']);
  const context = pick(rng, ['work', 'study', 'cert-prep', 'home']);
  const V = {
    work: { est: 'You budgeted 1 hour for a report; it took 2.', next: 'Budget ~2 hours next time and note what caused the overrun' },
    study: { est: 'You planned 2 hours for a problem set; it took 4.', next: 'Plan ~4 hours next time and record why it ran long' },
    'cert-prep': { est: 'You expected 30 minutes for a practice set; it took an hour.', next: 'Expect ~1 hour next time and track the review portion separately' },
    home: { est: 'You allowed 45 minutes for an errand; it took 90.', next: 'Allow ~90 minutes next time and account for travel/lines' },
  }[context];
  if (concept === 'cam-reverse') {
    const built = assemble4(rng, 'They logged the miss but changed nothing, so the next estimate repeated the same optimism.',
      [
        { text: 'They over-corrected and wildly over-budgeted after.', why: 'the described pattern is repeating the same low estimate, not over-correcting', key: 'optimistic-repeat-estimate' },
        { text: 'The first estimate was actually fine.', why: 'a 2× overrun is a real miss worth calibrating from', key: 'duration-underestimation' },
        { text: 'They should stop estimating entirely.', why: 'the fix is to calibrate from the miss, not abandon estimation', key: 'ignores-historical-evidence' },
      ]);
    return wrap(concept, context, `${V.est} The next time, they budgeted the same 1× again and missed again. What’s the execution error?`, built,
      'A missed estimate is data. The skill is calibration: update the next estimate toward the actual and note the cause — not repeating the same optimistic number.');
  }
  const built = assemble4(rng, V.next,
    [
      { text: 'Keep the original estimate — the overrun was a one-off', why: 'treating a real miss as a fluke repeats the error', key: 'optimistic-repeat-estimate' },
      { text: 'Cut the next estimate to make up lost time', why: 'shrinking the estimate after an overrun compounds the miss', key: 'duration-underestimation' },
      { text: 'Ignore it; estimates never help anyway', why: 'calibrated estimates improve with exactly this feedback', key: 'ignores-historical-evidence' },
    ]);
  return wrap(concept, context, `${V.est} How should this change your NEXT estimate?`, built,
    `Calibrate toward the actual: ${V.next.toLowerCase()}. Each miss should move your estimates closer to reality.`);
}

// ============================ TASK DECOMPOSITION ============================

function vagueToActionable(rng) {
  const concept = pick(rng, ['vta-decompose', 'vta-reverse']);
  const context = pick(rng, ['work', 'study', 'cert-prep', 'home']);
  const V = {
    work: { vague: '“Improve onboarding”', action: 'Draft the first three steps of the onboarding checklist' },
    study: { vague: '“Study biology”', action: 'Do the 10 review questions at the end of chapter 4' },
    'cert-prep': { vague: '“Get ready for the exam”', action: 'Complete one timed practice set on your weakest domain' },
    home: { vague: '“Sort out the finances”', action: 'List this month’s bills and their due dates' },
  }[context];
  if (concept === 'vta-reverse') {
    const built = assemble4(rng, 'The task was left vague, so there was no concrete first action to start — it kept getting skipped.',
      [
        { text: 'The task was too small to bother with.', why: 'the opposite — it was too vague/large to start, so nothing happened', key: 'oversized-task-framing' },
        { text: 'They lacked motivation.', why: 'this diagnoses a person, not the work; the observable issue is no defined next action', key: 'vague-goal-no-next-action' },
        { text: 'They planned it in too much detail.', why: 'there was no concrete step at all — under-defined, not over-planned', key: 'plan-optimization-over-execution' },
      ]);
    return wrap(concept, context, `${V.vague} sat on the list untouched for two weeks. What’s the observable cause?`, built,
      'Vague goals have no starting action, so they stall. The fix is to name a concrete, doable next step — not to question motivation.');
  }
  const built = assemble4(rng, V.action,
    [
      { text: `Re-write ${V.vague} in bigger letters and re-commit`, why: 'restating a vague goal doesn’t create a doable action', key: 'vague-goal-no-next-action' },
      { text: `Block a whole day for ${V.vague.replace(/[“”]/g, '').toLowerCase()}`, why: 'reserving time for a vague goal still leaves you unsure what to actually do', key: 'oversized-task-framing' },
      { text: 'Research the perfect system before doing anything', why: 'optimizing a system defers the concrete first step', key: 'plan-optimization-over-execution' },
    ]);
  return wrap(concept, context, `Turn the vague goal ${V.vague} into something you can actually start. What’s the best next action?`, built,
    `A good next action is concrete and doable now: "${V.action}". Vague goals must be operationalized into a visible first step.`);
}

function trueNextAction(rng) {
  const concept = pick(rng, ['tna-decompose', 'tna-prioritize']);
  const context = pick(rng, ['work', 'study', 'cert-prep', 'home']);
  const V = {
    work: { goal: 'schedule the project kickoff', action: 'Email the three attendees two time options', notyet: 'Build the full project plan' },
    study: { goal: 'start the group presentation', action: 'Message the group to pick a meeting time', notyet: 'Design all the slides' },
    'cert-prep': { goal: 'begin your study schedule', action: 'Book your exam date so the schedule has an anchor', notyet: 'Make a color-coded 8-week calendar' },
    home: { goal: 'plan the trip', action: 'Check which dates you can take off', notyet: 'Compare every hotel option' },
  }[context];
  const built = assemble4(rng, V.action,
    [
      { text: V.notyet, why: 'this is a later, larger step that depends on the small first action being done', key: 'oversized-task-framing' },
      { text: `Think more about how to ${V.goal}`, why: 'thinking is not a visible next action; it defers starting', key: 'plan-optimization-over-execution' },
      { text: `Add "${V.goal}" to your to-do list again`, why: 'restating the goal isn’t the concrete physical next step', key: 'vague-goal-no-next-action' },
    ]);
  return wrap(concept, context, `To ${V.goal}, what is the single TRUE next action?`, built,
    `The true next action is the smallest visible step you can take now: "${V.action}". Bigger steps come after; they depend on this one.`);
}

function breakingOverwhelm(rng) {
  const concept = pick(rng, ['bo-decompose', 'bo-prioritize']);
  const context = pick(rng, ['work', 'study', 'cert-prep', 'home']);
  const V = {
    work: { big: 'a quarterly report spanning five sections', slice: 'Outline the section headings, then draft only the first section' },
    study: { big: 'a 20-page paper', slice: 'Write a one-line thesis, then draft only the introduction' },
    'cert-prep': { big: 'an entire exam syllabus', slice: 'Pick one domain and do a single practice set today' },
    home: { big: 'a full house declutter', slice: 'Clear one drawer today' },
  }[context];
  const built = assemble4(rng, V.slice,
    [
      { text: `Block a full day and try to finish ${V.big}`, why: 'facing the whole thing at once is what caused the overwhelm and the stall', key: 'oversized-task-framing' },
      { text: `Wait until you have a big uninterrupted block for ${V.big}`, why: 'waiting for ideal conditions defers starting indefinitely', key: 'plan-optimization-over-execution' },
      { text: 'Make a detailed plan of all sections before doing any', why: 'over-planning the whole can substitute for starting a small piece', key: 'plan-optimization-over-execution' },
    ]);
  return wrap(concept, context, `${V.big.charAt(0).toUpperCase() + V.big.slice(1)} feels overwhelming and you keep avoiding it. What’s the best way to start?`, built,
    `Shrink it to a startable slice: "${V.slice}". A large task becomes doable when the first piece is small enough to begin now.`);
}

function completionCriteria(rng) {
  const concept = pick(rng, ['cc-decompose', 'cc-reverse']);
  const context = pick(rng, ['work', 'study', 'cert-prep', 'home']);
  const V = {
    work: { task: '“review the document”', done: 'Comments left on each section and a summary sent to the author' },
    study: { task: '“study the chapter”', done: 'Can answer the chapter’s review questions without looking' },
    'cert-prep': { task: '“practice more”', done: 'Score ≥80% on two practice sets in your weak domain' },
    home: { task: '“clean the kitchen”', done: 'Counters clear, dishes away, floor swept' },
  }[context];
  if (concept === 'cc-reverse') {
    const built = assemble4(rng, 'Without a definition of "done," the task had no endpoint, so it dragged and never felt finished.',
      [
        { text: 'The task was too small to define.', why: 'even small tasks need a clear "done"; size wasn’t the issue', key: 'unclear-completion-criteria' },
        { text: 'They worked too efficiently.', why: 'efficiency isn’t the problem; the missing endpoint is', key: 'unclear-completion-criteria' },
        { text: 'They should have just worked longer.', why: 'more time without a defined endpoint still never "finishes"', key: 'plan-optimization-over-execution' },
      ]);
    return wrap(concept, context, `${V.task} stayed "in progress" for days and never felt complete. What’s the observable cause?`, built,
      'Tasks without explicit completion criteria have no endpoint and sprawl. Define what "done" looks like up front so you know when to stop.');
  }
  const built = assemble4(rng, V.done,
    [
      { text: `Just keep working on ${V.task} until it feels done`, why: '"feels done" is not a criterion; it invites endless drift', key: 'unclear-completion-criteria' },
      { text: 'Spend more time making it perfect', why: 'perfection has no endpoint; a concrete definition of done bounds the work', key: 'plan-optimization-over-execution' },
      { text: `Add ${V.task} back to the list for tomorrow too`, why: 'rolling it forward without a "done" repeats the open loop', key: 'unclear-completion-criteria' },
    ]);
  return wrap(concept, context, `Before starting ${V.task}, how should you define completion?`, built,
    `Set an explicit "done": ${V.done}. Clear completion criteria give the task an endpoint and let you close the loop.`);
}

// ---- export: one generator per implemented "topic:subskill" slice cell -----------
export const TM_SLICE_GENERATORS = {
  'prioritization:urgencyVsImportance': urgencyVsImportance,
  'prioritization:consequenceImpact': consequenceImpact,
  'prioritization:competingPriorities': competingPriorities,
  'prioritization:chooseWhatNotToDo': chooseWhatNotToDo,
  'prioritization:everythingFeelsUrgent': everythingFeelsUrgent,
  'estimation:durationEstimation': durationEstimation,
  'estimation:planningFallacy': planningFallacy,
  'estimation:historicalEvidence': historicalEvidence,
  'estimation:bufferSizing': bufferSizing,
  'estimation:correctionAfterMiss': correctionAfterMiss,
  'decomposition:vagueToActionable': vagueToActionable,
  'decomposition:trueNextAction': trueNextAction,
  'decomposition:breakingOverwhelm': breakingOverwhelm,
  'decomposition:completionCriteria': completionCriteria,
};
