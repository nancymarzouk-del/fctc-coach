// ============================================================================
// strategies.mjs — LEARN MODE strategy TOOLKIT for Time Management (Sprint 3+).
// ----------------------------------------------------------------------------
// Beyond the three core competencies (prioritization / estimation / decomposition),
// a struggling learner needs a practical toolkit of methods they can actually use
// across work, study, and personal life. This module teaches the METHODS: each
// strategy carries what it is, when to use it (and when NOT to), how to do it, a
// concrete example, its common failure, and one guided-practice item.
//
// It also teaches learners HOW TO CHOOSE a strategy from a problem (the selector),
// how to read low-motivation as an observable pattern (never "laziness"), and how
// to recover when a plan falls apart. Pure data + helpers — no scoring, no I/O,
// no mastery. Reading/using the toolkit is instruction, never formal mastery.
// ============================================================================

// Display groups for the toolkit shelf.
export const STRATEGY_GROUPS = Object.freeze([
  { key: 'plan', title: 'Plan the day', blurb: 'Shape the hours you actually have.' },
  { key: 'decide', title: 'Decide what matters', blurb: 'Choose — and choose what NOT to do.' },
  { key: 'start', title: 'Start & sustain', blurb: 'Begin when motivation is low; protect attention.' },
  { key: 'aware', title: 'Know your time', blurb: 'See where the hours really go.' },
  { key: 'improve', title: 'Improve over time', blurb: 'Turn each day into a better next one.' },
]);

