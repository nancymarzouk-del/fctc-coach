// ============================================================================
// misconceptions.mjs — cross-question misconception MEMORY (evidence-gated).
// ----------------------------------------------------------------------------
// Sprint 2 diagnosed a misconception per wrong answer; Sprint 2B accumulates those
// observations ACROSS different questions so UALE can recognize a recurring pattern
// (e.g., repeatedly discounting in the wrong direction, confusing nominal/effective
// rates, reversing the duration/rate relationship). A single mistake NEVER labels a
// learner — a misconception is only "recurring" after enough independent observations.
// Pure + testable; the phrasing stays honest while evidence is thin.
// ============================================================================

export const MISCONCEPTION_FLAG_THRESHOLD = 3; // independent observations before we act on it

export function emptyMisconceptionMemory() { return { counts: {}, total: 0 }; }

// Record one observed misconception key (from tvm/ethics/topic diagnosis). No-op for
// a null key (a correct answer). Returns a new memory (immutable).
export function recordMisconception(memory, key) {
  const m = memory && memory.counts ? { counts: { ...memory.counts }, total: memory.total } : emptyMisconceptionMemory();
  if (!key) return m;
  m.counts[key] = (m.counts[key] || 0) + 1;
  m.total += 1;
  return m;
}

// Misconceptions observed at/above the threshold, most frequent first — these are
// worth targeted remediation. Thin-evidence keys are intentionally NOT returned.
export function recurringMisconceptions(memory, threshold = MISCONCEPTION_FLAG_THRESHOLD) {
  const counts = (memory && memory.counts) || {};
  return Object.entries(counts)
    .filter(([, n]) => n >= threshold)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

// Honest, evidence-appropriate phrasing for a given key/count.
export function misconceptionPhrase(key, count, threshold = MISCONCEPTION_FLAG_THRESHOLD) {
  const label = String(key || '').replace(/-/g, ' ');
  if (count < threshold) {
    return `This may indicate difficulty with ${label}. Let's gather a bit more evidence before targeting it.`;
  }
  return `You've shown this pattern with ${label} ${count} times across different questions — let's work on it directly.`;
}
