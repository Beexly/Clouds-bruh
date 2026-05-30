import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ewma, velocity, acceleration, robustZ } from '../src/trends/features.mjs';
import { scoreTerm, brandFit, trajectory } from '../src/trends/score.mjs';
import { detectTrends } from '../src/trends/detect.mjs';
import { proposeTrends } from '../src/trends/propose.mjs';
import { collectSignals } from '../src/trends/signals.mjs';
import { loadQueue } from '../src/queue/store.mjs';
import { tempPaths } from './helpers.mjs';

test('feature math: ewma smooths, velocity sign tracks direction, z flags spikes', () => {
  assert.ok(ewma([10, 10, 10]) > 9 && ewma([10, 10, 10]) < 11);
  assert.ok(velocity([10, 20, 40]) > 0, 'rising series has positive velocity');
  assert.ok(velocity([40, 20, 10]) < 0, 'falling series has negative velocity');
  assert.ok(acceleration([1, 2, 4, 8]) > 0, 'accelerating series has positive acceleration');
  assert.ok(robustZ([10, 10, 10, 10, 90]) > 3, 'a spike yields a high robust z-score');
});

test('brand fit: off-brand category scores 0; on-brand affinity scores high', () => {
  assert.equal(brandFit('fidget spinner gadget', { category: 'gadgets' }), 0);
  assert.equal(brandFit('cheap replica chain', { category: 'jewelry' }), 0); // deny keywords
  assert.ok(brandFit('oxblood leather harness', { category: 'accessory', tags: ['leather', 'gothic'] }) >= 0.8);
});

test('trajectory labels emerging vs declining', () => {
  assert.equal(trajectory([5, 8, 14, 26, 50]), 'emerging');
  assert.equal(trajectory([80, 60, 40, 20, 5]), 'declining');
});

test('an emerging on-brand term outranks a declining one', () => {
  const { ranked, all } = detectTrends();
  assert.ok(ranked.length >= 1);
  assert.equal(ranked[0].fit > 0, true);
  assert.equal(ranked[0].trajectory, 'emerging');
  // declining term should be filtered out of ranked
  const declining = all.find((t) => t.term === 'distressed cargo pants');
  assert.ok(!ranked.some((r) => r.term === declining.term), 'declining term not ranked');
});

test('off-brand term never reaches the ranked list (fit gate)', () => {
  const { ranked } = detectTrends();
  assert.ok(!ranked.some((r) => r.term.includes('fidget')), 'off-brand filtered by fit=0');
});

test('thin-data term is filtered by the confidence gate', () => {
  const term = { term: 'oxblood leather thin', profile: 'emerging', category: 'accessory', tags: ['leather'], points: 2 };
  const signals = collectSignals(term, { seed: 1 });
  const s = scoreTerm(term, signals, {});
  assert.ok(s.confidence < 0.4, 'too few data points → low confidence');
  const { ranked } = detectTrends([term]);
  assert.equal(ranked.length, 0, 'filtered out despite emerging shape');
});

test('proposeTrends enqueues TREND candidates as agent actor, never approved', async () => {
  const paths = await tempPaths();
  const { producedCandidateIds } = await proposeTrends(paths, { count: 5 });
  assert.ok(producedCandidateIds.length >= 1);
  const q = await loadQueue(paths);
  const trend = q.find((c) => c.kind === 'trend');
  assert.ok(trend, 'a trend candidate exists');
  assert.equal(trend.governance.autoApprovable, false);
  assert.notEqual(trend.status, 'approved');
  assert.notEqual(trend.status, 'published');
  assert.ok(trend.payload.trend.term, 'carries the trend motif');
  assert.ok(trend.payload.trend.components, 'carries explainable component breakdown');
});

test('detection is deterministic for a fixed seed', () => {
  const a = detectTrends(undefined, { seed: 42 }).ranked.map((r) => r.term);
  const b = detectTrends(undefined, { seed: 42 }).ranked.map((r) => r.term);
  assert.deepEqual(a, b);
});
