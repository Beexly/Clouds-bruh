/**
 * Time-series feature extraction for trend detection — pure, dependency-free,
 * outlier-robust. All functions take a series array (oldest → newest).
 *
 * EWMA smooths noise; velocity/acceleration measure growth and whether it is
 * speeding up; a median+MAD z-score detects spikes robustly (better than
 * mean/std for spiky social data). Everything normalizes to 0..1 for scoring.
 */

const EPS = 1e-9;

export function ewma(series, alpha = 0.4) {
  if (!series || series.length === 0) return 0;
  let e = series[0];
  for (let i = 1; i < series.length; i++) e = alpha * series[i] + (1 - alpha) * e;
  return e;
}

export function median(arr) {
  if (!arr || arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Median absolute deviation. */
export function mad(arr) {
  if (!arr || arr.length === 0) return 0;
  const med = median(arr);
  return median(arr.map((x) => Math.abs(x - med)));
}

/** Short-term % growth of the EWMA level. */
export function velocity(series) {
  if (!series || series.length < 2) return 0;
  const now = ewma(series);
  const prev = ewma(series.slice(0, -1));
  return (now - prev) / Math.max(Math.abs(prev), EPS);
}

/** Is growth speeding up? (change in velocity) */
export function acceleration(series) {
  if (!series || series.length < 3) return 0;
  return velocity(series) - velocity(series.slice(0, -1));
}

/** Robust spike score of the latest point: (latest - median) / (1.4826·MAD). */
export function robustZ(series) {
  if (!series || series.length < 2) return 0;
  const latest = series[series.length - 1];
  return (latest - median(series)) / (1.4826 * mad(series) + EPS);
}

export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// Normalizers → 0..1
export const normLevel = (level, max = 100) => clamp01(level / max); // magnitude 0..max
export const normGrowth = (x) => clamp01(0.5 + x); // ratio: 0→0.5, +0.5→1, −0.5→0
export const normSpike = (z, cap = 4) => clamp01(z / cap); // positive spikes only
