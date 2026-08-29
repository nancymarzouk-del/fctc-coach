// ============================================================================
// metrics.mjs — the deterministic, evidence-aware learner-metrics core.
// ----------------------------------------------------------------------------
// This module is PURE: no imports, no I/O, no randomness, no Date.now(). Every
// function is a deterministic transform of plain data, so it can be unit-tested
// in plain Node (`node --test`) with hand-built learner fixtures and reasoned
// about line by line. `learningEngine.js` is a thin adapter that injects the
// SUBSKILLS registry; this file holds the actual pedagogy.
//
// THE PRODUCT RULE THIS MODULE ENFORCES
// -------------------------------------
// The system MUST distinguish "not enough evidence yet" from "this is a
// demonstrated weak area." A skill is never called weak on one or two attempts.
// Every subskill is classified into an explicit EVIDENCE STATE:
//
//   untested     — attempts === 0. We know nothing. Surface as "start here",
//                  NEVER as weak.
//   insufficient — 0 < attempts < MIN_EVIDENCE. We have a hint, not a verdict.
//                  May lean weak/strong PROVISIONALLY, but the honest message is
//                  "not enough evidence yet."
//   evaluated    — attempts >= MIN_EVIDENCE. Enough to make a defensible claim
//                  of demonstrated weakness or mastery.
//
// Only `evaluated` skills can be labelled demonstratedWeak / demonstratedStrong.
// Readiness is computed ONLY over evaluated skills and is withheld (null) until
// enough of the exam is actually evaluated — no false precision.
// ============================================================================

// ---- Tunable constants (single source of truth; all thresholds are here) -----
export const MIN_EVIDENCE = 4;      // attempts before a mastery/weakness verdict is allowed
export const WEAK_THRESHOLD = 0.6;  // evaluated recency-weighted accuracy below this = weak
export const STRONG_THRESHOLD = 0.85; // evaluated recency-weighted accuracy at/above this = mastered
export const RECENT_WINDOW = 6;     // "your last N questions" window for evidence & recency
export const HISTORY_CAP = 20;      // max per-subskill history entries retained
export const PRIOR = 0.5;           // neutral prior a thin estimate shrinks toward
export const SHRINK_K = 4;          // shrinkage strength; evidenceWeight = n/(n+K)
export const READINESS_MIN_EVALUATED = 3; // skills that must be evaluated before a % is shown
export const IMPROVE_DELTA = 0.2;   // early→late accuracy swing that counts as a real trend

export const EVIDENCE = Object.freeze({
  UNTESTED: 'untested',
  INSUFFICIENT: 'insufficient',
  EVALUATED: 'evaluated',
});

// ---- History entry tolerance -------------------------------------------------
// History entries are enriched objects { c: boolean, d: difficulty } going
// forward, but legacy saved states stored bare booleans. Every reader tolerates
// both so no learner's saved progress breaks.
function entryCorrect(e) { return typeof e === 'object' && e !== null ? !!e.c : !!e; }
function entryDifficulty(e) { return typeof e === 'object' && e !== null && Number.isFinite(e.d) ? e.d : null; }

function normHistory(history) {
  return Array.isArray(history) ? history : [];
}

// ---- Recency-weighted accuracy ----------------------------------------------
// Lifetime correct/attempts penalises an early miss forever, so a learner who
// missed once and then improved still reads as weak. We instead weight recent
// answers more: for entries stored oldest→newest, weight = position+1 (newest
// highest). This lets improvement and post-remediation recovery show up fast,
// which is the whole point of an adaptive coach.
export function recencyWeightedAccuracy(history) {
  const h = normHistory(history);
  if (h.length === 0) return null;
  let wSum = 0, cSum = 0;
  for (let i = 0; i < h.length; i++) {
    const w = i + 1; // newest entry (largest i) carries the most weight
    wSum += w;
    if (entryCorrect(h[i])) cSum += w;
  }
  return wSum > 0 ? cSum / wSum : null;
}

