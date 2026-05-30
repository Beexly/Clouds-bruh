import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateLaunchGates } from '../src/scoring/launch-gate.mjs';
import { createProduct } from '../src/model/product.mjs';
import { completeProductInput } from './helpers.mjs';

test('incomplete product fails with named blockers', () => {
  const res = evaluateLaunchGates(createProduct({ title: 'X', description: 'short', category: 'tops' }));
  assert.equal(res.passed, false);
  assert.ok(res.blockers.length > 0);
});

test('complete product with human approval passes all gates', () => {
  const res = evaluateLaunchGates(createProduct(completeProductInput()), { humanApproved: true });
  assert.equal(res.passed, true);
  assert.equal(res.blockers.length, 0);
});

test('a substantively complete product still blocks without human approval', () => {
  const res = evaluateLaunchGates(createProduct(completeProductInput()), { humanApproved: false });
  assert.equal(res.passed, false);
  assert.ok(res.blockers.includes('Human approved'));
});
