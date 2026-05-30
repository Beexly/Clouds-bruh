/**
 * Launch gate DEFINITIONS. The predicate logic lives in scoring/launch-gate.mjs
 * keyed by `check`. Required gates must all pass before a product can publish;
 * `human_approved` is required, which is how "nothing goes live without a human"
 * is encoded in the gate system itself.
 */
export const LAUNCH_GATES = Object.freeze([
  { id: 'has_title', label: 'Has title', weight: 5, required: true, check: 'hasTitle' },
  { id: 'has_description', label: 'Has description', weight: 5, required: true, check: 'hasDescription' },
  { id: 'has_variant', label: 'Has at least one variant', weight: 10, required: true, check: 'hasVariant' },
  { id: 'priced_above_floor', label: 'Price at or above floor', weight: 10, required: true, check: 'pricedAboveFloor' },
  // Sin 1 (unit economics): never publish at a non-positive contribution margin.
  { id: 'positive_margin', label: 'Positive contribution margin', weight: 10, required: true, check: 'positiveMargin' },
  { id: 'has_supplier', label: 'Has a supplier', weight: 10, required: true, check: 'hasSupplier' },
  { id: 'media_ok', label: 'Approved imagery meets minimum', weight: 10, required: true, check: 'mediaOk' },
  // On-voice, honest copy — off-voice/dishonest copy can never publish.
  { id: 'copy_on_voice', label: 'Copy is on-voice and honest', weight: 10, required: true, check: 'copyOnVoice' },
  { id: 'readiness_ok', label: 'Readiness score at least 70', weight: 10, required: true, check: 'readinessOk' },
  { id: 'human_approved', label: 'Human approved', weight: 25, required: true, check: 'humanApproved' },
]);

export function gateResult(gateId, passed, detail) {
  return { gateId, passed: !!passed, detail };
}
