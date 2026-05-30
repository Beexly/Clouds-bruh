import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enqueueCandidate, replayQueue, getCandidate, saveCandidate } from '../src/queue/store.mjs';
import { createCandidate } from '../src/model/review-queue-item.mjs';
import { tempPaths } from './helpers.mjs';

test('append + replay keeps latest; duplicate idempotency key is a no-op', async () => {
  const paths = await tempPaths();
  const r1 = await enqueueCandidate(paths, createCandidate({ title: 'A', payload: { x: 1 } }));
  assert.equal(r1.created, true);
  assert.equal(r1.candidate.status, 'queued'); // system advanced proposed → queued

  const r2 = await enqueueCandidate(paths, createCandidate({ title: 'A', payload: { x: 1 } }));
  assert.equal(r2.created, false);

  const { byId } = await replayQueue(paths);
  assert.equal(byId.size, 1);
});

test('saveCandidate snapshot updates the projection', async () => {
  const paths = await tempPaths();
  const { candidate } = await enqueueCandidate(paths, createCandidate({ title: 'B', payload: { y: 2 } }));
  await saveCandidate(paths, { ...candidate, status: 'in_review' });
  const got = await getCandidate(paths, candidate.id);
  assert.equal(got.status, 'in_review');
});
