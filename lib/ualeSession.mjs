// ============================================================================
// ualeSession.mjs — remember (safely) that a module was launched from UALE, and
// provide the canonical return target. Pure + dependency-free (testable).
// ----------------------------------------------------------------------------
// UALE launches an external module with ?src=uale&lid=<opaque>&name=<display>.
// The app scrubs those params from the URL after boot (see parseUaleHandoff), so
// we persist a SAFE, non-sensitive marker (`uale_launched_v1 = '1'`) — NO token,
// NO email, NO lid, NO PII — just "this device/session arrived from UALE". That
// lets every module show a persistent "Back to UALE" control after the scrub, and
// hides it for genuine direct visitors who never came from UALE.
// ============================================================================

// The canonical UALE production app. The return target is the BARE root — the
// learner lands back on the UALE Home / My Learning view. Intentionally carries
// NO query params (no lid/name/token/email) so nothing sensitive leaves in a URL.
export const UALE_HOME = 'https://florence-sand-phi.vercel.app';

const LAUNCH_KEY = 'uale_launched_v1';

function safeLocalStorage() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

// Call once on boot with location.search. If this is a UALE launch (src=uale),
// persist the safe marker and return true. Never stores any handoff value itself.
export function noteUaleLaunch(search) {
  try {
    const p = new URLSearchParams(search || '');
    if (p.get('src') !== 'uale') return false;
    const ls = safeLocalStorage();
    if (ls) ls.setItem(LAUNCH_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

// True if this device/session has ever been launched from UALE (marker persisted).
export function wasLaunchedFromUale() {
  const ls = safeLocalStorage();
  try { return !!ls && ls.getItem(LAUNCH_KEY) === '1'; } catch { return false; }
}

// A profile id created from a UALE handoff is namespaced `uale:<lid>` — itself a
// durable, PII-free signal that the learner came from UALE.
export function isUaleProfile(profileId) {
  return typeof profileId === 'string' && profileId.startsWith('uale:');
}

// The single source of truth for whether to show "Back to UALE".
export function launchedFromUale(profileId) {
  return isUaleProfile(profileId) || wasLaunchedFromUale();
}

// The safe return URL — bare canonical root, no params/PII.
export function ualeReturnUrl() {
  return UALE_HOME;
}
