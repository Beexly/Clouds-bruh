import { mulberry32, pick } from '../lib/rng.mjs';

/**
 * Stand-in for the sourcing "model". Real mode (Phase 5) swaps this for Claude +
 * web research. Each concept carries cost/list placeholders and specs so the
 * sourcing agent can produce a fully-formed, scoreable candidate.
 * Gothic-luxe, profanity-free, breadth-of-catalog concepts.
 */
export const CONCEPTS = Object.freeze([
  { name: 'Obsidian Chain Belt', category: 'accessory', costMinor: 1400, listMinor: 5800, tags: ['hardware', 'gothic', 'unisex'], specs: { material: 'Antiqued brass', detail: 'Hand-linked chain' } },
  { name: 'Corona Hooded Cloak', category: 'outerwear', costMinor: 5200, listMinor: 18800, tags: ['statement', 'drape', 'heavyweight'], specs: { material: '480GSM wool blend', detail: 'Oversized hood' } },
  { name: 'Vesper Silk Scarf', category: 'accessory', costMinor: 1600, listMinor: 6400, tags: ['silk', 'print', 'luxe'], specs: { material: '100% mulberry silk', detail: 'Hand-rolled hem' } },
  { name: 'Void Structured Tote', category: 'bag', costMinor: 4200, listMinor: 16500, tags: ['leather', 'everyday', 'structured'], specs: { material: 'Full-grain leather', detail: 'Suede-lined interior' } },
  { name: 'Onyx Cargo Trousers', category: 'bottoms', costMinor: 3800, listMinor: 14200, tags: ['utility', 'relaxed', 'street'], specs: { material: '12oz cotton twill', detail: 'Bellowed cargo pockets' } },
  { name: 'Nocturne Leather Gloves', category: 'accessory', costMinor: 2200, listMinor: 8900, tags: ['leather', 'cold-weather', 'sleek'], specs: { material: 'Lambskin', detail: 'Cashmere lining' } },
  { name: 'Umbra Wool Overcoat', category: 'outerwear', costMinor: 7400, listMinor: 24800, tags: ['tailored', 'heavyweight', 'investment'], specs: { material: '90% wool melton', detail: 'Horn buttons' } },
  { name: 'Halo Hoop Earrings', category: 'jewelry', costMinor: 900, listMinor: 4200, tags: ['gold', 'minimal', 'everyday'], specs: { material: '14k gold vermeil', detail: 'Hypoallergenic posts' } },
  { name: 'Sable Knit Balaclava', category: 'accessory', costMinor: 1500, listMinor: 5600, tags: ['knit', 'street', 'unisex'], specs: { material: 'Merino wool', detail: 'Rib-knit face opening' } },
  { name: 'Plasma Chrome Sunglasses', category: 'accessory', costMinor: 1900, listMinor: 7400, tags: ['chrome', 'futurist', 'uv'], specs: { material: 'Acetate + steel', detail: 'UV400 mirrored lens' } },
  { name: 'Midnight Pleated Skirt', category: 'bottoms', costMinor: 3100, listMinor: 11800, tags: ['pleated', 'movement', 'luxe'], specs: { material: 'Crepe de chine', detail: 'Knife pleats' } },
  { name: 'Eclipse Moto Jacket', category: 'outerwear', costMinor: 8200, listMinor: 28500, tags: ['leather', 'icon', 'investment'], specs: { material: 'Calfskin leather', detail: 'Asymmetric zip' } },
  { name: 'Ashen Cropped Hoodie', category: 'tops', costMinor: 2600, listMinor: 9800, tags: ['fleece', 'cropped', 'street'], specs: { material: '500GSM French terry', detail: 'Garment-dyed' } },
  { name: 'Crypt Platform Boots', category: 'footwear', costMinor: 6100, listMinor: 21900, tags: ['leather', 'platform', 'statement'], specs: { material: 'Box calf leather', detail: 'Stacked lug sole' } },
]);

/** Deterministically propose `count` distinct concepts given a seed. */
export function proposeProducts({ seed = 1, count = 3, exclude = [] } = {}) {
  const rng = mulberry32(seed);
  const pool = CONCEPTS.filter((c) => !exclude.includes(c.name));
  const chosen = [];
  const used = new Set();
  let guard = 0;
  while (chosen.length < count && used.size < pool.length && guard++ < 500) {
    const c = pick(rng, pool);
    if (used.has(c.name)) continue;
    used.add(c.name);
    chosen.push(c);
  }
  return chosen;
}