export const STRATEGIES = Object.freeze({
  // ---- PLAN THE DAY --------------------------------------------------------
  'time-boxing': {
    id: 'time-boxing', name: 'Time boxing', group: 'plan',
    tagline: 'Give one task a fixed slot and a clear “done for now”.',
    what: 'You assign a specific block of time to a specific piece of work, decide what “done for this block” means, protect it, and then stop or reassess at the end.',
    when: 'Great for open-ended or avoidable work that would otherwise expand forever, and for capping tasks you tend to over-polish.',
    whenNot: 'It gets unrealistic when the box is a fantasy (45 min for a 3-hour job) or when the work genuinely can’t be interrupted at the buzzer — then estimate and block properly instead.',
    how: [
      'Pick the exact time and length: “9:00–9:45”.',
      'Define the finish line for the box: “slides 1–5 drafted”, not “work on the deck”.',
      'Protect the box — notifications off, one task only.',
      'At the buzzer, stop and reassess: done, extend deliberately, or reschedule.',
    ],
    example: { good: '9:00–9:45 — Finish slides 1–5.', bad: '“Work on the presentation sometime this morning.”' },
    failure: 'Setting a box with no defined finish line, so you drift; or blowing past the buzzer every time until the box means nothing.',
    guided: { q: 'Which is a proper time box?', options: ['“Study biology this afternoon.”', '“2:00–2:30 — do the 10 chapter-4 review questions.”', '“Get through as much as I can today.”'], correct: 1, hint: 'A box needs a specific time AND a specific finish line.', coach: 'A real box names the slot and the “done”: 2:00–2:30, ten questions. The others have neither a fixed time nor a clear stopping point.' },
  },
  'time-blocking': {
    id: 'time-blocking', name: 'Time blocking', group: 'plan',
    tagline: 'Lay your real tasks onto the real hours you have — and face the gap.',
    what: 'You map available time across fixed commitments, focus work, shallow/admin work, personal responsibilities, buffer, and breaks — so the plan reflects capacity, not wishes.',
    when: 'Any day with several competing demands, or when you keep “running out of time” despite working hard.',
    whenNot: 'A fully rigid block schedule can backfire on highly reactive days (front-line support, caregiving) — there, block only the few must-protect periods and leave the rest reactive.',
    how: [
      'Write down fixed commitments first (meetings, class, pickup).',
      'Count the hours actually left after them.',
      'Place your top focus work into your best hours; batch admin into a smaller block.',
      'Add buffer and a real break — then stop when the hours are full.',
    ],
    example: { good: 'Only 5 hours free, 8 hours of tasks → you cut, defer, delegate, shorten, or renegotiate until it fits 5.', bad: 'Listing 8 hours of work for a 5-hour day and “hoping to power through”.' },
    failure: 'Scheduling more than the hours hold. Eight hours of tasks in five available hours isn’t a planning problem to grind past — something must be removed, delayed, delegated, shortened, or renegotiated.',
    guided: { q: 'You have 5 hours free but 8 hours of tasks. What’s the right move?', options: ['Schedule all 8 and try to move fast', 'Decide what to cut, defer, delegate, shorten, or renegotiate so it fits 5', 'Skip planning and just start'], correct: 1, hint: 'You cannot fit 8 into 5 by willpower.', coach: 'Capacity is real. When the work exceeds the hours, the plan’s job is to choose what won’t happen today — not to pretend all of it will.' },
  },
  'backward-planning': {
    id: 'backward-planning', name: 'Backward planning', group: 'plan',
    tagline: 'Plan from the deadline back so nothing compresses at the end.',
    what: 'You start at the due date and work backward: final review ← first complete version ← major components ← starting milestone — then place those on the calendar.',
    when: 'Multi-day work with a fixed deadline: a report, an exam, an event, a submission.',
    whenNot: 'Overkill for a single short task you’ll finish in one sitting — just do it.',
    how: [
      'Write the deadline and what “finished” means.',
      'Step back one stage: what must be done just before that? (final review)',
      'Keep stepping back to the first milestone you can start now.',
      'Put each stage on a date, working forward from today.',
    ],
    example: { good: 'Exam Fri → Thu review, Wed full practice test, Tue finish weak topics, Mon start review — so Monday you know exactly what to do.', bad: 'Planning to “study a lot this week” and cramming everything Thursday night.' },
    failure: 'Only ever planning forward from today, so the hard middle gets squeezed and the last day becomes a panic.',
    guided: { q: 'A project is due Friday. Where should backward planning START?', options: ['With what you’ll do today', 'With the finished deadline state, then step back from it', 'With the easiest task'], correct: 1, hint: 'The name is a hint: which end do you start from?', coach: 'Start at “done on Friday” and walk backward. That reveals what must be true Thursday, Wednesday… and gives today a concrete first step.' },
  },
  'buffer-planning': {
    id: 'buffer-planning', name: 'Buffer planning', group: 'plan',
    tagline: 'Leave slack on purpose — days never run exactly to plan.',
    what: 'You deliberately reserve unscheduled time (roughly 20–30%) for interruptions, overruns, and switching between tasks, instead of packing every minute.',
    when: 'Every plan — especially days with meetings, dependencies on other people, or reactive work.',
    whenNot: 'There isn’t really a “don’t” — but on a truly protected deep-work block you can carry the buffer at the day level rather than inside the block.',
    how: [
      'After estimating your tasks, add ~25% on top.',
      'Leave gaps between blocks for setup and transitions.',
      'Keep one flexible slot for the thing you didn’t see coming.',
      'When you finish early, that’s buffer working — not a signal to cram more in.',
    ],
    example: { good: '90 min of real work → schedule ~110 min, with a gap after.', bad: 'Booking back-to-back blocks that assume zero interruptions.' },
    failure: 'Planning to 100% capacity, so a single surprise topples the whole day like dominoes.',
    guided: { q: 'You’ve estimated 3 hours of focused work for the afternoon. How should you schedule it?', options: ['Exactly 3 hours, back to back', 'About 3.5–4 hours with gaps and one flexible slot', 'Cram it into 2 hours to leave time free'], correct: 1, hint: 'What happens when one thing runs long?', coach: 'Add buffer and gaps. Real days include interruptions and transitions; slack absorbs them instead of breaking the plan.' },
  },
  'top-1-3': {
    id: 'top-1-3', name: 'Top 1–3 priorities', group: 'plan',
    tagline: 'Name the one to three outcomes that would make today a win.',
    what: 'Before touching the list, you choose the 1–3 outcomes that matter most today. Everything else is secondary by definition.',
    when: 'Start of any day or work session, especially when the list feels endless.',
    whenNot: 'If literally everything is genuinely trivial, you don’t need this — but that’s rare.',
    how: [
      'Ask: “If only a few things get done today, which must they be?”',
      'Write no more than three. Three is a maximum, not a target.',
      'Do them before the day fills with reaction.',
      'Let the rest be “if there’s time”.',
    ],
    example: { good: 'Today’s wins: (1) send the client proposal, (2) 90 min SIE study, (3) pick up prescription.', bad: 'A 15-item list where all 15 are marked “high priority”.' },
    failure: 'Calling ten things “top priority”. If everything is priority, nothing is — you’ll drift to the easiest, not the most important.',
    guided: { q: 'A learner marks 9 of 11 tasks “top priority”. What should they do?', options: ['Work faster to clear all 9', 'Choose the 1–3 outcomes that matter most; the rest are secondary', 'Do them alphabetically'], correct: 1, hint: 'Can everything really be the most important thing?', coach: 'Force the choice down to 1–3. Real priorities are the few things you protect first; a long “all-important” list is just a task list in disguise.' },
  },

  // ---- DECIDE WHAT MATTERS -------------------------------------------------
  'priority-matrix': {
    id: 'priority-matrix', name: 'Urgency × importance matrix', group: 'decide',
    tagline: 'Sort by important-vs-urgent — but don’t stop at the four boxes.',
    what: 'A quick sort into Important+Urgent, Important+Not-urgent, Less-important+Urgent, Less-important+Not-urgent — used as a starting lens, then refined by impact, consequences, dependencies, deadlines, who’s blocked, and opportunity cost.',
    when: 'When several things compete and “everything feels urgent”.',
    whenNot: 'Don’t apply it mechanically. The boxes are a first cut, not the final answer — a “less important” task that blocks five people may still go first.',
    how: [
      'Drop each task into one of the four boxes.',
      'Do Important+Urgent now; SCHEDULE and protect Important+Not-urgent (this is where real work quietly slips).',
      'Do-fast or delegate Less-important+Urgent; drop Less-important+Not-urgent.',
      'Then adjust for dependencies, consequences, and opportunity cost.',
    ],
    example: { good: 'A quiet, non-urgent certification study block gets scheduled and protected — because it’s important even though nothing forces it today.', bad: 'Spending the morning on urgent-but-trivial pings because they felt pressing.' },
    failure: 'Treating urgent as a synonym for important, so loud-but-low-impact work crowds out the quiet, high-impact work.',
    guided: { q: 'A task is urgent (someone keeps pinging) but low-impact. Where does it belong?', options: ['Do it first — it’s urgent', 'Do it fast or delegate it — don’t let it displace important work', 'It’s automatically your top priority'], correct: 1, hint: 'Urgent ≠ important.', coach: 'Urgent + low-impact = do fast or delegate. Handle it efficiently, but don’t let its volume push aside the work that actually matters.' },
  },
  'impact-effort': {
    id: 'impact-effort', name: 'Impact vs effort', group: 'decide',
    tagline: 'Find the quick wins — and unmask busywork that only feels productive.',
    what: 'You weigh each task’s payoff against its cost: high-impact work, quick wins (high impact / low effort), low-value busywork, and high-effort / low-return activity.',
    when: 'When choosing what’s worth your energy, or when you’re “busy all day” but little that matters gets done.',
    whenNot: 'Don’t let it become an excuse to only ever do easy quick wins and dodge the hard high-impact work.',
    how: [
      'Estimate each task’s impact and its effort.',
      'Grab genuine quick wins (high impact, low effort) early.',
      'Protect time for high-impact / high-effort work — it’s where outcomes live.',
      'Cut or batch low-value busywork.',
    ],
    example: { good: 'Sending one high-impact email that unblocks a decision, before reorganizing your inbox folders.', bad: 'Spending an hour color-coding a to-do list while the consequential task sits untouched.' },
    failure: 'Chasing the satisfying feeling of clearing many tiny tasks — quick tasks create the illusion of productivity while impact stalls.',
    guided: { q: 'Which is a “quick win” worth doing early?', options: ['Reorganizing your entire filing system (hours, low payoff)', 'A 5-minute reply that unblocks a teammate’s whole afternoon', 'Perfecting the formatting of a private note'], correct: 1, hint: 'High payoff for low effort.', coach: 'The 5-minute unblock is high impact for tiny effort — a true quick win. The others are high-effort or low-value busywork dressed up as progress.' },
  },
  'not-today': {
    id: 'not-today', name: 'The “not today” decision', group: 'decide',
    tagline: 'Good planning is deciding, on purpose, what will NOT get done.',
    what: 'For anything you can’t do today, you make a deliberate call: defer, delegate, reduce the scope, renegotiate, or delete it — instead of leaving it to guilt-driven drift.',
    when: 'Every time the list exceeds the hours (which is most days).',
    whenNot: 'Don’t “not-today” genuinely time-critical, blocking, or high-consequence work — that’s avoidance, not triage.',
    how: [
      'For each task that won’t fit, pick one: defer / delegate / reduce / renegotiate / delete.',
      'Defer to a real date, not “later”.',
      'Delegate with a clear ask; delete things that never actually mattered.',
      'Say it out loud: “Not today, and here’s the plan for it.”',
    ],
    example: { good: '“The blog post moves to Thursday; the receipts I’ll delegate; the old idea I’m deleting.”', bad: 'Carrying 20 undone items to tomorrow every single day, feeling behind.' },
    failure: 'Never deciding what NOT to do — so everything stays “open”, nothing is truly finished, and the backlog becomes a source of dread.',
    guided: { q: 'Five tasks won’t fit today. What’s the healthiest move?', options: ['Leave them all “open” and feel guilty', 'Deliberately defer, delegate, reduce, renegotiate, or delete each one', 'Delete your whole list and start over'], correct: 1, hint: 'Choosing what won’t happen is part of the skill.', coach: 'Make an explicit call on each. Deciding what NOT to do today — with a real plan for it — is exactly what good time management looks like.' },
  },
  'renegotiating': {
    id: 'renegotiating', name: 'Saying no / renegotiating', group: 'decide',
    tagline: 'Offer a real tradeoff instead of silently accepting the impossible.',
    what: 'When the workload can’t all fit, you communicate the tradeoff and let the other person choose the priority — rather than over-promising and quietly failing.',
    when: 'When a new request would blow past your real capacity, or two “musts” collide.',
    whenNot: 'Not a tool for dodging reasonable work — it’s for making genuine capacity limits visible and shared.',
    how: [
      'State what you can realistically do: “I can finish X or Y today.”',
      'Ask them to choose: “Which is the higher priority?”',
      'Offer an alternative timeline for the other item.',
      'Confirm the agreed tradeoff so expectations match reality.',
    ],
    example: { good: '“I can finish the report or the deck today — which do you need first?”', bad: 'Saying “sure, both” and then delivering neither well.' },
    failure: 'Silently accepting an impossible workload, then missing things and losing trust — worse than an honest tradeoff up front.',
    guided: { q: 'Your manager adds a task on an already-full day. Best response?', options: ['“Yes, I’ll do it all.” (then quietly fall behind)', '“I can finish X today or the new task — which is higher priority?”', 'Say nothing and hope it works out'], correct: 1, hint: 'Make the tradeoff visible and let them choose.', coach: 'Offer the real choice. Naming the tradeoff protects both the work and the relationship far better than an over-promise you can’t keep.' },
  },

  // ---- START & SUSTAIN -----------------------------------------------------
  'five-minute-start': {
    id: 'five-minute-start', name: 'Five-minute start', group: 'start',
    tagline: 'Commit to beginning for five minutes — not to finishing.',
    what: 'You lower the activation barrier by promising only to start: five minutes, the smallest visible step, materials open — permission to stop after, which you rarely use.',
    when: 'When you know what to do but can’t get yourself to start.',
    whenNot: 'If the real blocker is that the task is unclear or too big, decompose it first — a five-minute start on a vague task just stalls again.',
    how: [
      'Shrink the ask to “just start for five minutes”.',
      'Define the smallest executable next action.',
      'Prepare materials/environment first so beginning is frictionless.',
      'Start the timer. Stopping after five is allowed — momentum usually carries you on.',
    ],
    example: { good: 'Instead of “write report” → “open the doc and draft the three section headings.”', bad: 'Waiting to “feel ready” to write the whole report.' },
    failure: 'Turning the five-minute start into planning-to-plan, or picking a first step that’s still too vague to actually begin.',
    guided: { q: 'You keep not starting a report. Which is the best five-minute start?', options: ['“Write the whole report.”', '“Open the doc and draft the three section headings.”', '“Think about the report later.”'], correct: 1, hint: 'What could you literally begin in the next 60 seconds?', coach: 'Open the doc and draft three headings — concrete, tiny, startable now. It gets you moving; momentum tends to do the rest.' },
  },
  'implementation-intentions': {
    id: 'implementation-intentions', name: 'Implementation intentions', group: 'start',
    tagline: 'Pre-decide behavior with “If X happens, I will do Y.”',
    what: 'You bind an action to a specific trigger in advance — “After lunch, I will review SIE questions for 30 minutes before opening social media” — so the moment arrives with the decision already made.',
    when: 'For habits and easily-skipped intentions, and to protect focus at known temptation points.',
    whenNot: 'Won’t fix a task that’s genuinely unclear or too big — pair it with decomposition.',
    how: [
      'Pick a concrete cue: a time, a place, or “right after <existing habit>”.',
      'Attach one specific action to it.',
      'Write it as “If/When X, then I will Y.”',
      'Optionally name the thing it replaces (“…before opening social media”).',
    ],
    example: { good: '“After lunch, I will spend 30 minutes on SIE questions before opening social media.”', bad: '“I’ll study more this week.”' },
    failure: 'Vague triggers (“sometime today”) or stacking five intentions at once so none of them stick.',
    guided: { q: 'Which is a real implementation intention?', options: ['“I should exercise more.”', '“When I get home and change clothes, I will do a 20-minute walk before dinner.”', '“Exercise is important.”'], correct: 1, hint: 'It needs a specific trigger AND a specific action.', coach: 'The second binds a concrete cue (home + change clothes) to a specific action (20-minute walk). Pre-deciding removes the in-the-moment decision that usually loses.' },
  },
  'focus-sprints': {
    id: 'focus-sprints', name: 'Focus sprints', group: 'start',
    tagline: 'Focused interval + protected attention + deliberate break.',
    what: 'You work in a focused interval, then take a real break — repeating. The principle matters more than any fixed number: 25/5 suits some tasks, 45/10 or 60/10 suits deeper work.',
    when: 'For sustained focus work, and to make a daunting task feel finite (“just one sprint”).',
    whenNot: 'Don’t chop up work that needs long uninterrupted flow into tiny 25-minute pieces if a longer interval serves it better — match the interval to the task.',
    how: [
      'Choose an interval that fits the task (25/5, 45/10, 60/10).',
      'Protect the interval: one task, notifications off.',
      'Take the break deliberately — stand, move, look away.',
      'Repeat; stop before you burn out.',
    ],
    example: { good: 'Deep writing in 50-minute sprints with 10-minute breaks; quick admin in 25/5.', bad: 'Insisting 25/5 is the one correct method for every kind of work.' },
    failure: 'Treating one fixed interval as universally correct, or skipping the break so focus quietly degrades all afternoon.',
    guided: { q: 'What’s the real principle behind focus sprints?', options: ['25 minutes is the one correct work interval', 'Focused interval + protected attention + deliberate break, with the length matched to the task', 'Never take breaks so you keep momentum'], correct: 1, hint: 'Is any single number universally right?', coach: 'The principle is the point: focus, protect it, then genuinely rest — and size the interval to the work. 25/5, 45/10, 60/10 are all valid tools.' },
  },
  'distraction-control': {
    id: 'distraction-control', name: 'Distraction control', group: 'start',
    tagline: 'Change the environment instead of just “focusing harder”.',
    what: 'You engineer conditions for focus: reduce notifications, move the phone out of reach, single-task, cut app/website distractions, batch communications, and set up a focus-friendly space.',
    when: 'When you get interrupted or pulled off-task repeatedly, or catch yourself impulsively switching.',
    whenNot: 'It won’t rescue a task that’s unclear or unmotivating on its own — combine with decomposition or a five-minute start.',
    how: [
      'Silence non-urgent notifications during focus blocks.',
      'Put the phone in another room or out of sight.',
      'Do one thing at a time; close unrelated tabs and apps.',
      'Batch messages into set windows instead of all day.',
    ],
    example: { good: 'Phone in another room, notifications off, one document open during a study sprint.', bad: 'Keeping every app open and telling yourself to “just focus harder”.' },
    failure: 'Relying on willpower against a distracting environment — the environment usually wins. Fix the conditions, not just the intention.',
    guided: { q: 'You’re constantly pulled off-task by your phone. Best fix?', options: ['Tell yourself to focus harder', 'Put the phone in another room and silence notifications during focus blocks', 'Check it every few minutes so you don’t miss anything'], correct: 1, hint: 'Willpower vs environment — which usually wins?', coach: 'Change the conditions. Removing the phone and killing notifications beats fighting the urge repeatedly; you shouldn’t have to out-willpower your environment all day.' },
  },
  'task-batching': {
    id: 'task-batching', name: 'Task batching', group: 'start',
    tagline: 'Group similar tasks to pay the switching cost once.',
    what: 'You gather similar small tasks — email, calls, errands, admin — and do them together, so you set up once instead of switching contexts all day.',
    when: 'When many small same-type tasks are scattered across your day and fragmenting your attention.',
    whenNot: 'Don’t batch something genuinely urgent just to wait for the batch — handle time-critical items when they matter.',
    how: [
      'Group tasks by type: emails, calls, errands, admin.',
      'Give each group a single block.',
      'Do the whole batch in one setup, then move on.',
      'Keep the rest of the day free of that type of task.',
    ],
    example: { good: 'All errands in one trip; email answered in two set windows; calls back-to-back.', bad: 'Replying to email the instant each one arrives, all day long.' },
    failure: 'Constant context switching disguised as “staying responsive” — each switch has a hidden re-focus cost that batching avoids.',
    guided: { q: 'Email keeps interrupting your deep work all day. Best batching move?', options: ['Reply to each email the second it arrives', 'Answer email in two set windows and keep it out of focus blocks', 'Turn off email forever'], correct: 1, hint: 'Pay the switching cost once, not thirty times.', coach: 'Batch email into set windows. Every interruption carries a re-focus cost; grouping them protects your deep work and still keeps you responsive enough.' },
  },

  'task-decomposition': {
    id: 'task-decomposition', name: 'Task decomposition', group: 'start',
    tagline: 'Project → Milestone → Task → Next Action.',
    what: 'You break a big or vague goal down until you reach a concrete next action you could start right now — and you define what “done” means. (Covered in depth in the core skill; this is the quick-use version.)',
    when: 'Whenever work feels overwhelming, keeps getting avoided, or is written as a topic instead of an action.',
    whenNot: 'Not needed for a task that’s already one clear, startable step — just do it.',
    how: [
      'Ask: is this one action, or a project of many?',
      'Climb down: project → milestone → task → next action.',
      'Rewrite the next action as a concrete verb you can start now.',
      'Define what “done” looks like.',
    ],
    example: { good: '“Study for SIE” → “Complete 20 questions on Products & Risks.”', bad: '“Work on presentation” sitting untouched on the list for a week.' },
    failure: 'Leaving work at the “project” or “topic” level, so there’s nothing concrete to actually begin.',
    guided: { q: 'Which is a true next action?', options: ['“Get healthy.”', '“Book a 30-minute dentist appointment for next week.”', '“Work on finances.”'], correct: 1, hint: 'Which could you literally start in the next minute?', coach: 'Only the dentist appointment is concrete, visible, and startable now. The others are directions, not actions — they need to be climbed down further.' },
  },

  // ---- KNOW YOUR TIME ------------------------------------------------------
  'time-audit': {
    id: 'time-audit', name: 'Time audit', group: 'aware',
    tagline: 'Compare where you THINK time goes with where it actually goes.',
    what: 'You track your real time for a bit and compare it to your perception — surfacing hidden time sinks, context switching, and setup/transition time you never counted.',
    when: 'Especially when you “don’t know where the day went”, or keep running out of time despite effort.',
    whenNot: 'You don’t need to audit forever — a few representative days is usually enough to see the pattern.',
    how: [
      'For a day or two, jot what you actually do and for how long.',
      'Compare it to your guess beforehand.',
      'Look for hidden sinks: scattered interruptions, switching, setup time.',
      'Adjust your plan to match reality, not the story you tell yourself.',
    ],
    example: { good: '“I thought email was one hour — it was six 10-minute interruptions that shattered my deep work.”', bad: 'Assuming your time is spent the way you feel it is, and never checking.' },
    failure: 'Ignoring transition and switching time, so your estimates and plans are quietly built on fiction.',
    guided: { q: 'You believe you “only spent an hour on email”. What might a time audit reveal?', options: ['Exactly one focused hour, as expected', 'Six scattered 10-minute interruptions that also wrecked your focus around them', 'That email doesn’t take any time'], correct: 1, hint: 'Scattered minutes add up — and cost more than the minutes themselves.', coach: 'Often it’s many small interruptions, not one block — and each one also disrupts the deep work around it. Seeing the real pattern is the whole point of the audit.' },
  },

  // ---- IMPROVE OVER TIME ---------------------------------------------------
  'daily-review': {
    id: 'daily-review', name: 'Daily review', group: 'improve',
    tagline: 'A two-minute close-out that sets up tomorrow.',
    what: 'At day’s end you glance back — what got done, what slipped, what actually took longer — and pick tomorrow’s top 1–3 before you stop.',
    when: 'Every working day; especially valuable while you’re building the habit.',
    whenNot: 'Keep it short — a heavy nightly ritual you dread will just get skipped.',
    how: [
      'Note what you finished and what slipped (no guilt).',
      'Compare a couple of estimates to actuals to calibrate.',
      'Choose tomorrow’s top 1–3 outcomes now.',
      'Close the day — leave it there.',
    ],
    example: { good: '“Report done; study slipped to tomorrow; the deck took 2h not 1h. Tomorrow: study first, then errands.”', bad: 'Ending each day with no idea what happened or what’s next.' },
    failure: 'Skipping review, so the same estimation and planning mistakes repeat unchanged, day after day.',
    guided: { q: 'What’s the most useful thing to do in a daily review?', options: ['Relive everything that went wrong in detail', 'Note what slipped, calibrate one estimate, and set tomorrow’s top 1–3', 'Add ten new tasks for tomorrow'], correct: 1, hint: 'Review is for learning and setting up the next day, not self-criticism.', coach: 'Briefly learn (what slipped, estimate vs actual) and aim the next day (top 1–3). That’s what turns today into a better tomorrow.' },
  },
  'weekly-review': {
    id: 'weekly-review', name: 'Weekly review', group: 'improve',
    tagline: 'Zoom out weekly to steer, not just react.',
    what: 'Once a week you look across the whole week: what mattered, what kept slipping, upcoming deadlines, and what to protect time for — then shape the week ahead with backward planning.',
    when: 'Weekly, and whenever you feel busy-but-adrift over several days.',
    whenNot: 'Not a substitute for daily planning — it sits above it, not instead of it.',
    how: [
      'Review the past week: wins, repeated slips, patterns.',
      'Scan upcoming deadlines and commitments.',
      'Backward-plan the big ones onto the coming days.',
      'Decide the week’s few real priorities.',
    ],
    example: { good: '“The certification keeps getting bumped — this week I’m blocking two protected study mornings before anything else fills them.”', bad: 'Drifting week to week, only ever reacting to whatever shouts loudest.' },
    failure: 'Never zooming out, so important-but-not-urgent goals (health, certification, big projects) quietly never happen.',
    guided: { q: 'An important goal keeps slipping every week. What does a weekly review help you do?', options: ['Feel bad about it again', 'Spot the pattern and protect specific time for it before the week fills up', 'Wait until it becomes urgent'], correct: 1, hint: 'Important-but-not-urgent work needs to be scheduled, not hoped for.', coach: 'The weekly view catches the repeated slip and lets you protect time for it up front — before urgent noise crowds it out again.' },
  },
});