// Plain accuracy over the last RECENT_WINDOW answers (the number we quote to the
// learner: "missed 4 of your last 6"). Returns { correct, total, accuracy } or null.
export function recentWindow(history, window = RECENT_WINDOW) {
  const h = normHistory(history);
  if (h.length === 0) return null;
  const slice = h.slice(-window);
  const correct = slice.reduce((n, e) => n + (entryCorrect(e) ? 1 : 0), 0);
  return { correct, total: slice.length, accuracy: correct / slice.length, misses: slice.length - correct };
}

export function evidenceWeight(n) { return n / (n + SHRINK_K); }

export function evidenceState(attempts) {
  if (!attempts || attempts <= 0) return EVIDENCE.UNTESTED;
  if (attempts < MIN_EVIDENCE) return EVIDENCE.INSUFFICIENT;
  return EVIDENCE.EVALUATED;
}

// ---- Mastery (0..1) ----------------------------------------------------------
// A recency-weighted accuracy shrunk SYMMETRICALLY toward the neutral prior when
// evidence is thin. Thin evidence therefore reads as "we don't know" (~0.5), not
// as a false extreme:
//   1 correct  -> ~0.6  (not 1.0)      1 wrong -> ~0.4  (not 0.0!)
// The old formula returned 0.0 for a single miss, i.e. it declared a demonstrated
// weakness from one attempt — exactly the failure this design removes.
//
// Note: `subskillMastery` in the engine still returns 0 for an UNTESTED skill so
// the dashboard renders an empty bar; weakness is NEVER decided from this number
// (that goes through classifySkill's evidence gate).
export function masteryEstimate(s) {
  const attempts = s?.attempts || 0;
  if (attempts === 0) return PRIOR; // unknown -> neutral (engine maps to 0 for the UI bar)
  const wAcc = recencyWeightedAccuracy(s.history);
  const acc = wAcc == null ? (s.correct || 0) / attempts : wAcc;
  const ev = evidenceWeight(attempts);
  return acc * ev + PRIOR * (1 - ev);
}

// ---- Confidence (0..1): how much we trust the estimate ----------------------
// Two independent things make an estimate trustworthy: ENOUGH data, and STABLE
// data. Few attempts => low confidence even if accuracy looks perfect (this is
// what stops "3/3, mastered!" from a lucky run). Erratic recent results (high
// variance) also lower confidence. Consistent results — including consistent
// FAILURE — raise it, because a reliably-missed skill is a confident weakness.
export function confidenceEstimate(s) {
  const attempts = s?.attempts || 0;
  if (attempts === 0) return 0;
  const h = normHistory(s.history);
  const dataWeight = Math.min(attempts / (MIN_EVIDENCE * 2), 1); // full weight at 2x the evidence floor
  if (h.length < 2) return 0.15 * dataWeight; // one data point: barely any confidence
  const bits = h.map((e) => (entryCorrect(e) ? 1 : 0));
  const mean = bits.reduce((a, b) => a + b, 0) / bits.length;
  const variance = bits.reduce((a, b) => a + (b - mean) * (b - mean), 0) / bits.length;
  const stability = Math.max(0, 1 - variance * 3); // variance maxes at 0.25 (coin-flip) -> stability 0.25
  return dataWeight * stability;
}

// ---- Trend: is recent performance improving? --------------------------------
// Split history into an earlier half and a later half and compare accuracy.
// Needs at least MIN_EVIDENCE points to speak. Returns { trend, early, late }.
export function improvementTrend(history) {
  const h = normHistory(history);
  if (h.length < MIN_EVIDENCE) return { trend: 'na', early: null, late: null };
  const mid = Math.floor(h.length / 2);
  const first = h.slice(0, mid);
  const second = h.slice(mid);
  const accOf = (arr) => arr.reduce((n, e) => n + (entryCorrect(e) ? 1 : 0), 0) / arr.length;
  const early = accOf(first);
  const late = accOf(second);
  const delta = late - early;
  let trend = 'flat';
  if (delta >= IMPROVE_DELTA) trend = 'improving';
  else if (delta <= -IMPROVE_DELTA) trend = 'declining';
  return { trend, early, late, delta };
}

