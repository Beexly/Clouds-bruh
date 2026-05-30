import { clamp } from '../lib/num.mjs';

/** Gross margin percentage from list and unit cost (minor units). */
export function marginPct(listMinor, costMinor = 0) {
  if (!listMinor || listMinor <= 0) return 0;
  return Math.round(((listMinor - (costMinor || 0)) / listMinor) * 100);
}

/** Pricing score: margin drives 80%, sitting at/above the brand floor adds 20. */
export function pricingScore({ listMinor, floorMinor = 0, costMinor = 0 } = {}) {
  if (!listMinor || listMinor <= 0) return 0;
  let s = clamp(marginPct(listMinor, costMinor), 0, 100) * 0.8;
  if (listMinor >= floorMinor) s += 20;
  return clamp(Math.round(s), 0, 100);
}

// Eclipse runs healthy margins — a candidate below this is flagged for review.
export const MARGIN_FLOOR_PCT = 50;