export const STRATEGY_ORDER = Object.freeze(Object.keys(STRATEGIES));
export function strategyFor(id) { return STRATEGIES[id] || null; }
export function strategiesInGroup(groupKey) { return STRATEGY_ORDER.filter((id) => STRATEGIES[id].group === groupKey); }

// ---- Strategy SELECTION: choose the method that fits the problem -------------
// The point isn't a catalog — it's learning HOW to pick. Each item maps a felt
// problem to the best-fit strategy (and names the runners-up in `also`).
export const STRATEGY_PROBLEMS = Object.freeze([
  { problem: '“I don’t know what to do first.”', options: ['Start with whatever’s quickest', 'Use a prioritization framework (impact, dependencies, deadlines)', 'Do the most fun task'], correct: 1, why: 'When the issue is ordering, prioritize by impact/dependencies/deadlines — not by speed or mood.', also: ['priority-matrix', 'top-1-3'] },
  { problem: '“I know what to do but I don’t start.”', options: ['Wait until you feel motivated', 'Five-minute start + smallest next action', 'Add it to a longer list'], correct: 1, why: 'The blocker is initiation, so lower the activation barrier — begin small, don’t wait on motivation.', also: ['five-minute-start', 'implementation-intentions'] },
  { problem: '“My day always runs out of time.”', options: ['Work faster and skip breaks', 'Time audit + realistic estimation + capacity planning + buffer', 'Add more to the schedule'], correct: 1, why: 'Running out of time is a capacity/awareness problem — see where time goes, estimate honestly, plan to real hours, add buffer.', also: ['time-audit', 'buffer-planning', 'time-blocking'] },
  { problem: '“I get interrupted all day.”', options: ['Reply to everything instantly', 'Time blocking + communication batching + protected focus periods', 'Just try to focus harder'], correct: 1, why: 'Interruptions are an environment/structure problem — block focus time, batch communications, protect attention.', also: ['time-blocking', 'task-batching', 'distraction-control'] },
  { problem: '“I keep putting off one large assignment.”', options: ['Block a whole day and force it', 'Decomposition + implementation intention + a time box', 'Wait for a burst of inspiration'], correct: 1, why: 'A stalled big task usually needs breaking down into a concrete next action, a trigger to start, and a bounded first block.', also: ['task-decomposition', 'implementation-intentions', 'time-boxing'] },
  { problem: '“Everything feels urgent.”', options: ['Do them in the order they arrived', 'Prioritize by impact, consequences, and dependencies', 'Do the loudest one'], correct: 1, why: 'When all feels urgent, the fix is to separate urgent from important and sort by consequence and who’s blocked.', also: ['priority-matrix', 'impact-effort'] },
  { problem: '“I make plans but never follow them.”', options: ['Make a bigger, more detailed plan', 'Cut capacity, fewer priorities, next-action planning, and a review habit', 'Stop planning entirely'], correct: 1, why: 'Plans fail when they’re overloaded — reduce what you commit to, name few priorities, plan concrete next actions, and review.', also: ['top-1-3', 'daily-review', 'time-blocking'] },
]);

