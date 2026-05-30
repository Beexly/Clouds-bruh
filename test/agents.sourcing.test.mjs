import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tempPaths } from './helpers.mjs';
import { seed } from '../src/cli/seed.mjs';
import { runAgent } from '../src/agents/runtime.mjs';
import { loadQueue } from '../src/queue/store.mjs';

test('sourcing produces a valid, fully-formed queued candidate', async () => {
  const paths = await tempPaths();
  await seed(paths);
  const { result } = await runAgent('sourcing', paths, { count: 2, seed: 5 });
  assert.ok(result.producedCandidateIds.length >= 1);

  const c = (await loadQueue(paths)).find((x) => x.kind === 'product');
  assert.equal(c.status, 'queued');
  assert.ok(c.sourceLinks.length >= 1, 'has source links for the reviewer');
  assert.ok(c.imagery.length >= 1, 'has imagery');
  assert.ok(c.costs.unitCostMinor > 0, 'has a cost');
  assert.ok(c.scores.overall >= 0);
  assert.equal(c.governance.autoApprovable, false);
});