// ---- Recent error pattern ----------------------------------------------------
// Within the recent window: how many misses, the longest trailing miss run, and
// the difficulty most of those recent misses happened at (for the "including two
// at difficulty 2" clause — only surfaced when >= 2 misses share a difficulty).
export function recentErrorPattern(history, window = RECENT_WINDOW) {
  const h = normHistory(history);
  const slice = h.slice(-window);
  let misses = 0, trailingRun = 0, run = 0;
  const byDiff = new Map();
  for (const e of slice) {
    if (!entryCorrect(e)) {
      misses += 1;
      run += 1;
      const d = entryDifficulty(e);
      if (d != null) byDiff.set(d, (byDiff.get(d) || 0) + 1);
    } else {
      run = 0;
    }
  }
  // trailing run: count consecutive misses at the end of the slice
  for (let i = slice.length - 1; i >= 0; i--) {
    if (!entryCorrect(slice[i])) trailingRun += 1; else break;
  }
  let topDiff = null, topDiffCount = 0;
  for (const [d, c] of byDiff.entries()) if (c > topDiffCount) { topDiff = d; topDiffCount = c; }
  return { misses, total: slice.length, trailingRun, topDiff, topDiffCount };
}

// ============================================================================
// classifySkill — the single verdict for one subskill.
// ============================================================================
// `s` is a subskill state { attempts, correct, streak, difficulty, history, dueIn,
// lastSeen }. `meta` carries labels + optional prerequisite weight for ordering.
// The returned object is the ONLY thing downstream ranking/NBA logic reads, so
// the evidence gate lives in exactly one place.
export function classifySkill(s, meta = {}, opts = {}) {
  const attempts = s?.attempts || 0;
  const ev = evidenceState(attempts);
  const mastery = attempts === 0 ? 0 : masteryEstimate(s); // UI-facing: 0 for untested
  const confidence = confidenceEstimate(s);
  const wAcc = recencyWeightedAccuracy(s?.history);
  const recent = recentWindow(s?.history);
  const trend = improvementTrend(s?.history);
  const errors = recentErrorPattern(s?.history);
  const due = ev !== EVIDENCE.UNTESTED && (s?.dueIn ?? 1) <= 0;

  const evaluated = ev === EVIDENCE.EVALUATED;
  const demonstratedWeak = evaluated && wAcc != null && wAcc < WEAK_THRESHOLD;
  const demonstratedStrong = evaluated && wAcc != null && wAcc >= STRONG_THRESHOLD && confidence >= 0.5;
  // "provisional" = we have SOME data leaning weak, but not enough to call it.
  const provisionalWeak = ev === EVIDENCE.INSUFFICIENT
    && recent != null && recent.accuracy < WEAK_THRESHOLD;

  return {
    domain: meta.domain, domainLabel: meta.domainLabel,
    subskill: meta.subskill, subskillLabel: meta.subskillLabel,
    prereqWeight: meta.prereqWeight || 0,
    attempts, difficulty: s?.difficulty ?? 2,
    evidenceState: ev,
    mastery, confidence,
    weightedAccuracy: wAcc,
    recent, trend, errors, due,
    demonstratedWeak, demonstratedStrong, provisionalWeak,
    untested: ev === EVIDENCE.UNTESTED,
  };
}

// ---- Need score: ranks how much attention a skill deserves --------------------
// Deterministic weighted sum. IMPORTANT: an untested or insufficient skill can
// never out-rank a demonstrated weakness, because demonstrated weakness gets the
// dominant term. Factors the product spec asked for are all represented:
// severity, confidence-in-the-weakness, recency (due), error pattern,
// prerequisite importance, and recent improvement (which DAMPENS need).
export function skillNeed(c) {
  if (c.untested) {
    // Breadth matters, but unknown != urgent. Foundational skills first.
    return 0.30 + c.prereqWeight;
  }
  if (c.evidenceState === EVIDENCE.INSUFFICIENT) {
    // Gather more evidence — a bit more urgent if it's leaning weak.
    return 0.40 + (c.provisionalWeak ? 0.15 : 0) + c.prereqWeight * 0.5;
  }
  // Evaluated:
  const severity = c.weightedAccuracy == null ? 0 : Math.max(0, WEAK_THRESHOLD - c.weightedAccuracy) / WEAK_THRESHOLD; // 0..1
  const confident = c.confidence; // trust in the weakness signal
  const dueBoost = c.due ? 0.15 : 0;
  const patternBoost = c.errors.trailingRun >= 2 ? 0.10 : 0;
  const improvingDamp = c.trend.trend === 'improving' ? 0.15 : 0; // reward momentum: nudge down
  const base = c.demonstratedWeak ? 0.65 : 0.20; // demonstrated weakness dominates the ranking
  return base
    + severity * 0.30
    + confident * 0.10
    + dueBoost
    + patternBoost
    + c.prereqWeight
    - improvingDamp;
}

