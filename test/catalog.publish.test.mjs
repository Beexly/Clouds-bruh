import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tempPaths, completeProductInput } from './helpers.mjs';
import { upsertProduct } from '../src/catalog/store.mjs';
import { publishProduct } from '../src/catalog/publish.mjs';
import { createProduct } from '../src/model/product.mjs';
import { now } from '../src/lib/clock.mjs';
import { human } from '../src/lib/actor.mjs';

test('publish is blocked until gates pass', async () => {
  const paths = await tempPaths();
  const incomplete = createProduct({ title: 'X', description: 'short', category: 'tops' });
  await upsertProduct(paths, incomplete);
  await assert.rejects(() => publishProduct(paths, incomplete.id, human(), { humanApproved: true }));
});

test('publish flips an approved, complete product live', async () => {
  const paths = await tempPaths();
  const full = createProduct({ ...completeProductInput(), approvedAt: now() });
  await upsertProduct(paths, full);
  const pub = await publishProduct(paths, full.id, human(), { humanApproved: true, stock: 10 });
  assert.equal(pub.lifecycle, 'published');
  assert.equal(pub.visibility, 'visible');
  assert.equal(pub.stockState, 'in-stock');
});
