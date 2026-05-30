import { evaluateLaunchGates } from '../scoring/launch-gate.mjs';
import { scoreCopy } from '../scoring/copy-gate.mjs';
import { assessProductImagery, QUALITY_MIN } from '../imagery/quality.mjs';
import { brandFit } from '../trends/score.mjs';
import { now } from '../lib/clock.mjs';

/**
 * THE ECLIPSE STANDARD (R6, from docs/research/12).
 *
 * One rubric, one report object, applied to every artifact the house emits.
 * It consolidates the gates that already exist (launch gates, imagery hard+soft
 * quality, copy scorer, trend brand-fit) into a single publish guard — so
 * "quality stays consistent" is a property of the system, not a hope.
 *
 * The report shape is the same for every subject and is the data substrate for
 * the transparency features (Receipts Mode, the Glass Atelier, agent scorecards):
 *
 *   {
 *     subjectType, passed, score,           // 0–100 weighted
 *     hardGates:  [{ id, passed, detail }], // fail-closed; any failing → passed:false
 *     softDimensions: [{ id, score, weight }],
 *     blockers:   [string],                 // human-readable
 *     evidence:   {...},                    // why — for explainability
 *     evaluatedAt
 *   }
 *
 * Non-negotiable: for a `product` subject, `human_approved` remains a required
 * hard gate — the Standard can score, block, and explain, but only a human can
 * pass a product to live. The Standard never weakens the prime directive.
 */

export const SUBJECT_TYPES = Object.freeze(['product', 'copy', 'imagery', 'trend']);

function report(subjectType, { score, hardGates, softDimensions = [], evidence = {} }) {
  const failedHard = hardGates.filter((g) => !g.passed);
  const blockers = failedHard.map((g) => g.detail || g.id);
  const passed = failedHard.length === 0 && score >= 75;
  return {
    standard: 'eclipse-standard/v1',
    subjectType,
    passed,
    score: Math.max(0, Math.min(100, Math.round(score))),
    hardGates,
    softDimensions,
    blockers,
    evidence,
    evaluatedAt: now(),
  };
}

function productReport(product, ctx) {
  const gate = evaluateLaunchGates(product, ctx);
  // Each launch gate is a hard gate in the Standard; the launch score is the score.
  const hardGates = gate.results.map((r) => ({
    id: r.gateId,
    passed: r.passed,
    detail: r.passed ? undefined : r.detail,
  }));
  return report('product', {
    score: gate.score,
    hardGates,
    softDimensions: [{ id: 'launch_readiness', score: gate.score, weight: 1 }],
    evidence: { blockers: gate.blockers },
  });
}

function copyReport(copy) {
  const res = scoreCopy(copy);
  const hardGates = [
    { id: 'no_profanity', passed: !res.hardFails.includes('profanity'), detail: 'profanity present' },
    {
      id: 'honest',
      passed: !res.hardFails.includes('dishonest/fabricated claim'),
      detail: 'fabricated/dishonest claim present',
    },
  ];
  return report('copy', {
    score: res.score,
    hardGates,
    softDimensions: [{ id: 'voice_and_clarity', score: res.score, weight: 1 }],
    evidence: { band: res.band, violations: res.violations, flesch: res.flesch },
  });
}

function imageryReport(media) {
  const a = assessProductImagery(media);
  const hardGates = [
    { id: 'required_shots', passed: a.missingShots.length === 0, detail: `missing shots: ${a.missingShots.join(', ')}` },
    { id: 'hard_quality', passed: a.hardFailures.length === 0, detail: 'a shot fails the hard quality gate' },
    { id: 'human_approved_media', passed: a.shotCount > 0, detail: 'no human-approved imagery' },
  ];
  return report('imagery', {
    score: a.averageScore,
    hardGates,
    softDimensions: [{ id: 'image_quality', score: a.averageScore, weight: 1 }],
    evidence: { missingShots: a.missingShots, hardFailures: a.hardFailures, shotCount: a.shotCount, qualityMin: QUALITY_MIN },
  });
}

function trendReport(term) {
  const fit = brandFit(term.term || term, { tags: term.tags, category: term.category });
  const hardGates = [{ id: 'brand_fit', passed: fit > 0, detail: 'off-brand or unsafe motif' }];
  return report('trend', {
    score: Math.round(fit * 100),
    hardGates,
    softDimensions: [{ id: 'brand_fit', score: Math.round(fit * 100), weight: 1 }],
    evidence: { fit },
  });
}

/**
 * Evaluate any subject against The Eclipse Standard.
 * @param {('product'|'copy'|'imagery'|'trend')} subjectType
 * @param {*} subject  product object | copy object | media[] | trend term object
 * @param {*} ctx      e.g. { humanApproved } for product
 */
export function evaluateStandard(subjectType, subject, ctx = {}) {
  switch (subjectType) {
    case 'product':
      return productReport(subject, ctx);
    case 'copy':
      return copyReport(subject);
    case 'imagery':
      return imageryReport(subject || []);
    case 'trend':
      return trendReport(subject);
    default:
      throw new Error('Unknown Eclipse Standard subject type: ' + subjectType);
  }
}

/** One-line human summary of a Standard report (for ops/logs/transparency). */
export function summarize(r) {
  const verdict = r.passed ? 'PASS' : 'BLOCKED';
  const why = r.blockers.length ? ` — ${r.blockers.join('; ')}` : '';
  return `[Eclipse Standard] ${r.subjectType} ${verdict} ${r.score}/100${why}`;
}
