import { mulberry32, pick } from '../lib/rng.mjs';
import { CONCEPT_LIBRARY } from '../catalog/concept-library.mjs';

/**
 * Stand-in for the sourcing "model". Real mode swaps this for Claude + web
 * research. Concepts come from the brand-curated concept library so the catalog
 * stays on-brand while offering breadth. Each carries cost/list placeholders and
 * specs so the sourcing agent can produce a fully-formed, scoreable candidate.
 */
export const CONCEPTS = CONCEPT_LIBRARY;

/**
 * Deterministically propose `count` distinct concepts given a seed, favoring
 * CATEGORY DIVERSITY: it walks shuffled categories round-robin so a single run
 * spans outerwear/tops/bags/jewelry/etc. rather than clustering.
 */
export function proposeProducts({ seed = 1, count = 3, exclude = [] } = {}) {
  const rng = mulberry32(seed);
  const pool = CONCEPTS.filter((c) => !exclude.includes(c.name));

  // Bucket by category, shuffle within each bucket and the category order.
  const buckets = new Map();
  for (const c of pool) {
    if (!buckets.has(c.category)) buckets.set(c.category, []);
    buckets.get(c.category).push(c);
  }
  const order = shuffle([...buckets.keys()], rng);
  for (const k of order) buckets.set(k, shuffle(buckets.get(k), rng));

  const chosen = [];
  let guard = 0;
  while (chosen.length < count && guard++ < 1000) {
    let progressed = false;
    for (const k of order) {
      const bucket = buckets.get(k);
      if (bucket.length) {
        chosen.push(bucket.shift());
        progressed = true;
        if (chosen.length >= count) break;
      }
    }
    if (!progressed) break; // pool exhausted
  }
  return chosen;
}

function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