export function evaluateSelector(problems = STRATEGY_PROBLEMS, answers = {}) {
  const total = problems.length;
  let correct = 0;
  problems.forEach((p, i) => { if (answers[i] === p.correct) correct += 1; });
  // Passing = a solid majority; selection is judgment, not perfection.
  return { total, correct, passed: total > 0 && correct / total >= 0.7 };
}

// ---- Low motivation / "laziness" as OBSERVABLE PATTERNS (never a label) ------
// We never diagnose a learner as lazy. We name what's observable and match a
// strategy to the likely cause.
export const MOTIVATION_PATTERNS = Object.freeze([
  { key: 'low-initiation', label: 'Low initiation', soundsLike: '“I know what I need to do but I don’t start.”', cause: 'The gap is starting, not knowing.', strategies: ['five-minute-start', 'implementation-intentions', 'task-decomposition'], note: 'Lower the setup friction and define the smallest next action — begin, don’t wait to feel ready.' },
  { key: 'low-motivation', label: 'Low drive', soundsLike: '“This matters, but I still don’t feel like doing it.”', cause: 'Motivation and action aren’t the same thing.', strategies: ['five-minute-start', 'focus-sprints', 'implementation-intentions'], note: 'Separate feeling from doing: shrink the threshold, define a bit of visible progress, pair the unpleasant task with a clear completion target, add accountability where it helps.' },
  { key: 'overwhelm', label: 'Overwhelm', soundsLike: '“There’s so much to do that I do nothing.”', cause: 'The pile is too big to act on as-is.', strategies: ['task-decomposition', 'top-1-3', 'not-today'], note: 'Externalize the whole list, choose ONE outcome, break it into a next action, and temporarily ignore the rest.' },
  { key: 'avoidance', label: 'Avoidance', soundsLike: '“I keep doing other things instead.”', cause: 'Usually the task is unclear, unpleasant, feared, too big, or has no immediate reward.', strategies: ['task-decomposition', 'five-minute-start', 'time-boxing'], note: 'Name the real cause first, then match the fix — clarify a vague task, shrink a big one, time-box a dreaded one.' },
  { key: 'perfectionism', label: 'Perfectionism delay', soundsLike: '“I can’t start until I can do it perfectly.”', cause: 'Fear of a poor result blocks any result.', strategies: ['time-boxing', 'five-minute-start'], note: 'Define “good enough”, time-box a first draft, and separate drafting from polishing — done beats perfect-and-unstarted.' },
  { key: 'poor-awareness', label: 'Poor time awareness', soundsLike: '“I lose track of where the time went.”', cause: 'The plan is built on a wrong sense of time.', strategies: ['time-audit', 'time-boxing', 'buffer-planning'], note: 'Use external timers, a visible schedule, a time audit, and transition buffers; review estimate vs actual.' },
  { key: 'impulsive-switching', label: 'Impulsive switching', soundsLike: '“I jump between things and finish none.”', cause: 'The environment keeps pulling attention.', strategies: ['distraction-control', 'task-batching', 'focus-sprints'], note: 'Change the environment rather than “focus harder”: remove distractions, batch, and work in protected sprints.' },
]);

