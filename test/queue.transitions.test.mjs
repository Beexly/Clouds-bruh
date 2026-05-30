import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyTransition, allowed } from '../src/queue/transitions.mjs';
import { human, agent } from '../src/lib/actor.mjs';

test('an agent can never reach approved / publishing / published', () => {
  assert.equal(allowed('in_review', 'approved', agent('sourcing')), false);
  assert.equal(allowed('approved', 'publishing', agent('x')), false);
  assert.equal(allowed('publishing', 'published', agent('x')), false);
  assert.equal(allowed('in_review', 'approved', human()), true);
});

test('approval requires a passed gate', () => {
  assert.throws(() => applyTransition({ status: 'in_review', gate: { passed: false }, history: [] }, 'approved', human()));
  assert.doesNotThrow(() =>
    applyTransition({ status: 'in_review', gate: { passed: true }, history: [] }, 'approved', human(), { note: 'ok' })
  );
});

test('illegal transitions throw', () => {
  assert.throws(() => applyTransition({ status: 'queued', gate: { passed: true }, history: [] }, 'published', human()));
});

test('reject needs a note; needs_changes needs changesRequested', () => {
  const c = { status: 'in_review', gate: { passed: true }, history: [] };
  assert.throws(() => applyTransition(c, 'rejected', human()));
  assert.throws(() => applyTransition(c, 'needs_changes', human()));
  assert.doesNotThrow(() => applyTransition(c, 'rejected', human(), { note: 'not on brand' }));
  assert.doesNotThrow(() => applyTransition(c, 'needs_changes', human(), { changesRequested: ['Rewrite copy'] }));
});
