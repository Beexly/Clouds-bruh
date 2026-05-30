import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tempPaths } from './helpers.mjs';
import { seed } from '../src/cli/seed.mjs';
import { runAgent } from '../src/agents/runtime.mjs';
import { loadQueue, getCandidate } from '../src/queue/store.mjs';
import { applyGithubDecision } from '../src/queue/decisions.mjs';
import { human, agent } from '../src/lib/actor.mjs';

async function firstProductCandidate(paths) {
  await seed(paths);
  await runAgent('sourcing', paths, { count: 3, seed: 9 });
  return (await loadQueue(paths)).find((c) => c.kind === 'product');
}

test('an approve label routes through the human gate and materializes a draft', async () => {
  const paths = await tempPaths();
  const cand = await firstProductCandidate(paths);
  const res = await applyGithubDecision(paths, { candidateId: cand.id, labels: ['approve'] }, human('operator'));
  assert.equal(res.applied, true);
  assert.equal(res.action, 'approved');
  const after = await getCandidate(paths, cand.id);
  assert.equal(after.status, 'approved');
});

test('a reject label rejects the candidate', async () => {
  const paths = await tempPaths();
  const cand = await firstProductCandidate(paths);
  const res = await applyGithubDecision(paths, { candidateId: cand.id, labels: ['reject'] }, human('operator'));
  assert.equal(res.action, 'rejected');
  assert.equal((await getCandidate(paths, cand.id)).status, 'rejected');
});

test('conflicting approve+reject labels never approve (reject wins)', async () => {
  const paths = await tempPaths();
  const cand = await firstProductCandidate(paths);
  const res = await applyGithubDecision(paths, { candidateId: cand.id, labels: ['approve', 'reject'] }, human('operator'));
  assert.equal(res.action, 'rejected');
});

test('no decision label is a no-op', async () => {
  const paths = await tempPaths();
  const cand = await firstProductCandidate(paths);
  const res = await applyGithubDecision(paths, { candidateId: cand.id, labels: ['status:queued'] }, human('operator'));
  assert.equal(res.applied, false);
});

test('the gate holds even via GitHub: an agent actor cannot approve', async () => {
  const paths = await tempPaths();
  const cand = await firstProductCandidate(paths);
  await assert.rejects(
    () => applyGithubDecision(paths, { candidateId: cand.id, labels: ['approve'] }, agent('sourcing')),
    /transition/i
  );
  assert.equal((await getCandidate(paths, cand.id)).status, 'queued'); // unchanged
});

test('applying the same approve twice is idempotent', async () => {
  const paths = await tempPaths();
  const cand = await firstProductCandidate(paths);
  await applyGithubDecision(paths, { candidateId: cand.id, labels: ['approve'] }, human('operator'));
  const second = await applyGithubDecision(paths, { candidateId: cand.id, labels: ['approve'] }, human('operator'));
  assert.equal(second.applied, false);
  assert.equal(second.reason, 'already approved');
});