// ============================================================================
// analyzeSkills — classify every subskill in a domains map.
// ============================================================================
// `domains` is state.domains: { domainKey: { subskillKey: subskillState } }.
// `registry` supplies labels + prereq weights: { domainKey: { label,
// subskills: { subskillKey: { label, prereq? } } } }. Returned list is sorted by
// need (most-needed first) with the need score attached.
export function analyzeSkills(domains, registry) {
  const out = [];
  for (const [dKey, skills] of Object.entries(domains || {})) {
    const dDef = registry?.[dKey] || { label: dKey, subskills: {} };
    for (const [skKey, s] of Object.entries(skills || {})) {
      const skDef = dDef.subskills?.[skKey] || { label: skKey };
      const c = classifySkill(s, {
        domain: dKey, domainLabel: dDef.label || dKey,
        subskill: skKey, subskillLabel: skDef.label || skKey,
        prereqWeight: skDef.prereq ? 0.08 : 0,
      });
      c.need = skillNeed(c);
      out.push(c);
    }
  }
  out.sort((a, b) => b.need - a.need);
  return out;
}

// ============================================================================
// readiness — an HONEST overall score, or null when evidence is too thin.
// ============================================================================
// Computed ONLY over evaluated skills so untested skills don't masquerade as
// weaknesses dragging the score to zero. Withheld entirely (score:null) until at
// least READINESS_MIN_EVALUATED skills are evaluated — the dashboard then shows
// "building your baseline" instead of a fake percentage. Weakest-link aware:
// a single evaluated weakness still pulls the score down, because the exam is
// pass/fail across all sections.
export function readiness(domains, registry) {
  const analysis = analyzeSkills(domains, registry);
  const evaluated = analysis.filter((c) => c.evidenceState === EVIDENCE.EVALUATED);
  const evaluatedCount = evaluated.length;
  const totalCount = analysis.length;
  if (evaluatedCount < READINESS_MIN_EVALUATED) {
    return {
      score: null, sufficientEvidence: false,
      evaluatedCount, totalCount, band: 'building',
      weakestLabel: null,
    };
  }
  const masteries = evaluated.map((c) => (c.weightedAccuracy == null ? c.mastery : c.weightedAccuracy));
  const avg = masteries.reduce((a, b) => a + b, 0) / masteries.length;
  const weakest = Math.min(...masteries);
  const weakestSkill = evaluated.reduce((min, c) => {
    const v = c.weightedAccuracy == null ? c.mastery : c.weightedAccuracy;
    return v < min.v ? { v, label: c.subskillLabel } : min;
  }, { v: Infinity, label: null });
  const score = Math.round((avg * 0.75 + weakest * 0.25) * 100);
  const band = score >= 75 ? 'strong' : score >= 50 ? 'progressing' : 'foundational';
  return {
    score, sufficientEvidence: true,
    evaluatedCount, totalCount, band,
    weakestLabel: weakestSkill.label,
  };
}

// ============================================================================
// Evidence "why" copy — the sentence the dashboard shows under a recommendation.
// ============================================================================
function pluralQ(n) { return n === 1 ? 'question' : 'questions'; }

export function explainWeakness(c) {
  const label = c.subskillLabel;
  const r = c.recent;
  let sentence = `You've missed ${r.misses} of your last ${r.total} ${label} ${pluralQ(r.total)}`;
  if (c.errors.topDiff != null && c.errors.topDiffCount >= 2) {
    sentence += `, including ${c.errors.topDiffCount} at difficulty ${c.errors.topDiff}`;
  }
  sentence += '.';
  if (c.trend.trend === 'improving') {
    sentence += ' Your recent answers are trending up — keep the momentum.';
  }
  return sentence;
}

