import {
  ewma,
  velocity,
  acceleration,
  robustZ,
  clamp01,
  clamp,
  normLevel,
  normGrowth,
  normSpike,
} from './features.mjs';

/**
 * Trend scoring. Combines per-signal sub-scores into an explainable composite,
 * then multiplies by confidence (corroboration + data sufficiency), brand fit
 * (hard gate), and a saturation penalty for already-peaked trends.
 */

const SUB_WEIGHTS = { level: 0.25, velocity: 0.35, accel: 0.2, spike: 0.2 };
const SOURCE_WEIGHTS = { internalDemand: 0.3, searchTrend: 0.25, social: 0.2, marketplaceVelocity: 0.15 };
const RISING_WEIGHT = 0.1;

// Brand-fit: dark luxury × punk/gothic, profanity-free. Allowed categories mirror
// the Eclipse catalog plus adjacent luxury lanes; affinity terms boost on-brand fit.
const ALLOWED_CATEGORIES = new Set([
  'outerwear', 'tops', 'bottoms', 'footwear', 'bag', 'jewelry', 'accessory', 'home', 'beauty', 'fragrance',
]);
const AFFINITY = [
  'gothic', 'dark', 'noir', 'luxe', 'luxury', 'leather', 'silver', 'gold', 'chain', 'onyx',
  'oxblood', 'punk', 'chrome', 'wool', 'cashmere', 'minimal', 'tailored', 'ring', 'pendant',
  'boot', 'coat', 'velvet', 'lace', 'corset', 'harness', 'platform',
];
const DENY = ['cheap', 'knockoff', 'replica', 'counterfeit', 'fake'];

export function brandFit(term, { tags = [], category } = {}) {
  const t = String(term).toLowerCase();
  if (DENY.some((d) => t.includes(d))) return 0;
  if (category && !ALLOWED_CATEGORIES.has(category)) return 0;
  let score = 0.4; // base for on-brand category, profanity-free
  for (const a of AFFINITY) if (t.includes(a) || tags.includes(a)) score += 0.2;
  return clamp01(score);
}

/** Per-signal sub-score (0..1), de-seasonalized. */
export function subScore(series, seasonAdj = 1) {
  const raw =
    SUB_WEIGHTS.level * normLevel(ewma(series)) +
    SUB_WEIGHTS.velocity * normGrowth(velocity(series)) +
    SUB_WEIGHTS.accel * normGrowth(acceleration(series)) +
    SUB_WEIGHTS.spike * normSpike(robustZ(series));
  return clamp01(clamp01(raw) / clamp(seasonAdj, 0.5, 1.5));
}

/** Reviewer-facing trajectory label from the search series. */
export function trajectory(searchSeries = []) {
  const v = velocity(searchSeries);
  const a = acceleration(searchSeries);
  if (v > 0 && a > 0) return 'emerging';
  if (v > 0 && a <= 0) return 'steady';
  if (v <= 0 && normLevel(ewma(searchSeries)) > 0.6) return 'peaked';
  return 'declining';
}

/** Discount already-peaked/declining trends — we want emerging. */
export function saturation(searchSeries = []) {
  return velocity(searchSeries) <= 0 && acceleration(searchSeries) < 0 ? 0.6 : 1.0;
}

/**
 * Score one term against its collected signals.
 * signals: { searchTrend[], social[], marketplaceVelocity[], internalDemand[],
 *            rising:0..1, seasonAdj, points }
 * Returns the final 0..1 score plus a full, explainable component breakdown.
 */
export function scoreTerm(termObj, signals, opts = {}) {
  const sd = signals.seasonAdj ?? 1;
  const subs = {
    internalDemand: subScore(signals.internalDemand || [], sd),
    searchTrend: subScore(signals.searchTrend || [], sd),
    social: subScore(signals.social || [], sd),
    marketplaceVelocity: subScore(signals.marketplaceVelocity || [], sd),
  };
  const rising = clamp01(signals.rising ?? 0);
  const raw = clamp01(
    SOURCE_WEIGHTS.internalDemand * subs.internalDemand +
      SOURCE_WEIGHTS.searchTrend * subs.searchTrend +
      SOURCE_WEIGHTS.social * subs.social +
      SOURCE_WEIGHTS.marketplaceVelocity * subs.marketplaceVelocity +
      RISING_WEIGHT * rising
  );

  const subVals = Object.values(subs);
  const corroboration = subVals.filter((s) => s > 0.5).length / subVals.length;
  const sufficiency = clamp01((signals.points ?? 0) / (opts.minPoints ?? 8));
  const confidence = 0.5 * corroboration + 0.5 * sufficiency;

  const fit = brandFit(termObj.term, termObj);
  const sat = saturation(signals.searchTrend || []);
  const traj = trajectory(signals.searchTrend || []);
  const score = clamp01(raw * confidence * fit * sat);

  return {
    term: termObj.term,
    score,
    raw,
    confidence,
    corroboration,
    sufficiency,
    fit,
    saturation: sat,
    trajectory: traj,
    rising,
    subs,
  };
}

export { SUB_WEIGHTS, SOURCE_WEIGHTS, ALLOWED_CATEGORIES };
