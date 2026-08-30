// ============================================================================
// recallCoach.mjs — visual-recall detail-type tracking + memory coaching.
// ----------------------------------------------------------------------------
// Pure and deterministic. Classifies WHAT KIND of detail a recall question tests
// (identity, count, location/spatial, direction, sequence, attribute, personnel
// position, equipment placement, hazard), teaches a matching memory strategy on
// reveal, and — from the learner's miss history — picks the detail type to focus
// on next and the board kind that exercises it (in a DIFFERENT context, never a
// near-identical scene). Tested in tests/recall.test.mjs.
// ============================================================================

export const DETAIL_TYPES = Object.freeze([
  'identity', 'count', 'spatial', 'direction', 'sequence', 'attribute', 'personnel', 'equipment', 'hazard',
]);

// Human labels for the owner/learner-facing summaries.
export const DETAIL_LABELS = Object.freeze({
  identity: 'object identity', count: 'object count', spatial: 'spatial layout',
  direction: 'direction', sequence: 'sequence', attribute: 'color / attribute',
  personnel: 'personnel position', equipment: 'equipment placement', hazard: 'hazard recognition',
});

// Memory strategy taught for each detail type — the transferable habit.
export const RECALL_STRATEGIES = Object.freeze({
  identity: 'Memory tip: scan the whole board left-to-right once, then focus on individual items — don’t fixate on the first thing you see.',
  count: 'Memory tip: count deliberately and re-count once. Group items (2 + 2 + 1) instead of counting one at a time.',
  spatial: 'Memory tip: build a mental map — entry point, victim, hazard — and how the rooms connect to each other.',
  direction: 'Memory tip: notice directional relationships (Alpha / Bravo / Charlie / Delta, left vs. right), not just the objects.',
  sequence: 'Memory tip: rehearse the order as a short count or story — 1st, 2nd, 3rd — while the board is up.',
  attribute: 'Memory tip: chunk each attribute with its owner — “red Engine 12”, “white-helmet Captain” — as one unit.',
  personnel: 'Memory tip: anchor each person to a landmark or unit — who is where, and doing what.',
  equipment: 'Memory tip: pair each tool with its compartment/location; placement is what’s tested, not just the tool.',
  hazard: 'Memory tip: find hazards first — they’re safety-critical. Fix what the hazard is and which side it’s on.',
});

export function recallStrategy(detailType) {
  return RECALL_STRATEGIES[detailType] || RECALL_STRATEGIES.identity;
}

// Classify a recall question's detail type from its prompt (falling back to the
// board subskill). Keyword rules ordered most-specific first.
export function classifyRecallDetail({ subskill, prompt } = {}) {
  const p = String(prompt || '').toLowerCase();
  if (/how many|how much/.test(p)) return 'count';
  if (/hazard/.test(p)) return 'hazard';
  if (/color|helmet/.test(p)) return 'attribute';
  if (/which side|entry|which direction|\bside\b/.test(p)) return 'direction';
  if (/which room|floor plan|stories|story|where .* victim/.test(p)) return 'spatial';
  if (/arrived (first|second|third|fourth|fifth)|listed first|which .* first|in .* order/.test(p)) return 'sequence';
  if (/compartment|tool|inventory|equipment/.test(p)) return 'equipment';
  if (/assignment|rank|command|captain|crew|who was/.test(p)) return 'personnel';
  // fall back to the subskill the board tagged
  const bySub = { sequence: 'sequence', personnel: 'personnel', directional: 'direction', equipment: 'equipment', dispatch: 'identity', observation: 'identity' };
  return bySub[subskill] || 'identity';
}

// Which board kind best exercises a given detail type (for the NEXT drill).
const DETAIL_BOARD = Object.freeze({
  equipment: 'equipment', personnel: 'roster', direction: 'floorplan', spatial: 'floorplan',
  sequence: 'command', attribute: 'apparatus', hazard: 'floorplan',
});
export function detailTypeToBoardKind(detailType) {
  return DETAIL_BOARD[detailType] || null; // null => any board kind
}

// Immutably record a miss against a detail type.
export function recordRecallMiss(misses, detailType) {
  const m = { ...(misses || {}) };
  if (detailType) m[detailType] = (m[detailType] || 0) + 1;
  return m;
}

// The detail type to focus on next: the most-missed one WITH ENOUGH EVIDENCE
// (>= 2 misses), mirroring the product rule that one miss is not a weakness.
// Returns null when there isn't a clear, evidenced focus yet.
export function focusDetailType(misses, minMisses = 2) {
  const m = misses || {};
  let best = null, bestN = 0;
  for (const [type, n] of Object.entries(m)) {
    if (n >= minMisses && n > bestN) { best = type; bestN = n; }
  }
  return best;
}
