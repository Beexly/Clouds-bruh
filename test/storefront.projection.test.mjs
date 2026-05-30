import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectStorefront } from '../src/storefront/projection.mjs';
import { createProduct } from '../src/model/product.mjs';
import { mulberry32 } from '../src/lib/rng.mjs';

const base = (title, over) => createProduct({ title, description: 'x'.repeat(50), category: 'tops', ...over });

test('only published + visible + in-stock products are public', () => {
  const products = [
    base('Live', { lifecycle: 'published', visibility: 'visible', stockState: 'in-stock' }),
    base('Draft', {}),
    base('Hidden', { lifecycle: 'published', visibility: 'hidden', stockState: 'in-stock' }),
    base('OOS', { lifecycle: 'published', visibility: 'visible', stockState: 'out-of-stock' }),
  ];
  const proj = projectStorefront({ products });
  assert.equal(proj.count, 1);
  assert.equal(proj.products[0].title, 'Live');
});

test('fuzz: no non-live product ever leaks', () => {
  const rng = mulberry32(42);
  const lifecycles = ['draft', 'in_review', 'approved', 'published', 'archived', 'rejected'];
  const vis = ['hidden', 'unlisted', 'visible'];
  const stock = ['out-of-stock', 'low-stock', 'in-stock', 'preorder'];
  const products = [];
  for (let i = 0; i < 300; i++) {
    products.push(
      base('P' + i, {
        lifecycle: lifecycles[Math.floor(rng() * lifecycles.length)],
        visibility: vis[Math.floor(rng() * vis.length)],
        stockState: stock[Math.floor(rng() * stock.length)],
      })
    );
  }
  const expected = products.filter(
    (p) => p.lifecycle === 'published' && p.visibility === 'visible' && p.stockState === 'in-stock'
  ).length;
  assert.equal(projectStorefront({ products }).count, expected);
});

test('public output strips internal fields (cost, supplier, scores)', () => {
  const p = base('Live', { lifecycle: 'published', visibility: 'visible', stockState: 'in-stock', supplierId: 'sup_x' });
  const pub = projectStorefront({ products: [p] }).products[0];
  assert.equal(pub.supplierId, undefined);
  assert.equal(pub.scores, undefined);
  assert.equal(pub.pricing, undefined);
});
