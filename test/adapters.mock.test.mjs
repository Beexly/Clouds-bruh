import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAdapters, isLive } from '../src/adapters/index.mjs';

test('mock adapters are selected when ALTAR_LIVE is unset — no secrets, no network', async () => {
  assert.equal(isLive, false);
  const a = await getAdapters();
  assert.equal(a.live, false);
  assert.equal(typeof a.claude.proposeProducts, 'function');
  assert.equal(typeof a.imagegen.generateImagery, 'function');
  assert.equal(typeof a.websearch.research, 'function');

  const ideas = a.claude.proposeProducts({ seed: 1, count: 2 });
  assert.equal(ideas.length, 2);
  const imagery = a.imagegen.generateImagery('Test');
  assert.ok(imagery.every((m) => m.approved === false), 'imagery is unapproved by default');
});
