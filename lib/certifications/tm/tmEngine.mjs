// ============================================================================
// tmEngine.mjs — Time-Management item generation, diagnosis, and concept analysis.
// ----------------------------------------------------------------------------
// Wires the slice generators into the governed blueprint and REUSES the shared,
// domain-agnostic metrics engine (lib/metrics.mjs). Analysis is per-subskill with a
// DOUBLE transfer gate: an area is "Strong" only when evaluated-high AND the learner
// has succeeded across ≥2 reasoning families AND ≥2 contexts AND their recent success
// is unassisted (no immediate reteach). Diagnoses behavior, never personality.
// ============================================================================
import { analyzeSkills, EVIDENCE, WEAK_THRESHOLD, STRONG_THRESHOLD } from '../../metrics.mjs';
import { metricsRegistryFor } from '../../certRegistry.mjs';
import { TOPICS, provenanceFor, CERT_ID, contextLabel } from './tmBlueprint.mjs';
import { TM_SLICE_GENERATORS } from './generators.mjs';
import { recurringMisconceptions } from '../../misconceptions.mjs';
import { familyOf } from './families.mjs';

// Transfer thresholds (domain-local; the shared engine has no context concept).
export const MIN_FAMILIES = 2;
export const MIN_CONTEXTS = 2;

// Learner-facing misconception dictionary: stable key -> { topic, subskill, phrase,
// remediation }. Behavioral, never personality. Keeps engine IDs out of the UI.
export const TM_MISCONCEPTION_INFO = {
  'urgency-importance-conflation': { topic: 'prioritization', subskill: 'urgencyVsImportance', phrase: 'treating what is urgent (time-pressured) as what is important (high-consequence)', remediation: 'Score each task on impact AND deadline separately; act on impact first, not on what is merely loud or soon.' },
  'easy-over-important':           { topic: 'prioritization', subskill: 'urgencyVsImportance', phrase: 'choosing quick, easy tasks over the higher-value one', remediation: 'Notice the pull toward easy wins; do one high-impact task before clearing small ones.' },
  'consequence-underweighting':    { topic: 'prioritization', subskill: 'consequenceImpact',    phrase: 'under-weighting the downstream consequence when choosing order', remediation: 'Ask "what is the cost if this is NOT done?" and let the largest consequence lead.' },
  'everything-is-priority':        { topic: 'prioritization', subskill: 'everythingFeelsUrgent', phrase: 'treating everything as top priority, which leaves no real order', remediation: 'When all feels urgent, rank by impact and true deadline and commit to a single top item.' },
  'duration-underestimation':      { topic: 'estimation',     subskill: 'durationEstimation',   phrase: 'estimating from the best case instead of the typical time', remediation: 'Budget the normal-conditions time for similar past work, not the fastest-ever run.' },
  'ignores-historical-evidence':   { topic: 'estimation',     subskill: 'historicalEvidence',   phrase: 'guessing fresh instead of using how long similar work actually took', remediation: 'Anchor estimates on your recent actuals for the same kind of task, then adjust.' },
  'no-buffer-planning':            { topic: 'estimation',     subskill: 'bufferSizing',         phrase: 'planning with no slack, so one interruption cascades', remediation: 'Add buffer for interruptions and estimate error, especially before hard deadlines.' },
  'optimistic-repeat-estimate':    { topic: 'estimation',     subskill: 'planningFallacy',      phrase: 'repeating the same optimistic estimate after it has already missed', remediation: 'Treat a miss as data: move the next estimate toward the actual and note the cause.' },
  'vague-goal-no-next-action':     { topic: 'decomposition',  subskill: 'vagueToActionable',    phrase: 'leaving work vague, so there is no concrete action to start', remediation: 'Rewrite the goal as a specific, doable next step you could start in a minute.' },
  'oversized-task-framing':        { topic: 'decomposition',  subskill: 'breakingOverwhelm',    phrase: 'framing the task as one giant block, which stalls the start', remediation: 'Break it into a small startable slice and begin with just that.' },
  'unclear-completion-criteria':   { topic: 'decomposition',  subskill: 'completionCriteria',   phrase: 'starting without a definition of "done," so the task sprawls', remediation: 'Define explicit completion criteria up front so you know when to stop.' },
  'plan-optimization-over-execution': { topic: 'decomposition', subskill: 'trueNextAction',    phrase: 'optimizing the plan/system instead of taking the next action', remediation: 'Cap planning; identify the single true next action and do it before refining anything.' },
};

