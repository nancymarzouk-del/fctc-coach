// ============================================================================
// lessons.mjs — LEARN MODE instructional content for Time Management (Sprint 3).
// ----------------------------------------------------------------------------
// "Teach before test." Structured, concise instruction for the THREE Sprint-1
// competencies (prioritization, estimation, decomposition). Pure data + helpers —
// no scoring, no I/O. Reading a lesson is NOT mastery; formal mastery still comes
// only from independent Practice (tmEngine). Examples rotate across contexts
// (work / student / cert-prep / home) so the module isn't corporate-only.
// ============================================================================

// The teach → prove progression each competency walks through.
export const LESSON_STEPS = Object.freeze(['intro', 'concept', 'framework', 'worked', 'contrast', 'guided', 'quickcheck']);
export const LESSON_ORDER = Object.freeze(['prioritization', 'estimation', 'decomposition']);

// Reteaching approaches — when a learner struggles, Alyce VARIES the approach
// rather than repeating the same paragraph. `nextReteachApproach` rotates through
// the unused ones first.
export const RETEACH_APPROACHES = Object.freeze(['different-scenario', 'analogy', 'visual', 'step-by-step', 'reverse', 'simpler']);
export function nextReteachApproach(used = [], available = RETEACH_APPROACHES) {
  const unused = available.filter((a) => !used.includes(a));
  return unused.length ? unused[0] : (available[used.length % available.length] || available[0]);
}

// Evaluate a quick check: pass only when every item is answered correctly.
export function evaluateQuickCheck(quickCheck = [], answers = {}) {
  const total = quickCheck.length;
  let correct = 0;
  quickCheck.forEach((q, i) => { if (answers[i] === q.correct) correct += 1; });
  return { total, correct, passed: total > 0 && correct === total };
}

