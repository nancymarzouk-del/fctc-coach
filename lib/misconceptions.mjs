// ============================================================================
// misconceptions.mjs — SHARED, cert-agnostic misconception MEMORY (evidence-gated).
// ----------------------------------------------------------------------------
// Accumulates diagnosed misconception observations ACROSS different questions so a
// certification tutor can recognize a RECURRING pattern (never labels a learner from
// one mistake — a misconception is "recurring" only after enough independent
// observations). Pure + testable; phrasing stays honest while evidence is thin.
//
// Promoted here from lib/certifications/cfa/ (Sprint 1 SIE) because it is genuinely
// certification-generic. CFA re-exports this module unchanged, so CFA behavior is
// byte-identical; SIE and any future cert import it directly.
// ============================================================================

export const MISCONCEPTION_FLAG_THRESHOLD = 3; // independent observations before we act on it

export function emptyMisconceptionMemory() { return { counts: {}, total: 0 }; }

// Record one observed misconception key. No-op for a null key (a correct answer).
// Returns a new memory (immutable).
export function recordMisconception(memory, key) {
  const m = memory && memory.counts ? { counts: { ...memory.counts }, total: memory.total } : emptyMisconceptionMemory();
  if (!key) return m;
  m.counts[key] = (m.counts[key] || 0) + 1;
  m.total += 1;
  return m;
}

// Misconceptions observed at/above the threshold, most frequent first. Thin-evidence
// keys are intentionally NOT returned.
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
