import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tempPaths } from './helpers.mjs';
import { seed } from '../src/cli/seed.mjs';
import { runAgent } from '../src/agents/runtime.mjs';
import { loadQueue } from '../src/queue/store.mjs';
import { approveCandidate, publishCandidate, rejectCandidate } from '../src/queue/review-actions.mjs';
import { createCheckout } from '../src/orders/checkout.mjs';
import { advanceOrder } from '../src/orders/lifecycle.mjs';
import { upsertOrder } from '../src/orders/store.mjs';
import { analytics } from '../src/ops/analytics.mjs';
import { OrderStatus } from '../src/model/enums.mjs';
import { human } from '../src/lib/actor.mjs';

test('analytics reflects funnel, approval rate, and realized revenue', async () => {
  const paths = await tempPaths();
  await seed(paths);
  await runAgent('sourcing', paths, { count: 3, seed: 8 });
  const cands = (await loadQueue(paths)).filter((c) => c.kind === 'product');
  const op = human('operator');

  // Approve+publish one, reject one — leaves a measurable approval rate.
  await approveCandidate(paths, cands[0].id, op);
  const { product } = await publishCandidate(paths, cands[0].id, op, { stock: 10 });
  await rejectCandidate(paths, cands[1].id, op, 'off-brand');

  const order = await createCheckout(paths, [{ productId: product.id, variantId: product.variants[0].id, qty: 2 }], { email: 'x@example.com' });
  // Revenue is recognized once an order leaves intake — move it to paid.
  let o = advanceOrder(order, OrderStatus.PAYMENT_PENDING, human());
  o = advanceOrder(o, OrderStatus.PAID, human());
  await upsertOrder(paths, o);

  const a = await analytics(paths);
  assert.ok(a.catalog.live >= 1);
  assert.equal(a.queue.funnel.sourced, cands.length);
  assert.ok(a.queue.approvalRatePct > 0 && a.queue.approvalRatePct < 100, 'mixed decisions give a partial rate');
  assert.ok(a.orders.revenueMinor > 0, 'realized order contributes revenue');
  assert.equal(a.orders.unitsSold, 2);
  assert.ok(a.orders.topProducts.length >= 1);
  assert.ok(a.activity.totalEvents > 0);
});