export function explainProvisional(c) {
  const label = c.subskillLabel;
  const pct = c.recent ? Math.round(c.recent.accuracy * 100) : 0;
  if (c.trend.trend === 'improving') {
    return `Recent ${label} accuracy is improving (now ${pct}%), but that's only ${c.attempts} ${pluralQ(c.attempts)} — not enough evidence yet to mark it mastered.`;
  }
  return `You've answered ${c.attempts} ${label} ${pluralQ(c.attempts)} so far (${pct}% recent). Keep going — there isn't enough evidence yet to judge this skill.`;
}

export function explainUntested(c) {
  return `You haven't practiced ${c.subskillLabel} (${c.domainLabel}) yet — a short set will map where you stand.`;
}

// ============================================================================
// nextBestAction — the ONE thing to do next, and WHY, deterministically.
// ============================================================================
// Priority order (each tier only reached if the tiers above are empty):
//   1. START      — no data at all: run a diagnostic.
//   2. WEAK        — a demonstrated weakness (evaluated + below threshold),
//                    highest need first. This is the core remediation loop.
//   3. REVIEW      — an evaluated, strong-but-due skill (spaced repetition).
//   4. BUILD       — an insufficient-evidence skill (esp. leaning weak): the
//                    honest "not enough evidence yet, keep practicing" case.
//   5. NEW         — an untested skill for breadth.
//   6. MAINTAIN    — everything evaluated & strong: mixed review / mock exam.
// The `why` field always cites concrete evidence; `kind` lets the UI theme it.
export function nextBestAction(domains, registry, opts = {}) {
  const analysis = analyzeSkills(domains, registry);
  const totalAnswered = opts.totalAnswered ?? analysis.reduce((n, c) => n + c.attempts, 0);

  if (totalAnswered === 0) {
    return {
      kind: 'start', title: 'Take a short diagnostic',
      why: 'A quick set across every area lets the coach find your real strengths and gaps before recommending focused practice.',
      domain: null, subskill: null, difficulty: 2,
    };
  }

  const weak = analysis
    .filter((c) => c.demonstratedWeak)
    .sort((a, b) => b.need - a.need);
  if (weak.length) {
    const c = weak[0];
    return {
      kind: 'weak', title: `Practice ${c.subskillLabel} next`,
      why: explainWeakness(c),
      domain: c.domain, subskill: c.subskill, difficulty: c.difficulty,
      skill: c,
    };
  }

  const due = analysis
    .filter((c) => c.due && c.evidenceState === EVIDENCE.EVALUATED && !c.demonstratedWeak)
    .sort((a, b) => b.need - a.need);
  if (due.length) {
    const c = due[0];
    return {
      kind: 'review', title: `Review ${c.subskillLabel}`,
      why: `It's been a while since you practiced ${c.subskillLabel} — a quick review keeps it sharp (spaced repetition).`,
      domain: c.domain, subskill: c.subskill, difficulty: c.difficulty, skill: c,
    };
  }

  const build = analysis
    .filter((c) => c.evidenceState === EVIDENCE.INSUFFICIENT)
    .sort((a, b) => b.need - a.need);
  if (build.length) {
    const c = build[0];
    return {
      kind: 'build', title: `Keep practicing ${c.subskillLabel}`,
      why: explainProvisional(c),
      domain: c.domain, subskill: c.subskill, difficulty: c.difficulty, skill: c,
    };
  }

  const untested = analysis
    .filter((c) => c.untested)
    .sort((a, b) => b.need - a.need);
  if (untested.length) {
    const c = untested[0];
    return {
      kind: 'new', title: `Start ${c.subskillLabel}`,
      why: explainUntested(c),
      domain: c.domain, subskill: c.subskill, difficulty: c.difficulty, skill: c,
    };
  }

  return {
    kind: 'maintain', title: 'Take a full mock exam',
    why: 'Every area you\'ve practiced is testing strong. A mixed, timed mock is the best way to hold that level and build exam stamina.',
    domain: null, subskill: null, difficulty: 3,
  };
}

