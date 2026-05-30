/**
 * Recommendations — "pairs with / complete the ritual / from the same capsule"
 * (R3, docs/research/05 §1.2). Editorial, not algorithmic clutter: deterministic,
 * content-based similarity over the public projection. Default-deny preserved —
 * only live, projected products are ever candidates.
 *
 * Similarity = shared collection (strongest) + shared category + tag overlap +
 * price proximity. Pure and dependency-free.
 */
function tagOverlap(a, b) {
  const sa = new Set(a.tags || []);
  let n = 0;
  for (const t of b.tags || []) if (sa.has(t)) n++;
  return n;
}

function priceCloseness(a, b) {
  const pa = a.price?.listMinor || 0;
  const pb = b.price?.listMinor || 0;
  if (!pa || !pb) return 0;
  const ratio = Math.min(pa, pb) / Math.max(pa, pb); // 1 = identical
  return ratio; // 0..1
}

export function scoreSimilarity(target, other) {
  if (other.id === target.id) return -1;
  let s = 0;
  if (target.collectionId && other.collectionId === target.collectionId) s += 5; // same capsule
  if (other.category === target.category) s += 3;
  s += 2 * tagOverlap(target, other);
  s += 1.5 * priceCloseness(target, other);
  return s;
}

/** Top-N recommendations for a target product from the live pool. */
export function recommendationsFor(target, pool = [], limit = 4) {
  if (!target) return [];
  return pool
    .filter((p) => p.id !== target.id)
    .map((p) => ({ p, s: scoreSimilarity(target, p) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.p.title.localeCompare(b.p.title))
    .slice(0, limit)
    .map((x) => x.p);
}

/** "Most coveted this week" — honest best-seller signal from realized sales. */
export function mostCoveted(products = [], unitsByProductId = {}, limit = 6) {
  return products
    .map((p) => ({ p, units: unitsByProductId[p.id] || 0 }))
    .filter((x) => x.units > 0)
    .sort((a, b) => b.units - a.units)
    .slice(0, limit)
    .map((x) => ({ ...x.p, soldUnits: x.units }));
}
