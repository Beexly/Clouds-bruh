import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONCEPT_LIBRARY, categories } from '../src/catalog/concept-library.mjs';
import { proposeProducts } from '../src/adapters/claude.mock.mjs';

test('concept library is broad and well-formed', () => {
  assert.ok(CONCEPT_LIBRARY.length >= 30, 'library has breadth');
  assert.ok(categories().length >= 6, 'spans multiple categories');
  for (const c of CONCEPT_LIBRARY) {
    assert.ok(c.name && c.category, 'name + category');
    assert.ok(c.listMinor > c.costMinor, `${c.name} priced above cost`);
    assert.ok(Number.isInteger(c.listMinor) && Number.isInteger(c.costMinor), 'integer minor units');
  }
});

test('concept names are unique', () => {
  const names = CONCEPT_LIBRARY.map((c) => c.name);
  assert.equal(names.length, new Set(names).size);
});

test('proposeProducts is deterministic and favors category diversity', () => {
  const a = proposeProducts({ seed: 7, count: 6 }).map((c) => c.name);
  const b = proposeProducts({ seed: 7, count: 6 }).map((c) => c.name);
  assert.deepEqual(a, b, 'deterministic for a fixed seed');

  const cats = new Set(proposeProducts({ seed: 7, count: 6 }).map((c) => c.category));
  assert.ok(cats.size >= 4, 'a 6-item run spans several categories');
});

test('exclude keeps already-seen names out', () => {
  const first = proposeProducts({ seed: 3, count: 5 }).map((c) => c.name);
  const second = proposeProducts({ seed: 3, count: 5, exclude: first }).map((c) => c.name);
  assert.equal(first.filter((n) => second.includes(n)).length, 0);
});
