// misconceptions.mjs — CFA compatibility shim.
// ----------------------------------------------------------------------------
// The cert-agnostic misconception memory was promoted to lib/misconceptions.mjs
// (Sprint 1 SIE) so multiple certifications share one implementation. CFA imports
// are preserved verbatim by re-exporting it here — behavior is byte-identical.
export * from '../../misconceptions.mjs';
