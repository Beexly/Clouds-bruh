import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tempPaths, completeProductInput } from './helpers.mjs';
import { saveCatalog } from '../src/catalog/store.mjs';
import { createProduct } from '../src/model/product.mjs';
import { buildStripeSyncPlan, productCreateRequest } from '../src/orders/stripe-sync.mjs';

test('only published products enter the Stripe sync plan', async () => {
  const paths = await tempPaths();
  const live = createProduct({
    ...completeProductInput(),
    lifecycle: 'published',
    visibility: 'visible',
    stockState: 'in-stock',
  });
  const draft = createProduct(completeProductInput({ title: 'Draft One' }));
  await saveCatalog(paths, { products: [live, draft] });

  const plan = await buildStripeSyncPlan(paths);
  assert.equal(plan.mode, 'test'); // exporter is never live
  assert.equal(plan.productCount, 1);
  assert.equal(plan.requests.length, 2); // product + price for the one published item
});

test('request amounts are integer minor units and idempotency-keyed', async () => {
  const p = createProduct({ ...completeProductInput(), pricing: { listMinor: 9800, floorMinor: 5000, currency: 'USD' } });
  const req = productCreateRequest(p);
  assert.ok(req.idempotencyKey.startsWith('prod-'));
  assert.equal(req.params.metadata.eclipse_product_id, p.id);
});
