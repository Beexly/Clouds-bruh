/** Small numeric helpers shared across the model layer. */

export function int(v, d = 0) {
  return Number.isFinite(v) ? Math.trunc(v) : d;
}

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/** Integer percentage of part/whole (0 when whole is 0). */
export function pct(part, whole) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}