export const LESSONS = Object.freeze({
  // ==========================================================================
  prioritization: {
    key: 'prioritization',
    title: 'Prioritization',
    oneLiner: 'Decide what to do first by impact — not by whatever is loudest, soonest, or quickest.',
    visual: 'impact-urgency-matrix',
    concept: {
      what: 'Prioritization is choosing the ORDER of your work when several things compete for the same limited time.',
      why: 'Most days you cannot do everything. The order you choose decides whether the work that actually matters gets done — or gets crowded out by noise.',
      when: 'Any time your list is longer than your available time, or when something new arrives mid-day and demands attention.',
      mistakes: [
        'Treating urgent (loud/soon) as the same as important (high-consequence).',
        'Doing the quickest task first just because it feels good to check something off.',
        'Ordering strictly by deadline and ignoring impact and dependencies.',
      ],
    },
    framework: {
      title: 'Weigh five things, in this order',
      keyIdea: 'URGENT ≠ IMPORTANT. Urgency tells you what is demanding attention now; importance/impact tells you what matters most. And a short task is not automatically the best first task.',
      steps: [
        { label: 'Dependencies', text: 'Does anything (or anyone) depend on this? Work that unblocks others usually goes first.' },
        { label: 'Deadline', text: 'What is genuinely due today vs later? A real hard deadline outranks a vague "soon".' },
        { label: 'Impact', text: 'What is the consequence if this is NOT done? Bigger downside = higher priority.' },
        { label: 'Urgency', text: 'What is merely loud or recent? Note it, but don’t let it jump the queue on its own.' },
        { label: 'What can wait', text: 'Decide explicitly what to drop or defer today. Choosing what NOT to do is part of the skill.' },
      ],
    },
    worked: {
      scenario: 'You have a few hours today. Four things are on your list:',
      tasks: [
        'Reply to manager — 15 min — due today — blocks their approval',
        'Finish presentation — 2 hours — due tomorrow — high impact',
        'Study SIE — 90 min — important, no immediate deadline',
        'Call dentist — 15 min — low impact',
      ],
      steps: [
        { label: 'Dependencies', text: 'The manager reply BLOCKS someone else’s approval — that’s a dependency.' },
        { label: 'Deadlines', text: 'Manager reply is due today; presentation is due tomorrow; SIE and dentist have no hard deadline.' },
        { label: 'Impact', text: 'The presentation is the highest-impact piece of work overall.' },
        { label: 'Tradeoffs', text: 'The presentation matters more, but it isn’t due yet and blocks no one. The manager reply is small but time-critical and unblocks a person.' },
        { label: 'Order', text: '1) Reply to manager  2) Finish presentation  3) Study SIE  4) Call dentist (or defer).' },
        { label: 'Why', text: 'Handle the blocking, due-today task first — then protect the high-impact work. Low-impact, no-deadline tasks move to the end or off today entirely.' },
      ],
      decision: 'Reply to manager first — it’s due today and unblocks someone — then the presentation.',
    },
    contrast: {
      weak: 'Doing the five easy 10-minute tasks first feels productive — but two hours later the consequential work is still untouched and now you’re out of time.',
      better: 'Do the one high-impact (or blocking) task first, even though it’s bigger. Clearing small tasks can wait; the outcome depends on the important work.',
    },
    guided: {
      scenario: 'A classmate group project is due Friday. Today you have:',
      tasks: [
        'Send the shared notes your partner needs to start their section (they’re waiting)',
        'Polish your own slides (due Friday)',
        'Reorganize your study folder',
      ],
      prompts: [
        { q: 'What should you examine FIRST to order these?', options: ['Which task is shortest', 'Which task blocks someone else or has a hard deadline', 'Which task you enjoy most'], correct: 1, hint: 'One factor constrains everything else — it decides what has to happen before other work can move.', coach: 'Start with dependencies and hard deadlines. They constrain the rest of the order.' },
        { q: 'Which do you do first?', options: ['Send the shared notes (your partner is blocked)', 'Polish your slides', 'Reorganize your study folder'], correct: 0, hint: 'Who is waiting on you?', coach: 'Send the notes first — your partner is blocked until you do, and it’s cheap to unblock them. Your slides aren’t due until Friday; the folder can wait entirely.' },
      ],
    },
    quickcheck: [
      { q: 'A 5-minute "quick question" email just arrived. A report that decides next quarter’s budget is due in two days. Which is the higher priority right now?', options: ['The email — it’s quick and just arrived', 'The budget report — far higher impact', 'Whichever you feel like'], correct: 1, explain: 'Recent and quick ≠ important. The budget report has the larger consequence, so it outranks the loud-but-trivial email.' },
      { q: 'Two tasks are both due today. One blocks a teammate from starting their work; the other only affects you. Which goes first?', options: ['The one that blocks your teammate', 'The one that only affects you', 'It doesn’t matter'], correct: 0, explain: 'Unblocking a dependency lets other work proceed in parallel — do it first.' },
    ],
    reteach: [
      { approach: 'analogy', title: 'Think like an ER', body: 'An emergency room doesn’t treat whoever shouted first or whoever’s quickest to bandage — it treats by severity. Your list is the same: sort by consequence (and who’s blocked), not by volume or speed.' },
      { approach: 'visual', title: 'Impact × Urgency', body: 'Picture a 2×2. High-impact + urgent → do now. High-impact + not urgent → schedule and protect (this is where important work quietly slips). Low-impact + urgent → do fast or delegate. Low-impact + not urgent → drop.' },
      { approach: 'different-scenario', title: 'Home version', body: 'The bill with a late fee at midnight beats alphabetizing the spice rack — even though the spice rack is quicker and more satisfying. Consequence decides, not effort.' },
      { approach: 'step-by-step', title: 'One factor at a time', body: 'Go down the list once per factor: first mark anything that blocks others, then anything truly due today, then rank the rest by impact. The order falls out naturally.' },
      { approach: 'reverse', title: 'Work backward from regret', body: 'Ask: at the end of today, which UNFINISHED task would hurt most? Start there. That single question usually surfaces the real priority.' },
    ],
  },

  // ==========================================================================
  estimation: {
    key: 'estimation',
    title: 'Time Estimation',
    oneLiner: 'Predict how long work really takes — using breakdown, evidence, and buffer, not optimism.',
    visual: 'estimation-flow',
    concept: {
      what: 'Estimation is predicting how long a task will actually take before you start it.',
      why: 'Bad estimates wreck plans: you overcommit, miss deadlines, and lose trust — in yourself and others. Good estimates make a realistic day possible.',
      when: 'Before you commit to a deadline, schedule a block, or promise something to someone.',
      mistakes: [
        'The planning fallacy: estimating from the best-case, everything-goes-perfectly scenario.',
        'Estimating a whole project as one number instead of breaking it into parts.',
        'Ignoring how long similar work actually took you before.',
        'Leaving no buffer for interruptions and the unexpected.',
      ],
    },
    framework: {
      title: 'A six-step estimation process',
      keyIdea: 'People underestimate because they imagine the ideal run and skip the messy middle. Break work down, anchor on real past times, and add buffer.',
      steps: [
        { label: 'Clarify the task', text: 'Be specific about what "done" means before you estimate.' },
        { label: 'Break it into parts', text: 'List the actual steps — the whole is always longer than it looks as one block.' },
        { label: 'Estimate each part', text: 'Estimate the pieces, then add them up. Part-by-part beats a single guess.' },
        { label: 'Compare to prior experience', text: 'How long did similar work really take last time? Use that, not optimism.' },
        { label: 'Add buffer', text: 'Add slack (~20–30%) for interruptions and things that go sideways.' },
        { label: 'Review actual vs estimate later', text: 'Afterward, note the real time. Each miss calibrates your next estimate.' },
      ],
    },
    worked: {
      scenario: 'You budget 60 minutes to "prepare the quarterly report". Break it down:',
      tasks: [
        'Gather data — 20 min',
        'Review the numbers — 25 min',
        'Update slides — 30 min',
        'Proofread — 15 min',
        'Buffer — 15 min',
      ],
      steps: [
        { label: 'One block hides work', text: 'The single "60 minutes" ignored everything inside the task.' },
        { label: 'Add the parts', text: '20 + 25 + 30 + 15 = 90 minutes of real work — already 50% over the guess.' },
        { label: 'Add buffer', text: 'Add ~15 minutes of slack → about 105 minutes.' },
        { label: 'Why the first estimate was risky', text: 'It was a best-case number for a task you hadn’t broken down. Committing to 60 minutes would have guaranteed an overrun.' },
      ],
      decision: 'Realistic budget ≈ 1 hour 45 minutes, not 1 hour — and you can see exactly why.',
    },
    contrast: {
      weak: 'Estimating the whole project as one 60-minute block hides the gather / review / update / proofread work inside it — so the number is always too low.',
      better: 'Break it into parts, estimate each, add them up, then add buffer. The estimate becomes something you can actually defend.',
    },
    guided: {
      scenario: 'You need to write a 1,500-word essay tonight (student context).',
      prompts: [
        { q: 'What’s the best FIRST move before giving an estimate?', options: ['Guess a round number like "2 hours"', 'Break the essay into its parts (outline, draft, edit)', 'Start writing and see how it goes'], correct: 1, hint: 'A single number for a multi-part task is where estimates go wrong.', coach: 'Break it down first: outline, draft, edit each get their own estimate. The parts reveal the real size.' },
        { q: 'Your last three essays each took about 4 hours. Tonight you feel focused. What should you budget?', options: ['1 hour — you’re focused tonight', 'About 4 hours — match your actual history, then add a little buffer', 'However long is left before bed'], correct: 1, hint: '"This time will be different" is the planning fallacy talking.', coach: 'Anchor on your real history (~4 hours) and add buffer. Feeling focused rarely halves a task you’ve measured three times.' },
      ],
    },
    quickcheck: [
      { q: 'You’ve done a monthly report three times: 80, 95, and 100 minutes. How long should you budget for the next one?', options: ['30 minutes — you’ll be faster now', 'About 90–100 minutes, matching your history, plus buffer', 'However much time is left before it’s due'], correct: 1, explain: 'Your own recent actuals are the best predictor. Anchor there and add buffer — don’t re-guess low.' },
      { q: 'What’s the main reason a single "it’ll take an hour" estimate for a big task tends to be wrong?', options: ['Hours are hard to count', 'One block hides the separate steps inside the task', 'Estimates are always impossible'], correct: 1, explain: 'Breaking the task into parts surfaces the hidden work a single number skips over.' },
    ],
    reteach: [
      { approach: 'analogy', title: 'Like a road trip', body: 'You don’t estimate a trip as "a few hours" — you add up the legs, then pad for traffic and stops. Tasks are the same: sum the legs, then buffer for "traffic".' },
      { approach: 'visual', title: 'The estimate ladder', body: 'Initial guess → break into parts → sum the parts (realistic) → add buffer → (later) record actual. Each rung makes the number more honest; the first rung alone is where people stop and get burned.' },
      { approach: 'different-scenario', title: 'Cert-prep version', body: '"Study a chapter" hides: read (40m) + notes (20m) + practice set (30m). ~90 minutes, not the "one hour" you’d have promised.' },
      { approach: 'step-by-step', title: 'Do it once, slowly', body: '1) name the parts, 2) put a number on each, 3) add them, 4) add ~25%. That’s your estimate. Skipping straight to step 4 with one number is the trap.' },
      { approach: 'reverse', title: 'From the miss backward', body: 'Last time this ran long — why? Usually a step you didn’t count. Add that step explicitly this time and the estimate self-corrects.' },
    ],
  },

  // ==========================================================================
  decomposition: {
    key: 'decomposition',
    title: 'Task Decomposition',
    oneLiner: 'Turn vague or overwhelming work into a concrete next action with a clear "done".',
    visual: 'decomposition-hierarchy',
    concept: {
      what: 'Decomposition is breaking a big or fuzzy goal into a specific action you could start right now.',
      why: 'Vague goals stall — there’s nothing to actually DO, so they get skipped. A concrete next action removes the friction to start.',
      when: 'Whenever a task feels overwhelming, keeps getting avoided, or is phrased as a topic rather than an action.',
      mistakes: [
        'Confusing a project (many steps) with a task (one action).',
        'Leaving work vague ("work on presentation") with no concrete first step.',
        'Never defining what "done" means, so the task sprawls.',
      ],
    },
    framework: {
      title: 'From project to next action',
      keyIdea: 'A good next action is concrete, visible, and startable in a minute. If you can’t picture yourself physically doing it, it’s still too vague.',
      steps: [
        { label: 'Project vs task', text: 'Is this one action, or many? "Plan vacation" is a project; "compare three flights" is a task.' },
        { label: 'Name the true next action', text: 'The single smallest visible step that moves it forward now.' },
        { label: 'Make it concrete', text: 'Swap topics for verbs: not "study biology" but "do the 10 review questions in chapter 4".' },
        { label: 'Define "done"', text: 'Decide up front what finished looks like, so the task has an endpoint.' },
        { label: 'Shrink if overwhelmed', text: 'If you’re avoiding it, cut the first slice small enough that starting is easy.' },
      ],
    },
    worked: {
      scenario: 'Your list says "Plan vacation." That’s a project, not a task.',
      tasks: [
        'Project: Plan vacation',
        'Possible tasks: choose destination · compare flights · reserve hotel',
        'True next action: "Open a flight search and compare three nonstop options."',
      ],
      steps: [
        { label: 'Spot the project', text: '"Plan vacation" is many decisions — you can’t "do" it in one sitting.' },
        { label: 'List a few tasks', text: 'Destination, flights, hotel — the pieces underneath the project.' },
        { label: 'Pick the true next action', text: 'The smallest concrete step you can start now: compare three nonstop flights.' },
        { label: 'Define done', text: '"Done" = three options written down with price and time — then you decide.' },
      ],
      decision: 'The next action is "compare three nonstop flights", not the fuzzy "plan vacation".',
    },
    contrast: {
      weak: '"Work on presentation" is not a next action — it has no concrete first step and no definition of done, so it sits on the list untouched.',
      better: '"Draft the three bullet points for the financial slide" is concrete, startable now, and clearly finishable.',
    },
    guided: {
      scenario: 'Your list says "Study for SIE" (cert-prep). It keeps getting skipped.',
      prompts: [
        { q: 'Why does "Study for SIE" keep getting skipped?', options: ['You’re lazy', 'It’s too vague — there’s no concrete first action to start', 'It’s not important'], correct: 1, hint: 'This is about the wording of the task, not about you.', coach: 'It’s vague, so there’s nothing specific to begin. That’s a decomposition problem, not a motivation problem.' },
        { q: 'Which is the best next action?', options: ['"Study for SIE" (re-commit harder)', '"Complete 20 questions on Products & Risks"', '"Get good at the exam"'], correct: 1, hint: 'Which one could you literally start in the next minute?', coach: '"Complete 20 questions on Products & Risks" is concrete, startable, and finishable. Even better: "Review bond-yield notes, then do 20 Products & Risks questions."' },
      ],
    },
    quickcheck: [
      { q: 'Which of these is a true next action (not a project or a topic)?', options: ['"Get healthy"', '"Book a 30-minute dentist appointment for next week"', '"Work on finances"'], correct: 1, explain: 'A next action is concrete, visible, and startable now. "Get healthy" and "work on finances" are directions, not actions.' },
      { q: 'A task feels overwhelming and you keep avoiding it. What’s the most useful move?', options: ['Block a whole day and force it', 'Cut off the smallest first slice you can start now', 'Wait until you feel motivated'], correct: 1, explain: 'Shrink it. A big task becomes doable when the first step is small enough to just begin.' },
    ],
    reteach: [
      { approach: 'analogy', title: 'Address, not "go somewhere"', body: 'A GPS can’t route to "somewhere nice." It needs an address. A next action is the address: specific enough that you (or anyone) could act on it immediately.' },
      { approach: 'visual', title: 'The ladder down', body: 'PROJECT → MILESTONE → TASK → NEXT ACTION. You can only physically DO the bottom rung. Vague items live near the top; keep climbing down until you hit something you can start now.' },
      { approach: 'different-scenario', title: 'Work version', body: '"Improve onboarding" (project) → "draft the first three steps of the onboarding checklist" (next action). One you can start; the other you’ll avoid.' },
      { approach: 'step-by-step', title: 'Three questions', body: 'Ask: (1) Is this one step or many? (2) What’s the very next physical step? (3) How will I know it’s done? Answer those and the task becomes executable.' },
      { approach: 'reverse', title: 'Why did it stall?', body: 'A task that keeps sliding is almost always too vague or too big. Rewrite it as one concrete step — the stall usually disappears with the vagueness.' },
    ],
  },
});

export function lessonFor(topic) { return LESSONS[topic] || null; }
