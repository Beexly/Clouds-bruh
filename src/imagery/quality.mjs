import { clamp } from '../lib/num.mjs';

/**
 * Image quality system (R4, from docs/research/03). "Feel before you buy" is an
 * imagery-quality problem with a known finishing chain. Eclipse's dep-free core
 * can't run HDR/ISP enhancement, so it instead ENFORCES a quality bar: a hard
 * gate (all must pass) + a 0–100 soft score. Real enhancement lives in an
 * adapter/MCP; these metrics are recorded back onto each MediaRef by the imagery
 * agent (mock now: derived from provenance/role; live: measured from the asset).
 *
 * A MediaRef may carry a `metrics` object:
 *   { width, height, clippingPct, colorProfile, sharpness, noise, brandSafe }
 * Absent metrics → treated as unmeasured (fails the hard gate until measured).
 */

// The required shot list — Tier 1 must all exist (approved) for a complete PDP.
export const REQUIRED_SHOTS = Object.freeze(['hero', 'front', 'detail', 'scale']);
export const SHOT_TIERS = Object.freeze({
  tier1: ['hero', 'front', 'detail', 'scale'], // mandatory
  tier2: ['back', 'angle', 'flatlay'], // readiness boost
  tier3: ['video', 'spin'], // premium "feel"
});

// Hard thresholds (luxury e-commerce; 03 §scorecard).
export const HARD = Object.freeze({
  minLongEdge: 2000, // px — enables zoom
  maxClippingPct: 2, // highlight/shadow clipping ceiling
  colorProfile: 'srgb',
  minSharpness: 0.5, // 0..1 focus floor
  maxNoise: 0.4, // 0..1 noise ceiling
});

/** Hard gate for ONE media ref: returns { passed, failures[] }. */
export function checkMediaHard(m = {}) {
  const failures = [];
  if (!m.approved) failures.push('not human-approved');
  const q = m.metrics || {};
  const longEdge = Math.max(q.width || 0, q.height || 0);
  if (longEdge < HARD.minLongEdge) failures.push(`resolution ${longEdge}px < ${HARD.minLongEdge}px`);
  if ((q.clippingPct ?? 100) > HARD.maxClippingPct) failures.push('highlight/shadow clipping too high');
  if ((q.colorProfile || '').toLowerCase() !== HARD.colorProfile) failures.push('color profile not sRGB');
  if ((q.sharpness ?? 0) < HARD.minSharpness) failures.push('not sharp enough');
  if ((q.noise ?? 1) > HARD.maxNoise) failures.push('too noisy');
  if (q.brandSafe === false) failures.push('not brand-safe');
  return { passed: failures.length === 0, failures };
}

// Soft 0–100 quality score weights (03 §scorecard).
const SOFT_WEIGHTS = {
  tonal: 20, // tonal range / local contrast
  sharpness: 15,
  color: 15, // accuracy & restraint
  noise: 10,
  resolution: 10,
  composition: 10,
  background: 10,
  brandLook: 10,
};

/** Soft 0–100 quality score for ONE media ref from its metrics. */
export function mediaQualityScore(m = {}) {
  const q = m.metrics || {};
  const longEdge = Math.max(q.width || 0, q.height || 0);
  const resHeadroom = clamp((longEdge - 1000) / (3000 - 1000), 0, 1); // 1000→0, 3000+→1
  const parts = {
    tonal: q.tonalRange ?? q.sharpness ?? 0,
    sharpness: q.sharpness ?? 0,
    color: q.colorProfile === 'srgb' ? clamp(q.colorAccuracy ?? 0.8, 0, 1) : 0,
    noise: 1 - clamp(q.noise ?? 1, 0, 1),
    resolution: resHeadroom,
    composition: q.composition ?? 0.7,
    background: q.background ?? 0.7,
    brandLook: q.brandLook ?? 0.7,
  };
  let s = 0;
  for (const [k, w] of Object.entries(SOFT_WEIGHTS)) s += w * clamp(parts[k] ?? 0, 0, 1);
  return clamp(Math.round(s), 0, 100);
}

/**
 * Product-level imagery assessment: which required shots exist (approved), the
 * hard-gate pass for each, and the average soft score. `complete` (all Tier-1
 * shots present, approved, hard-passing) is what the launch gate consults.
 */
export function assessProductImagery(media = []) {
  const approved = media.filter((m) => m.approved);
  const rolesPresent = new Set(approved.map((m) => m.role));
  const missing = SHOT_TIERS.tier1.filter((r) => !rolesPresent.has(r));
  const perShot = approved.map((m) => ({ role: m.role, hard: checkMediaHard(m), score: mediaQualityScore(m) }));
  const hardFails = perShot.filter((s) => !s.hard.passed);
  const avgScore = perShot.length ? Math.round(perShot.reduce((a, s) => a + s.score, 0) / perShot.length) : 0;
  const complete = missing.length === 0 && hardFails.length === 0 && approved.length > 0;
  return {
    complete,
    missingShots: missing,
    hardFailures: hardFails.map((s) => ({ role: s.role, failures: s.hard.failures })),
    averageScore: avgScore,
    shotCount: approved.length,
    perShot,
  };
}

// Minimum average soft score for a premium PDP.
export const QUALITY_MIN = 75;
