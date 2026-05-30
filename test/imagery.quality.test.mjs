import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkMediaHard,
  mediaQualityScore,
  assessProductImagery,
  REQUIRED_SHOTS,
  QUALITY_MIN,
} from '../src/imagery/quality.mjs';
import { buildEnhancementPlan, FINISH_CHAIN } from '../src/imagery/enhance.mjs';
import { evaluateLaunchGates } from '../src/scoring/launch-gate.mjs';
import { createProduct } from '../src/model/product.mjs';
import { completeProductInput } from './helpers.mjs';

const premium = (over = {}) => ({
  role: over.role || 'hero',
  approved: true,
  metrics: {
    width: 3000,
    height: 3750,
    clippingPct: 0.5,
    colorProfile: 'srgb',
    sharpness: 0.85,
    noise: 0.1,
    brandSafe: true,
    colorAccuracy: 0.9,
    composition: 0.85,
    background: 0.9,
    brandLook: 0.85,
    tonalRange: 0.85,
    ...over.metrics,
  },
  ...over,
});

test('hard gate fails low-res, clipped, wrong-profile, unapproved media', () => {
  assert.equal(checkMediaHard(premium()).passed, true);
  assert.equal(checkMediaHard(premium({ metrics: { width: 800, height: 1000 } })).passed, false);
  assert.equal(checkMediaHard(premium({ metrics: { clippingPct: 9 } })).passed, false);
  assert.equal(checkMediaHard(premium({ metrics: { colorProfile: 'cmyk' } })).passed, false);
  assert.equal(checkMediaHard({ ...premium(), approved: false }).passed, false);
});

test('quality score rewards a premium asset and punishes a poor one', () => {
  assert.ok(mediaQualityScore(premium()) >= QUALITY_MIN);
  const poor = premium({ metrics: { width: 1100, height: 1100, sharpness: 0.2, noise: 0.9, colorAccuracy: 0.2, composition: 0.2, background: 0.2, brandLook: 0.2, tonalRange: 0.2 } });
  assert.ok(mediaQualityScore(poor) < QUALITY_MIN);
});

test('product imagery assessment reports missing required shots', () => {
  const partial = assessProductImagery([premium({ role: 'hero' }), premium({ role: 'front' })]);
  assert.equal(partial.complete, false);
  assert.deepEqual(partial.missingShots.sort(), ['detail', 'scale']);

  const full = assessProductImagery(REQUIRED_SHOTS.map((role) => premium({ role })));
  assert.equal(full.complete, true);
  assert.equal(full.missingShots.length, 0);
  assert.ok(full.averageScore >= QUALITY_MIN);
});

test('launch gate: measured media must pass the hard quality gate (stricter, never looser)', () => {
  // Backward-compatible: UNMEASURED approved media (no metrics) still passes via role coverage.
  const legacy = createProduct({
    ...completeProductInput(),
    media: [
      { role: 'hero', url: 'a', approved: true },
      { role: 'angle', url: 'b', approved: true },
      { role: 'detail', url: 'c', approved: true },
    ],
  });
  assert.equal(evaluateLaunchGates(legacy, { humanApproved: true }).passed, true);

  // But a MEASURED poor asset now fails mediaOk → gate blocks.
  const measuredBad = createProduct({
    ...completeProductInput(),
    media: [
      { role: 'hero', url: 'a', approved: true, metrics: { width: 600, height: 600, colorProfile: 'srgb', sharpness: 0.1, noise: 0.9, clippingPct: 20 } },
      { role: 'angle', url: 'b', approved: true },
      { role: 'detail', url: 'c', approved: true },
    ],
  });
  const res = evaluateLaunchGates(measuredBad, { humanApproved: true });
  assert.equal(res.passed, false);
  assert.ok(res.blockers.includes('Approved imagery meets minimum'));
});

test('enhancement plan exports the finishing chain per asset (no pixels processed)', () => {
  const candidate = { id: 'cand_x', title: 'Onyx Belt', payload: { product: { title: 'Onyx Belt' } }, imagery: [{ role: 'hero', url: 'u' }] };
  const plan = buildEnhancementPlan(candidate);
  assert.equal(plan.requests.length, 1);
  assert.equal(plan.requests[0].chain.length, FINISH_CHAIN.length);
  assert.ok(plan.requests[0].target.minLongEdge >= 3000);
});
