import { LAUNCH_GATES } from '../model/launch-gate.mjs';
import { productReadiness } from './product-readiness.mjs';
import { mediaScore, MEDIA_MIN } from './media-score.mjs';
import { checkMediaHard } from '../imagery/quality.mjs';
import { scoreCopy } from './copy-gate.mjs';
import { now } from '../lib/clock.mjs';

/** Pure predicates keyed by each gate's `check`. */
const CHECKS = {
  hasTitle: (p) => !!p.title,
  hasDescription: (p) => (p.description || '').length >= 40,
  hasVariant: (p) => (p.variants || []).length >= 1,
  pricedAboveFloor: (p) =>
    (p.pricing?.listMinor || 0) > 0 && (p.pricing?.listMinor || 0) >= (p.pricing?.floorMinor || 0),
  // Sin 1 (unit economics): never publish at a non-positive contribution margin.
  // Cost unknown → defer to the floor gate (keep it lenient); cost known → strict.
  positiveMargin: (p) => {
    const list = p.pricing?.listMinor || 0;
    const cost = p.pricing?.costMinor;
    if (cost == null) return list > 0;
    return list > cost;
  },
  hasSupplier: (p) => !!p.supplierId,
  // Role coverage (mediaScore) PLUS: any measured asset must pass the hard
  // quality gate. Unmeasured assets need only role coverage (backward-compatible),
  // so measuring imagery can only ever make the bar stricter, never looser.
  mediaOk: (p) => {
    if (mediaScore(p.media || []) < MEDIA_MIN) return false;
    const measured = (p.media || []).filter((m) => m.approved && m.metrics);
    return measured.every((m) => checkMediaHard(m).passed);
  },
  // On-voice + honest copy. Hard-fails (profanity / fabricated claim) always
  // block; the score bar applies only once enough copy exists to judge fairly
  // (so minimal legacy fixtures aren't penalized — stricter only with real copy).
  copyOnVoice: (p) => {
    const res = scoreCopy({
      title: p.title,
      subtitle: p.subtitle,
      description: p.description,
      bulletBenefits: p.bulletBenefits,
      priceMinor: p.pricing?.listMinor,
    });
    if (res.hardFails.length > 0) return false;
    const hasRichCopy = (p.bulletBenefits || []).length >= 3 && (p.description || '').length >= 60;
    return hasRichCopy ? res.score >= 70 : true;
  },
  readinessOk: (p) => productReadiness(p) >= 70,
  // The human gate, encoded as a required launch gate.
  humanApproved: (p, ctx) =>
    ctx?.humanApproved === true ||
    p.lifecycle === 'approved' ||
    p.lifecycle === 'published' ||
    !!p.approvedAt,
};

/**
 * Evaluate all launch gates against a product. Returns {passed, results, score,
 * blockers, evaluatedAt}. `passed` is true only when every REQUIRED gate passes.
 * This is the publish guard.
 */
export function evaluateLaunchGates(subject = {}, ctx = {}) {
  const results = LAUNCH_GATES.map((g) => {
    const fn = CHECKS[g.check];
    const passed = fn ? !!fn(subject, ctx) : false;
    return { gateId: g.id, passed, detail: passed ? undefined : `${g.label} not met` };
  });
  const byId = new Map(results.map((r) => [r.gateId, r]));
  const blockers = LAUNCH_GATES.filter((g) => g.required && !byId.get(g.id).passed).map((g) => g.label);
  const totalWeight = LAUNCH_GATES.reduce((s, g) => s + g.weight, 0);
  const earned = LAUNCH_GATES.reduce((s, g) => s + (byId.get(g.id).passed ? g.weight : 0), 0);
  return {
    passed: blockers.length === 0,
    results,
    score: Math.round((earned / totalWeight) * 100),
    blockers,
    evaluatedAt: now(),
  };
}
