/**
 * Storefront catalog query — pure, dependency-free facet/sort/paginate over the
 * public projection (R3, from docs/research/01 #5 and 05 §1). Operates ONLY on
 * already-projected public products, so default-deny still holds: nothing here
 * can surface a non-live product.
 *
 * Query contract (URL-friendly): {
 *   q, category, categories[], tier, priceMin, priceMax, tags[],
 *   sort: "field.dir" (price.asc|price.desc|title.asc|newest),
 *   page, perPage
 * }
 */
const cents = (p) => p?.price?.listMinor || 0;

export function facetize(products = []) {
  const categories = {};
  const tiers = {};
  const tags = {};
  let min = Infinity;
  let max = 0;
  for (const p of products) {
    categories[p.category] = (categories[p.category] || 0) + 1;
    if (p.tier) tiers[p.tier] = (tiers[p.tier] || 0) + 1;
    for (const t of p.tags || []) tags[t] = (tags[t] || 0) + 1;
    const c = cents(p);
    if (c < min) min = c;
    if (c > max) max = c;
  }
  return {
    categories: toSortedFacet(categories),
    tiers: toSortedFacet(tiers),
    tags: toSortedFacet(tags).slice(0, 20),
    priceRange: { minMinor: products.length ? min : 0, maxMinor: max },
  };
}

function toSortedFacet(map) {
  return Object.entries(map)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

function matches(p, q) {
  if (q.q) {
    const hay = `${p.title} ${p.subtitle || ''} ${(p.tags || []).join(' ')} ${p.category} ${Object.values(p.specs || {}).join(' ')}`.toLowerCase();
    if (!hay.includes(q.q.toLowerCase())) return false;
  }
  const cats = q.categories || (q.category ? [q.category] : null);
  if (cats && cats.length && !cats.includes(p.category)) return false;
  if (q.tier && p.tier !== q.tier) return false;
  if (q.tags && q.tags.length && !q.tags.every((t) => (p.tags || []).includes(t))) return false;
  const c = cents(p);
  if (q.priceMin != null && c < q.priceMin) return false;
  if (q.priceMax != null && c > q.priceMax) return false;
  return true;
}

const SORTERS = {
  'price.asc': (a, b) => cents(a) - cents(b),
  'price.desc': (a, b) => cents(b) - cents(a),
  'title.asc': (a, b) => a.title.localeCompare(b.title),
  newest: (a, b) => String(b.productionRun?.dropCode || '').localeCompare(String(a.productionRun?.dropCode || '')),
};

export function queryCatalog(products = [], q = {}) {
  const filtered = products.filter((p) => matches(p, q));
  const sorter = SORTERS[q.sort];
  const sorted = sorter ? [...filtered].sort(sorter) : filtered;

  const perPage = Math.max(1, Math.min(60, q.perPage || 24));
  const page = Math.max(1, q.page || 1);
  const total = sorted.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;

  return {
    items: sorted.slice(start, start + perPage),
    facets: facetize(products),
    page,
    perPage,
    total,
    pages,
    appliedSort: q.sort || 'featured',
  };
}

/** Parse the URL query contract from URLSearchParams into a query object. */
export function parseQuery(searchParams) {
  const g = (k) => searchParams.get(k);
  const num = (k) => (g(k) != null && g(k) !== '' ? Number(g(k)) : undefined);
  const list = (k) => (g(k) ? g(k).split(',').filter(Boolean) : undefined);
  return {
    q: g('q') || undefined,
    category: g('category') || undefined,
    categories: list('categories'),
    tier: g('tier') || undefined,
    tags: list('tags'),
    priceMin: num('priceMin'),
    priceMax: num('priceMax'),
    sort: g('sort') || undefined,
    page: num('page'),
    perPage: num('perPage'),
  };
}
