import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tempPaths } from './helpers.mjs';
import { seed } from '../src/cli/seed.mjs';
import { runAgent } from '../src/agents/runtime.mjs';
import { loadQueue } from '../src/queue/store.mjs';
import { approveCandidate, publishCandidate } from '../src/queue/review-actions.mjs';
import { loadCatalog } from '../src/catalog/store.mjs';
import { createCheckout, variantAvailable } from '../src/orders/checkout.mjs';
import { loadOrders } from '../src/orders/store.mjs';
import { human } from '../src/lib/actor.mjs';

/** Seed + source + approve/publish one product so there is something live to buy. */
async function withLiveProduct(stock = 5) {
  const paths = await tempPaths();
  await seed(paths);
  await runAgent('sourcing', paths, { count: 1, seed: 4 });
  const cand = (await loadQueue(paths)).find((c) => c.kind === 'product');
  const op = human('operator');
  await approveCandidate(paths, cand.id, op);
  const { product } = await publishCandidate(paths, cand.id, op, { stock });
  return { paths, product };
}

test('checkout creates an order, reserves inventory, and stays payment-not-live', async () => {
  const { paths, product } = await withLiveProduct(5);
  const v = product.variants[0];
  const order = await createCheckout(paths, [{ productId: product.id, variantId: v.id, qty: 2 }], { email: 'buyer@example.com' });

  assert.equal(order.items[0].qty, 2);
  assert.equal(order.totals.grandMinor, order.items[0].lineTotalMinor);
  assert.equal(order.payment.live, false);
  assert.ok(order.number.startsWith('ECL-'));

  const catalog = await loadCatalog(paths);
  const reserved = catalog.products.find((p) => p.id === product.id).variants.find((x) => x.id === v.id);
  assert.equal(reserved.inventory.reserved, 2);

  const orders = await loadOrders(paths);
  assert.equal(orders.length, 1);
});

test('checkout cannot oversell available stock', async () => {
  const { paths, product } = await withLiveProduct(3);
  const v = product.variants[0];
  await assert.rejects(
    () => createCheckout(paths, [{ productId: product.id, variantId: v.id, qty: 99 }], { email: 'b@example.com' }),
    /Insufficient stock/
  );
});

test('a draft (non-live) product cannot be purchased', async () => {
  const paths = await tempPaths();
  const seeded = await seed(paths);
  const draft = seeded.products[0]; // House capsule items are seeded draft/hidden
  const v = draft.variants[0];
  await assert.rejects(
    () => createCheckout(paths, [{ productId: draft.id, variantId: v.id, qty: 1 }], { email: 'b@example.com' }),
    /not available/
  );
});

test('checkout requires an email and a non-empty cart', async () => {
  const { paths, product } = await withLiveProduct();
  await assert.rejects(() => createCheckout(paths, [], { email: 'b@example.com' }), /empty/i);
  await assert.rejects(
    () => createCheckout(paths, [{ productId: product.id, variantId: product.variants[0].id, qty: 1 }], {}),
    /email/i
  );
});

test('reserving all stock drops the product off the storefront (default-deny holds)', async () => {
  const { paths, product } = await withLiveProduct(2);
  const single = product.variants.length === 1;
  // Buy out the only variant if there is one; otherwise buy each variant's stock.
  const cart = product.variants.map((v) => ({ productId: product.id, variantId: v.id, qty: 2 }));
  await createCheckout(paths, cart, { email: 'b@example.com' });
  const catalog = await loadCatalog(paths);
  const after = catalog.products.find((p) => p.id === product.id);
  const anyLeft = after.variants.some((v) => variantAvailable(v) > 0);
  assert.equal(anyLeft, false);
  assert.equal(after.stockState, 'out-of-stock');
});
