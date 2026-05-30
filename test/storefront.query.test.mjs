import { test } from 'node:test';
import assert from 'node:assert/strict';
import { queryCatalog, facetize } from '../src/storefront/query.mjs';
import { recommendationsFor, scoreSimilarity, mostCoveted } from '../src/storefront/recommend.mjs';

const P = (over) => ({
  id: over.id,
  slug: over.id,
  title: over.title || over.id,
  category: over.category || 'accessory',
  tier: over.tier || 'The Vault',
  tags: over.tags || [],
  specs: over.specs || {},
  collectionId: over.collectionId,
  price: { listMinor: over.price || 5000, currency: 'USD' },
  media: [],
});

const POOL = [
  P({ id: 'belt', category: 'accessory', tags: ['leather', 'gothic'], price: 5800, collectionId: 'c1' }),
  P({ id: 'gloves', category: 'accessory', tags: ['leather'], price: 8900, collectionId: 'c1' }),
  P({ id: 'ring', category: 'jewelry', tags: ['silver'], price: 6800 }),
  P({ id: 'coat', category: 'outerwear', tags: ['wool'], price: 24800 }),
];

test('facetize counts categories, tiers, tags, and price range', () => {
  const f = facetize(POOL);
  assert.equal(f.categories.find((c) => c.value === 'accessory').count, 2);
  assert.equal(f.priceRange.minMinor, 5800);
  assert.equal(f.priceRange.maxMinor, 24800);
});

test('query: text search (incl. tags) + category filter + price band', () => {
  assert.deepEqual(queryCatalog(POOL, { q: 'leather' }).items.map((p) => p.id).sort(), ['belt', 'gloves']);
  assert.equal(queryCatalog(POOL, { category: 'accessory' }).total, 2);
  assert.equal(queryCatalog(POOL, { priceMin: 7000 }).total, 2); // gloves + coat
});

test('query: sort by price asc/desc and paginate', () => {
  const asc = queryCatalog(POOL, { sort: 'price.asc' }).items.map((p) => p.id);
  assert.deepEqual(asc, ['belt', 'ring', 'gloves', 'coat']);
  const page = queryCatalog(POOL, { sort: 'price.asc', perPage: 2, page: 2 });
  assert.deepEqual(page.items.map((p) => p.id), ['gloves', 'coat']);
  assert.equal(page.pages, 2);
});

test('recommendations: same collection + category + tags rank highest, never the target itself', () => {
  const target = POOL[0]; // belt
  const recs = recommendationsFor(target, POOL, 3);
  assert.ok(!recs.some((r) => r.id === 'belt'));
  assert.equal(recs[0].id, 'gloves'); // same collection + category + leather tag
  assert.ok(scoreSimilarity(target, POOL[1]) > scoreSimilarity(target, POOL[3]));
});

test('mostCoveted ranks by real units sold and omits unsold', () => {
  const coveted = mostCoveted(POOL, { belt: 5, ring: 12 }, 6);
  assert.deepEqual(coveted.map((c) => c.id), ['ring', 'belt']);
  assert.equal(coveted[0].soldUnits, 12);
  assert.ok(!coveted.some((c) => c.id === 'coat')); // unsold → excluded
});
