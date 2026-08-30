# UALE Professional-Certification Architecture — Ownership Boundary

_Decision record. Sprint 2B (CFA Level I). Owner: Nancy._

## Decision

**Option D — Keep the reusable certification intelligence in the standalone coach
repo (`fctc-coach`) for now, evolving it into the multi-certification "UALE Coach,"
with an explicit boundary and a documented future-migration path.**

FCTC is now just **one registered certification** alongside CFA Level I. The
cert-agnostic primitives are conceptually the **UALE Certification Engine**, not
FCTC-owned.

## Why (and why not the alternatives)

- **Not B (move into Florence/UALE now):** Florence is a **live private beta** with
  Supabase auth, the runtime beta gate, capabilities, learner profiles, analytics,
  and the Participation Agreement. Migrating the engine there now is a large change
  with material production/security risk, for architectural purity — explicitly
  discouraged by the sprint. The coach is also localStorage-only; folding it into
  Florence would entangle device-local progress with the Supabase model prematurely.
- **Not C (shared package now):** Extracting an npm/workspace package adds build and
  release machinery before a **third** certification justifies it. Premature.
- **Not A (permanently in fctc-coach):** Rejected as the *permanent* home — we must
  not let FCTC-specific infrastructure silently own UALE's entire certification
  product. Hence D (temporary + explicit boundary), not A.
- **D chosen:** the engine, tests, and deployment already live here; the metrics
  engine (`lib/metrics.mjs`) is already certification-agnostic; and UALE already
  launches this app via a **capability-gated external URL**
  (`lib/beta/experience.js` → `{ kind: "external", url, capability }`). CFA reuses
  that exact seam.

## The boundary (what is FCTC vs shared vs cert-specific)

| Layer | Files | Ownership |
|---|---|---|
| Shared pedagogy engine (cert-agnostic) | `lib/metrics.mjs` | UALE Certification Engine — **not** FCTC-specific |
| Certification registry / abstraction | `lib/certRegistry.mjs` | Shared |
| Study-plan foundation | `lib/studyPlan.mjs` | Shared (Sprint-3-ready) |
| Certification: FCTC | `lib/fctcBlueprint.mjs`, `lib/questionEngine.js`, `lib/mechanicalVisuals.mjs`, `lib/mathDiagnosis.mjs`, `lib/readingCoach.mjs`, `lib/recallCoach.mjs`, `lib/recallScenario.js` | FCTC only |
| Certification: CFA Level I | `lib/certifications/cfa/*` | CFA only |

Rule: cert-specific code lives under a certification namespace (`lib/certifications/<id>/`
for new certs; FCTC remains in place for stability). Shared code must not import
cert-specific modules except through the registry.

## Integration with Florence/UALE

UALE gates and launches each certification as an external, capability-scoped entry
point (like FCTC's `fctc` capability → `fctc-coach.vercel.app`). CFA will use a new
`cfa` capability → the coach's `/cfa` route. **No Florence change is required for the
engine work in this sprint**; adding the `cfa` capability + entry card in Florence is
a separate, small, capability-isolated change (a future step, assessed before build).

## Future migration triggers (revisit this decision when any occurs)

1. A **third** certification is added → extract a shared package (Option C).
2. Cross-device / cloud progress is required → integrate into Florence's Supabase
   model (Option B), keeping the cert-agnostic engine as the shared package.
3. The coach app needs Florence-authoritative identity/entitlement per certification.

Until a trigger fires, the engine stays here behind this documented boundary.