export const AREA_LABELS = {
  'prioritization:urgencyVsImportance':   'Urgency vs importance',
  'prioritization:consequenceImpact':     'Consequence & impact',
  'prioritization:competingPriorities':   'Competing priorities',
  'prioritization:chooseWhatNotToDo':     'Choosing what not to do',
  'prioritization:everythingFeelsUrgent': 'When everything feels urgent',
  'estimation:durationEstimation':        'Duration estimation',
  'estimation:planningFallacy':           'Planning fallacy',
  'estimation:historicalEvidence':        'Using historical evidence',
  'estimation:bufferSizing':              'Buffer sizing',
  'estimation:correctionAfterMiss':       'Correcting after a miss',
  'decomposition:vagueToActionable':      'Vague → actionable',
  'decomposition:trueNextAction':         'The true next action',
  'decomposition:breakingOverwhelm':      'Breaking down overwhelm',
  'decomposition:completionCriteria':     'Defining "done"',
};
export function areaLabel(topic, subskill) { return AREA_LABELS[`${topic}:${subskill}`] || subskill; }

export const TM_GENERATORS = { ...TM_SLICE_GENERATORS };
export function hasGenerator(topic, subskill) { return typeof TM_GENERATORS[`${topic}:${subskill}`] === 'function'; }

// Generate one item, stamped with governed provenance + reasoning family + context.
export function generateTmItem({ topic, subskill, rng }) {
  const gen = TM_GENERATORS[`${topic}:${subskill}`];
  if (!gen) return null;
  const q = gen(rng);
  return {
    certId: CERT_ID,
    topic,
    subskill,
    concept: q.concept,
    family: familyOf(q.concept),
    context: q.context || null,
    prompt: q.prompt,
    options: q.options,
    correct: q.correct,
    explanation: q.explanation,
    meta: { ...(q.meta || {}), concept: q.concept, family: familyOf(q.concept), context: q.context || null, provenance: provenanceFor(topic, subskill) },
  };
}

// Anti-repetition picker: favor a DIFFERENT concept/family (and, where possible, a
// different context) than recently seen. Deterministic given rng.
export function generateVariedItem({ topic, subskill, rng, avoidConcepts = [], avoidContexts = [] }) {
  let last = null;
  for (let i = 0; i < 10; i++) {
    const item = generateTmItem({ topic, subskill, rng });
    if (!item) return null;
    last = item;
    const freshConcept = !avoidConcepts.includes(item.concept);
    const freshContext = !avoidContexts.length || !avoidContexts.includes(item.context);
    if (freshConcept && freshContext) return item;
  }
  return last;
}

export function generatableCells() {
  return Object.keys(TM_GENERATORS).map((k) => { const [topic, subskill] = k.split(':'); return { topic, subskill }; });
}

export function buildTmDiagnostic(rng, { perCell = 1 } = {}) {
  const cells = generatableCells();
  const plan = [];
  for (const c of cells) for (let i = 0; i < perCell; i++) plan.push({ ...c });
  for (let i = plan.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [plan[i], plan[j]] = [plan[j], plan[i]]; }
  return { plan };
}

// --- transfer + support helpers (domain-local gates on top of shared metrics) -----
function familiesPassed(transfer, key) {
  const t = (transfer && transfer[key]) || {};
  const fam = t.families || {};
  return Object.keys(fam).filter((f) => (fam[f] && fam[f].correct) > 0).length;
}
function contextsPassed(transfer, key) {
  const t = (transfer && transfer[key]) || {};
  const ctx = t.contexts || {};
  return Object.keys(ctx).filter((c) => (ctx[c] && ctx[c].correct) > 0).length;
}
// Recent success is unassisted when the MOST RECENT correct answer in the area did
// NOT immediately follow a reteach/hint. Prevents "Strong" while still dependent.
function recentUnassisted(domains, topic, subskill) {
  const hist = (domains?.[topic]?.[subskill]?.history) || [];
  for (let i = hist.length - 1; i >= 0; i--) {
    if (hist[i].c) return (hist[i].s || 'none') === 'none';
  }
  return false;
}

