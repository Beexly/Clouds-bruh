import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProduct } from '../src/model/product.mjs';

test('product is born draft / hidden / out-of-stock', () => {
  const p = createProduct({ title: 'X', description: 'a sufficiently long description here', category: 'tops' });
  assert.equal(p.lifecycle, 'draft');
  assert.equal(p.visibility, 'hidden');
  assert.equal(p.stockState, 'out-of-stock');
});

test('invalid enum throws', () => {
  assert.throws(() => createProduct({ title: 'X', description: 'desc', category: 'tops', lifecycle: 'bogus' }));
});

test('slug, SKU and id are deterministic', () => {
  const input = { title: 'XIV Hoodie', description: 'x'.repeat(50), category: 'hoodie', variants: [{ color: 'Onyx', size: 'M' }] };
  const a = createProduct(input);
  const b = createProduct(input);
  assert.equal(a.slug, 'xiv-hoodie');
  assert.equal(a.variants[0].sku, b.variants[0].sku);
  assert.equal(a.id, b.id);
});
