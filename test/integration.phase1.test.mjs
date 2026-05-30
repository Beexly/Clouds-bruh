import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tempPaths } from './helpers.mjs';
import { seed } from '../src/cli/seed.mjs';
import { runAgent } from '../src/agents/runtime.mjs';
import { loadQueue } from '../src/queue/store.mjs';
import { approveCandidate, publishCandidate } from '../src/queue/review-actions.mjs';
import { renderStorefront } from '../src/storefront/render.mjs';
import { applyTransition } from '../src/queue/transitions.mjs';
import { agent, human } from '../src/lib/actor.mjs';

test('seed → source → approve → publish → storefront shows exactly the approved product', async () => {
  const paths = await tempPaths();
  const s = await seed(paths);
  assert.equal(s.storefront.count, 0); // nothing is live after seeding

  await runAgent('sourcing', paths, { count: 3, seed: 11 });
  const cand = (await loadQueue(paths)).find((c) => c.kind === 'product');
  assert.equal(cand.status, 'queued');

  const op = human('operator');
  const { product } = await approveCandidate(paths, cand.id, op);
  // approved but still a hidden draft until explicitly published
  assert.equal(product.lifecycle, 'draft');
  assert.equal(product.visibility, 'hidden');

  const pub = await publishCandidate(paths, cand.id, op, { stock: 20 });
  assert.equal(pub.product.lifecycle, 'published');

  const sf = await renderStorefront(paths);
  assert.equal(sf.count, 1);
  assert.equal(sf.products[0].id, product.id);
});

test('an agent can never approve a candidate end-to-end', async () => {
  const paths = await tempPaths();
  await seed(paths);
  await runAgent('sourcing', paths, { count: 1, seed: 3 });
  const cand = (await loadQueue(paths)).find((c) => c.kind === 'product');
  assert.throws(() => applyTransition(cand, 'approved', agent('sourcing')));
});
