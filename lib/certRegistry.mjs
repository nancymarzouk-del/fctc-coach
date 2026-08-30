// ============================================================================
// certRegistry.mjs — the reusable PROFESSIONAL-CERTIFICATION abstraction.
// ----------------------------------------------------------------------------
// Sprint 2's second purpose: prove the architecture generalizes. A Certification is
// described uniformly here; FCTC (entry-level cognitive skills) and CFA Level I
// (professional knowledge) are BOTH represented by the same shape despite very
// different content and cognitive demands. Cert-specific question generation plugs
// in separately; the SHARED, cert-agnostic metrics engine (lib/metrics.mjs) consumes
// `metricsRegistryFor(id)` unchanged — the same pedagogy scores both certifications.
//
// Only abstractions justified by these two real use cases are introduced — no
// speculative universal platform. FCTC continues to work through its existing path;
// this registry ADDS a cross-certification view without changing FCTC's runtime.
// ============================================================================
import * as fctc from './fctcBlueprint.mjs';
import * as cfa from './certifications/cfa/cfaBlueprint.mjs';

// Uniform descriptor. `domains` + `subskillBlueprint` + `officialWeights` are the
// governance surface; `provenanceFor` stamps items; `examSeconds`/`calculatorAllowed`
// are exam facts. Generators/visuals are cert-specific and referenced elsewhere.
export const CERTIFICATIONS = {
  fctc: {
    id: 'fctc',
    name: 'FCTC — Firefighter Written Test',
    kind: 'entry-cognitive',
    blueprintSource: fctc.BLUEPRINT_SOURCE,
    practiceLabel: fctc.PRACTICE_LABEL,
    domainOrder: fctc.DOMAIN_ORDER,
    domains: fctc.DOMAINS,
    subskillBlueprint: fctc.SUBSKILL_BLUEPRINT,
    officialWeights: fctc.officialWeights,
    officialAllocation: () => fctc.officialMockAllocation(),
    examSeconds: fctc.OFFICIAL_EXAM_SECONDS,
    calculatorAllowed: fctc.CALCULATOR_ALLOWED,
    provenanceFor: fctc.provenanceFor,
  },
  'cfa-level-1': {
    id: cfa.CERT_ID,
    name: cfa.CERT_NAME,
    kind: 'professional-knowledge',
    blueprintSource: cfa.BLUEPRINT_SOURCE,
    practiceLabel: cfa.PRACTICE_LABEL,
    domainOrder: cfa.TOPIC_ORDER,
    domains: cfa.TOPICS,
    subskillBlueprint: cfa.SUBSKILL_BLUEPRINT,
    officialWeights: cfa.officialWeights,
    officialAllocation: (total) => cfa.officialMockAllocation(total),
    examSeconds: cfa.EXAM.minutesPerSession * 60 * cfa.EXAM.sessions,
    calculatorAllowed: cfa.CALCULATOR_ALLOWED,
    approvedCalculators: cfa.APPROVED_CALCULATORS,
    provenanceFor: cfa.provenanceFor,
  },
};

export function getCertification(id) { return CERTIFICATIONS[id] || null; }
export function listCertifications() {
  return Object.values(CERTIFICATIONS).map((c) => ({ id: c.id, name: c.name, kind: c.kind }));
}

// Build a metrics registry — { domainKey: { label, subskills: { key: { label } } } }
// — from a certification's blueprint, so the SHARED metrics engine works for ANY
// certification without modification. This is the single seam that lets one pedagogy
// engine score both FCTC and CFA.
export function metricsRegistryFor(id) {
  const cert = getCertification(id);
  if (!cert) return {};
  const reg = {};
  for (const dKey of cert.domainOrder) {
    const dom = cert.domains[dKey];
    const subsDef = cert.subskillBlueprint[dKey] || {};
    const subskills = {};
    for (const sKey of Object.keys(subsDef)) {
      if (sKey.startsWith('_')) continue; // skip the _cognitive descriptor
      subskills[sKey] = { label: sKey };
    }
    reg[dKey] = { label: dom?.label || dKey, subskills };
  }
  return reg;
}

// The list of { domain, subskill } coverage cells for a certification (used by
// diagnostics + mock planning). Skips the _cognitive descriptor.
export function coverageCells(id) {
  const cert = getCertification(id);
  if (!cert) return [];
  const cells = [];
  for (const dKey of cert.domainOrder) {
    const subsDef = cert.subskillBlueprint[dKey] || {};
    for (const sKey of Object.keys(subsDef)) {
      if (sKey.startsWith('_')) continue;
      cells.push({ domain: dKey, subskill: sKey });
    }
  }
  return cells;
}
