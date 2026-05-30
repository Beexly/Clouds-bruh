import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sizeChartFrom, createFitProfile, FIT } from '../src/fit/model.mjs';
import { recommendSize } from '../src/fit/recommend.mjs';
import { tempPaths } from './helpers.mjs';
import { saveOrders } from '../src/orders/store.mjs';
import { createOrder } from '../src/model/order.mjs';
import { computeReturnsIntel, proposeFitFlips, supplierReturnPenalty } from '../src/fit/returns-intel.mjs';

// Garment chest measurements in mm: S=960, M=1020, L=1080.
const chart = sizeChartFrom({ S: { chest: 960 }, M: { chest: 1020 }, L: { chest: 1080 } });

test('measurement path recommends the in-ease size', () => {
  // body chest 950mm: only M is in the 40–120 ease band (S=10 out, M=70 in, L=130 out).
  const rec = recommendSize({ sizeChart: chart, body: { chestMm: 950 } });
  assert.equal(rec.sizeLabel, 'M');
  assert.ok(['high', 'med'].includes(rec.confidence));
});

test('fit profile shifts the recommendation (runs small → size up)', () => {
  const base = recommendSize({ sizeChart: chart, body: { chestMm: 950 } }).sizeLabel;
  const up = recommendSize({ sizeChart: chart, body: { chestMm: 950 }, fitProfile: createFitProfile({ fit: FIT.SMALL }) });
  assert.equal(base, 'M');
  assert.equal(up.sizeLabel, 'L'); // runs small → one size up from M
  assert.match(up.rationale, /runs small/);
});

test('history fallback uses last kept size and return skew', () => {
  const rec = recommendSize({
    sizeChart: chart,
    history: { lastKeptSize: 'M', returnedSmall: 2, returnedLarge: 0 },
  });
  assert.equal(rec.sizeLabel, 'L'); // returned-too-small → sized up
});

test('low-confidence recommendation offers an honest alternative', () => {
  const rec = recommendSize({ sizeChart: chart, fitProfile: createFitProfile({ fit: FIT.TRUE, modelWears: { sizeLabel: 'M', heightMm: 1850 } }) });
  assert.ok(rec.sizeLabel);
  assert.equal(rec.confidence, 'low');
  assert.ok(rec.alternative, 'between-sizes alternative surfaced honestly');
});

test('returns intelligence learns fit + flags suppliers from real returns', async () => {
  const paths = await tempPaths();
  const mk = (reason) =>
    createOrder({
      items: [{ productId: 'prod_x', variantId: 'v', sku: 'S', unitPriceMinor: 1000, qty: 1 }],
      customer: { email: 'b@example.com' },
      status: 'returned',
      returns: [{ reason, productId: 'prod_x', supplierId: 'sup_1', qty: 1 }],
    });
  // 6 units, 5 too-small returns → runs small, high size-return rate.
  const orders = [];
  for (let i = 0; i < 5; i++) orders.push(mk('too_small'));
  orders.push(createOrder({ items: [{ productId: 'prod_x', variantId: 'v', sku: 'S', unitPriceMinor: 1000, qty: 1 }], customer: { email: 'c@example.com' }, status: 'delivered' }));
  await saveOrders(paths, orders);

  const intel = await computeReturnsIntel(paths);
  const prod = intel.products.find((p) => p.productId === 'prod_x');
  assert.ok(prod.sizeReturnRate > 0.5);
  assert.equal(prod.skew, 'runs_small');

  const flips = proposeFitFlips(intel, { threshold: 0.15, minUnits: 5 });
  assert.equal(flips.length, 1);
  assert.equal(flips[0].fit, FIT.SMALL);
  assert.equal(flips[0].basis, 'returns_signal');

  assert.ok(supplierReturnPenalty(intel, 'sup_1') > 0, 'supplier penalized for fit returns');
});
