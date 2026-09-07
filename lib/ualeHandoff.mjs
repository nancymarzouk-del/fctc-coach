// ============================================================================
// ualeHandoff.mjs — parse a safe UALE → FCTC launch handoff (pure, testable).
// ----------------------------------------------------------------------------
// When UALE launches FCTC for an authorized learner it appends a NON-SENSITIVE
// handoff to the URL: ?src=uale&lid=<opaque learner key>[&name=<display name>].
// This turns that into a LEARNER-SPECIFIC local profile id so the standalone app
// can auto-enter (skipping the "Enter a profile name" screen) AND so different
// UALE learners on the same device never share one profile.
//
// It carries NO tokens/JWT/email/password — only an opaque key (a hash of the
// account id, produced on the UALE side) and an optional display name. Junk or a
// direct visit (no src=uale) returns null → the normal profile-name screen shows.
// ============================================================================

export const UALE_PROFILE_PREFIX = 'uale:'; // namespaces UALE profiles away from typed names

// Parse a location.search string. Returns { profileId, displayName } or null.
export function parseUaleHandoff(search) {
  try {
    const p = new URLSearchParams(search || '');
    if (p.get('src') !== 'uale') return null;           // not a UALE launch → normal flow
    const lid = String(p.get('lid') || '').trim();
    // The opaque key is alphanumeric only (a hash). Reject anything else so a crafted
    // URL can't inject a weird/sensitive value as a profile id.
    if (!lid || !/^[a-z0-9]{6,40}$/i.test(lid)) return null;
    const name = String(p.get('name') || '').trim().slice(0, 60) || null;
    return { profileId: UALE_PROFILE_PREFIX + lid, displayName: name };
  } catch {
    return null;
  }
}
