import { TREND_TERMS } from './terms.mjs';
import { collectSignals } from './signals.mjs';
import { scoreTerm } from './score.mjs';
import { slugify } from '../model/ids.mjs';
import { shortHash } from '../lib/hash.mjs';

/**
 * Orchestrate trend detection: for each term, pull signals → score → gate →
 * dedupe near-duplicate motifs → rank. Pure and deterministic given a seed.
 *
 * Gates: score ≥ tau AND confidence ≥ minConfidence AND fit > 0 (hard
 * brand-safety gate). Returns { all, ranked } — `all` for transparency, `ranked`
 * for the proposal step.
 */
export function detectTrends(terms = TREND_TERMS, opts = {}) {
  const tau = opts.tau ?? 0.55;
  const minConfidence = opts.minConfidence ?? 0.4;

  const scored = terms.map((t) => {
    const signals = collectSignals(t, opts);
    const s = scoreTerm(t, signals, opts);
    return { ...s, category: t.category, tags: t.tags || [], slug: shortHash(slugify(t.term), 8) };
  });

  let kept = scored.filter((s) => s.score >= tau && s.confidence >= minConfidence && s.fit > 0);

  // Cluster near-duplicate motifs by slug so the queue isn't spammed with variants.
  const seen = new Set();
  kept = kept.filter((s) => {
    if (seen.has(s.slug)) return false;
    seen.add(s.slug);
    return true;
  });

  kept.sort((a, b) => b.score - a.score || b.confidence - a.confidence || b.subs.internalDemand - a.subs.internalDemand);
  return { all: scored, ranked: kept };
}
