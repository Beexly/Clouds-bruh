import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCandidate } from '../src/model/review-queue-item.mjs';

test('candidate defaults to proposed and is never auto-approvable', () => {
  const c = createCandidate({ title: 'Test', payload: { a: 1 } });
  assert.equal(c.status, 'proposed');
  assert.equal(c.governance.autoApprovable, false);
  assert.ok(c.idempotencyKey);
});

test('tampering with autoApprovable is overridden to false', () => {
  const c = createCandidate({ title: 'Test', governance: { autoApprovable: true } });
  assert.equal(c.governance.autoApprovable, false);
});

test('invalid kind throws', () => {
  assert.throws(() => createCandidate({ title: 'Test', kind: 'bogus' }));
});

test('identical payloads produce identical idempotency keys', () => {
  const a = createCandidate({ title: 'A', payload: { x: 1 } });
  const b = createCandidate({ title: 'A', payload: { x: 1 } });
  assert.equal(a.idempotencyKey, b.idempotencyKey);
});
