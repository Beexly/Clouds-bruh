import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tempPaths } from './helpers.mjs';
import { seed } from '../src/cli/seed.mjs';
import { runAgent } from '../src/agents/runtime.mjs';
import { loadQueue } from '../src/queue/store.mjs';
import { approveCandidate, publishCandidate } from '../src/queue/review-actions.mjs';
import { createCheckout } from '../src/orders/checkout.mjs';
import { ordersView } from '../src/ops/orders-view.mjs';
import { human } from '../src/lib/actor.mjs';

test('orders view summarizes counts, open orders, and recent list', async () => {
  const paths = await tempPaths();
  await seed(paths);
  await runAgent('sourcing', paths, { count: 1, seed: 4 });
  const cand = (await loadQueue(paths)).find((c) => c.kind === 'product');
  const op = human('operator');
  await approveCandidate(paths, cand.id, op);
  const { product } = await publishCandidate(paths, cand.id, op, { stock: 10 });

  const empty = await ordersView(paths);
  assert.equal(empty.total, 0);
  assert.equal(empty.openCount, 0);

  await createCheckout(paths, [{ productId: product.id, variantId: product.variants[0].id, qty: 1 }], { email: 'a@example.com' });
  const v = await ordersView(paths);
  assert.equal(v.total, 1);
  assert.equal(v.recent.length, 1);
  assert.equal(v.recent[0].email, 'a@example.com');
  assert.equal(v.recent[0].paymentLive, false); // never live in v1
  assert.ok(v.byStatus.intake >= 1);
});