// ---- Failure recovery: the plan WILL break; recover instead of abandoning ----
export const FAILURE_RECOVERY = Object.freeze({
  title: 'When the plan falls apart',
  intro: 'Good time management isn’t a perfect plan — it’s recovering well when a plan breaks. One derailed block is not a ruined day.',
  principles: [
    'Don’t abandon the whole day because one block went badly.',
    'Reassess the capacity you have LEFT, honestly.',
    'Identify what still matters most now.',
    'Move lower-priority work to another day (defer/delegate/reduce).',
    'Adjust expectations to the new reality.',
    'Restart with the next single concrete action.',
  ],
  scenario: {
    setup: 'A two-hour emergency at 10am wipes out your morning plan. You have three hours left and had five tasks scheduled.',
    prompt: 'What’s the best recovery move?',
    options: ['Give up on the day — it’s already ruined', 'Reassess the 3 remaining hours, pick what still matters most, defer the rest, and start the next concrete action', 'Try to still do all five tasks in three hours'],
    correct: 1,
    coach: 'Recover, don’t abandon. Three hours is still three hours: re-prioritize for the time you have, deliberately defer the rest, and restart with one concrete action. Cramming five into three just recreates the overload.',
  },
});

// ---- Mixed-life scenario: real life doesn't sort by category ----------------
export const MIXED_LIFE = Object.freeze({
  title: 'A real evening',
  setup: [
    'You work until 5.',
    'You need to study 90 minutes.',
    'You need groceries.',
    'Your child needs to be picked up.',
    'A bill is due.',
    'You are exhausted.',
  ],
  teaching: 'You can’t simply “fit everything in”. Real planning here is tradeoffs: the pickup and the bill are time-critical and non-negotiable; groceries can be reduced (a small trip or delivery) or deferred; study can be shortened to a protected 30–45 minutes rather than skipped entirely; and exhaustion is real capacity data, not a character flaw.',
  prompt: 'Which is the most realistic plan for the evening?',
  options: [
    'Force all six in full: pick up, full grocery trip, 90 min study, pay the bill, and push through the exhaustion.',
    'Do the non-negotiables first (pick up child, pay the bill), shrink study to a protected 30–45 min, reduce or defer groceries, and accept you won’t do everything at full size.',
    'Skip the pickup and bill so you can study the full 90 minutes.',
  ],
  correct: 1,
  coach: 'Protect the time-critical, high-consequence items (child, bill), then make deliberate tradeoffs on the rest — shrink study, reduce groceries — instead of pretending all six fit at full size. Honoring your real capacity is part of the plan.',
});
