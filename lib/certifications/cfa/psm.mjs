// ============================================================================
// psm.mjs — Practical Skills Module (PSM) tracking (fact-accurate, honest).
// ----------------------------------------------------------------------------
// CFA Institute REQUIRES completion of one PSM per level to receive an exam result.
// UALE does NOT reproduce the PSM — it only lets the candidate record which module
// they'll do and its status, and clearly states the requirement is completed on the
// CFA Institute Learning Ecosystem. Level I module options per the official PSM page.
// ============================================================================

export const PSM_OPTIONS = Object.freeze(['Financial Modeling', 'Python Programming Fundamentals']);

export const PSM_STATUS = Object.freeze({
  NOT_SELECTED: 'not-selected',
  NOT_STARTED: 'not-started',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
});

export const PSM_REQUIREMENT_NOTE =
  'A Practical Skills Module is required by CFA Institute — one must be completed to receive your Level I result. ' +
  'Complete it on the CFA Institute Learning Ecosystem; UALE only tracks your selection and status, it does not host the module.';

export function createPsmTracker() {
  return { selected: null, status: PSM_STATUS.NOT_SELECTED };
}

export function selectPsm(tracker, name) {
  if (!PSM_OPTIONS.includes(name)) return tracker;
  return { selected: name, status: PSM_STATUS.NOT_STARTED };
}

export function setPsmStatus(tracker, status) {
  if (!Object.values(PSM_STATUS).includes(status)) return tracker;
  if (!tracker.selected && status !== PSM_STATUS.NOT_SELECTED) return tracker; // can't progress without a selection
  return { ...tracker, status };
}
