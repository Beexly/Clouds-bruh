import { test } from 'node:test';
import assert from 'node:assert/strict';
import { productReadiness } from '../src/scoring/product-readiness.mjs';
import { createProduct } from '../src/model/product.mjs';
import { completeProductInput } from './helpers.mjs';

test('readiness stays within 0..100', () => {
  assert.ok(productReadiness({}) >= 0);
  assert.ok(productReadiness(createProduct(completeProductInput())) <= 100);
});

test('readiness is monotonic — adding completeness only raises it', () => {
  const bare = productReadiness(createProduct({ title: 'X', description: 'x'.repeat(50), category: 'tops' }));
  const full = productReadiness(createProduct(completeProductInput()));
  assert.ok(full > bare);
});