// Per-subskill analysis: strong / focus / developing / need-more-evidence + an
// evidence-derived recommendation. Only IMPLEMENTED slice subskills are considered.
export function tmConceptAnalysis(domains, misconceptions, transfer = {}) {
  const registry = metricsRegistryFor(CERT_ID);
  const analysis = analyzeSkills(domains || {}, registry);
  const cells = generatableCells();
  const cellSet = new Set(cells.map((c) => `${c.topic}:${c.subskill}`));
  const byArea = {};
  for (const c of analysis) { const key = `${c.domain}:${c.subskill}`; if (cellSet.has(key)) byArea[key] = c; }

  const strong = [], focus = [], developing = [], needEvidence = [];
  for (const c of cells) {
    const key = `${c.topic}:${c.subskill}`;
    const row = byArea[key];
    const base = { topic: c.topic, subskill: c.subskill, label: areaLabel(c.topic, c.subskill), key,
      trend: row && row.trend && row.trend.trend !== 'na' ? row.trend.trend : null };
    if (!row || row.evidenceState !== EVIDENCE.EVALUATED) { needEvidence.push(base); continue; }
    const m = row.mastery;
    const nFam = familiesPassed(transfer, key);
    const nCtx = contextsPassed(transfer, key);
    const unassisted = recentUnassisted(domains, c.topic, c.subskill);
    if (m >= STRONG_THRESHOLD && nFam >= MIN_FAMILIES && nCtx >= MIN_CONTEXTS && unassisted) {
      strong.push({ ...base, mastery: m, families: nFam, contexts: nCtx });
    } else if (m >= STRONG_THRESHOLD) {
      // High accuracy but transfer/independence not yet proven → Developing, with why.
      const needs = [];
      if (nFam < MIN_FAMILIES) needs.push('another question type');
      if (nCtx < MIN_CONTEXTS) needs.push('a different context');
      if (!unassisted) needs.push('an unassisted success');
      developing.push({ ...base, mastery: m, needsTransfer: true, needs });
    } else if (m < WEAK_THRESHOLD) {
      focus.push({ ...base, mastery: m });
    } else {
      developing.push({ ...base, mastery: m });
    }
  }
  strong.sort((a, b) => b.mastery - a.mastery);
  focus.sort((a, b) => a.mastery - b.mastery);
  developing.sort((a, b) => a.mastery - b.mastery);

  const patterns = recurringMisconceptions(misconceptions || {})
    .map((r) => ({ key: r.key, count: r.count, info: TM_MISCONCEPTION_INFO[r.key] || null }))
    .filter((r) => r.info);
  for (const p of patterns) {
    const areaKey = `${p.info.topic}:${p.info.subskill}`;
    const target = [...focus, ...developing].find((x) => x.key === areaKey);
    if (target && !target.pattern) target.pattern = { phrase: p.info.phrase, remediation: p.info.remediation, count: p.count };
  }

  const hasEnoughEvidence = strong.length + focus.length + developing.length >= 1;
  let recommendation;
  if (!hasEnoughEvidence) {
    recommendation = { kind: 'diagnostic', text: 'We need a little more evidence to see your strengths and focus areas. A short mixed set will get us started.' };
  } else if (focus.length) {
    const top = focus[0];
    const pat = top.pattern ? ` You appear to be ${top.pattern.phrase}.` : '';
    recommendation = { kind: 'practice-area', topic: top.topic, subskill: top.subskill, text: `Focus next on ${top.label}.${pat} Let’s practice it a different way.` };
  } else if (developing.length) {
    const top = developing[0];
    const note = top.needsTransfer
      ? ` You’re getting these right — let’s confirm ${top.needs.join(' and ')} before calling it mastered.`
      : ' A little more practice should move it into your strengths.';
    recommendation = { kind: 'practice-area', topic: top.topic, subskill: top.subskill, text: `You’re developing in ${top.label}.${note}` };
  } else {
    recommendation = { kind: 'mixed', text: 'Strong across every evaluated area — keep sharp with mixed practice, and try the areas you haven’t started yet.' };
  }
  return { hasEnoughEvidence, strong, focus, developing, needEvidence, patterns, recommendation };
}
