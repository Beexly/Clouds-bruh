import { signalId } from './ids.mjs';
import { now } from '../lib/clock.mjs';
import { int } from '../lib/num.mjs';

/** Map inventory level vs. threshold to a severity bucket. */
export function severityFor(onHand, threshold) {
  if (onHand <= 0) return 'out';
  if (onHand <= Math.ceil(threshold * 0.5)) return 'critical';
  if (onHand <= threshold) return 'low';
  return 'watch';
}

export function createRestockSignal(input = {}) {
  const onHand = int(input.onHand, 0);
  const threshold = int(input.threshold, 5);
  const at = input.detectedAt || now();
  return {
    id: input.id || signalId([input.sku || '', input.variantId || '', at]),
    productId: input.productId,
    variantId: input.variantId,
    sku: input.sku,
    onHand,
    reserved: int(input.reserved, 0),
    threshold,
    severity: input.severity || severityFor(onHand, threshold),
    recommendedQty: int(input.recommendedQty, Math.max(threshold * 2 - onHand, 0)),
    detectedAt: at,
    candidateId: input.candidateId,
  };
}
