import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildImagePrompt, imageRequestsFor } from '../src/imagery/prompts.mjs';
import { buildImageryPlan } from '../src/imagery/plan.mjs';
import { attachCandidateImagery, approveCandidateImagery } from '../src/queue/review-actions.mjs';
import { enqueueCandidate, getCandidate } from '../src/queue/store.mjs';
import { createCandidate } from '../src/model/review-queue-item.mjs';
import { tempPaths } from './helpers.mjs';

test('image prompt is brand-consistent and deterministic', () => {
  const product = { title: 'Onyx Cargo Trousers', subtitle: '12oz cotton twill', category: 'bottoms', specs: { material: '12oz cotton twill' } };
  const a = buildImagePrompt(product, 'hero');
  const b = buildImagePrompt(product, 'hero');
  assert.equal(a, b); // deterministic
  assert.ok(a.includes('Eclipse'));
  assert.ok(/punk-gothic|dark luxury/.test(a));
  assert.ok(a.includes('no text, no watermark'));
});

test('imageRequestsFor returns one descriptor per role with prompt + size', () => {
  const reqs = imageRequestsFor({ title: 'X', category: 'bag' }, ['hero', 'detail']);
  assert.equal(reqs.length, 2);
  assert.ok(reqs[0].prompt && reqs[0].size);
});

test('imagery plan targets candidates with unapproved/placeholder media', async () => {
  const paths = await tempPaths();
  await enqueueCandidate(
    paths,
    createCandidate({
      title: 'Test',
      payload: { product: { title: 'Test', category: 'bag' } },
      imagery: [{ role: 'hero', url: 'assets/placeholder/hero.svg', provenance: 'placeholder', approved: false }],
    })
  );
  const plan = await buildImageryPlan(paths);
  assert.equal(plan.count, 1);
  assert.ok(plan.targets[0].requests.length >= 1);
});

test('attach records media as approved:false even if caller says true; human approval flips it', async () => {
  const paths = await tempPaths();
  const { candidate } = await enqueueCandidate(
    paths,
    createCandidate({ title: 'T', payload: { product: { title: 'T', category: 'bag' } }, imagery: [] })
  );
  await attachCandidateImagery(paths, candidate.id, [
    { role: 'hero', url: 'https://cdn/x/hero.png', approved: true },
    { role: 'angle', url: 'https://cdn/x/angle.png' },
  ]);
  let c = await getCandidate(paths, candidate.id);
  assert.equal(c.imagery.length, 2);
  assert.ok(c.imagery.every((m) => m.approved === false), 'attach never approves');
  assert.equal(c.scores.media, 0, 'unapproved media scores 0');

  c = await approveCandidateImagery(paths, candidate.id, { kind: 'human', id: 'op' });
  assert.ok(c.imagery.every((m) => m.approved === true));
  assert.ok(c.scores.media > 0, 'approved media now scores');
});
