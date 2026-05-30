import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tempPaths } from './helpers.mjs';
import { saveCatalog } from '../src/catalog/store.mjs';
import { createProduct } from '../src/model/product.mjs';
import { scanForRestock, proposeRestocks } from '../src/restock/loop.mjs';
import { loadQueue } from '../src/queue/store.mjs';

test('low inventory yields a signal and a restock candidate', async () => {
  const paths = await tempPaths();
  const p = createProduct({
    title: 'Live',
    description: 'x'.repeat(50),
    category: 'tops',
    lifecycle: 'published',
    visibility: 'visible',
    stockState: 'in-stock',
    variants: [{ color: 'Onyx', size: 'M', inventory: { onHand: 2, reserved: 0, restockThreshold: 6 } }],
  });
  await saveCatalog(paths, { products: [p] });

  const signals = await scanForRestock(paths);
  assert.equal(signals.length, 1);
  assert.equal(signals[0].severity, 'critical'); // 2 <= ceil(6 * 0.5)

  const produced = await proposeRestocks(paths, signals);
  assert.equal(produced.length, 1);
  const q = await loadQueue(paths);
  assert.ok(q.some((c) => c.kind === 'restock'));
});