// ============================================================================
// Mechanical remediation ladder — the response to repeated misses in a
// mechanical subskill. Deterministic sequence (no difficulty is merely dropped
// numerically; the LEARNING EXPERIENCE changes):
//   1. guided  — a fully-worked, simplified example the learner studies (not graded)
//   2. transfer — a fresh, different configuration at the floor difficulty (graded)
//   3. transfer — a slightly harder fresh configuration (guidance removed)
//   4. transfer — one more, to confirm the skill transfers, not just recognition
// Each item carries a `mode` the UI honors (guided = worked example, transfer =
// independent application) and a `guidance` note explaining the step.
export function mechanicalRemediationPlan(domain, subskill) {
  return [
    { domain, subskill, difficulty: 1, mode: 'guided', guidance: 'Study this worked example — the diagram shows exactly how it works.' },
    { domain, subskill, difficulty: 1, mode: 'transfer', guidance: 'Now a new configuration. Predict before you reveal.' },
    { domain, subskill, difficulty: 2, mode: 'transfer', guidance: 'A little harder — apply the same rule.' },
    { domain, subskill, difficulty: 2, mode: 'transfer', guidance: 'One more to confirm it transfers.' },
  ];
}

// ============================================================================
// Mock exam blueprint — a balanced, transparent question distribution.
// ----------------------------------------------------------------------------
// This is NOT a claim of official FCTC section weighting (no current official
// source is asserted); it is a deliberately balanced practice spread that
// guarantees every subskill in the covered domains is exercised several times
// at mixed difficulty. `domainSubskills` = { domain: [subskillKey, ...] }.
// Returns exactly `total` items { domain, subskill, difficulty }, deterministically
// shuffled so domains interleave like a real mixed exam.
export function mockBlueprint(domainSubskills, opts = {}) {
  const total = opts.total || 100;
  const weights = opts.weights || { mechanical: 0.4, math: 0.35, reading: 0.25 };
  const difficulties = opts.difficulties || [2, 3, 3, 4];
  const rng = opts.rng || (() => 0.5);
  const domains = Object.keys(domainSubskills).filter((d) => weights[d] && domainSubskills[d]?.length);

  // Largest-remainder allocation so the per-domain counts sum to EXACTLY total.
  const alloc = domains.map((d) => {
    const exact = total * weights[d];
    return { d, n: Math.floor(exact), frac: exact - Math.floor(exact) };
  });
  let assigned = alloc.reduce((a, b) => a + b.n, 0);
  alloc.sort((a, b) => b.frac - a.frac);
  for (let i = 0; assigned < total; i++, assigned++) alloc[i % alloc.length].n += 1;

  const items = [];
  alloc.forEach(({ d, n }, di) => {
    const subs = domainSubskills[d];
    for (let i = 0; i < n; i++) {
      items.push({
        domain: d,
        subskill: subs[i % subs.length],           // round-robin => every subskill covered
        difficulty: difficulties[(i + di) % difficulties.length],
      });
    }
  });
  // Deterministic Fisher–Yates so the exam is mixed, not domain-blocked.
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

// ---- Secondary recommendations (for a short list under the primary action) ----
// Distinguishes the two states the product rule cares about, in words.
export function recommendationList(domains, registry, opts = {}) {
  const analysis = analyzeSkills(domains, registry);
  const totalAnswered = opts.totalAnswered ?? analysis.reduce((n, c) => n + c.attempts, 0);
  const recs = [];
  if (totalAnswered === 0) {
    recs.push({ kind: 'start', text: 'Take a short diagnostic in each area so the coach can find your weak spots.' });
    return recs;
  }
  for (const c of analysis) {
    if (c.demonstratedWeak) {
      recs.push({ kind: 'weak', text: `${c.subskillLabel} (${c.domainLabel}): ${explainWeakness(c)}` });
    } else if (c.provisionalWeak) {
      recs.push({ kind: 'build', text: `${c.subskillLabel} (${c.domainLabel}): ${explainProvisional(c)}` });
    } else if (c.due && c.evidenceState === EVIDENCE.EVALUATED) {
      recs.push({ kind: 'review', text: `${c.subskillLabel} is due for a quick spaced review.` });
    }
    if (recs.length >= 4) break;
  }
  if (recs.length === 0) {
    recs.push({ kind: 'maintain', text: 'Strong across every evaluated area — keep sharp with mixed reviews and a full mock exam.' });
  }
  return recs;
}
