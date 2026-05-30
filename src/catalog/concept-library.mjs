/**
 * Eclipse concept library — the brand-curated universe the sourcing agent draws
 * from. Dark luxury × punk/gothic, broad across categories (the Shein/Amazon
 * breadth) while staying on-brand (the luxury-house discipline). Costs/prices are
 * assumption-backed placeholders in integer minor units; every sourced item still
 * flows through the human review gate before it can go live.
 *
 * Each concept: { name, category, costMinor, listMinor, tags[], specs{} }.
 */
export const CONCEPT_LIBRARY = Object.freeze([
  // — Outerwear —
  { name: 'Corona Hooded Cloak', category: 'outerwear', costMinor: 5200, listMinor: 18800, tags: ['statement', 'drape', 'heavyweight'], specs: { material: '480GSM wool blend', detail: 'Oversized hood' } },
  { name: 'Umbra Wool Overcoat', category: 'outerwear', costMinor: 7400, listMinor: 24800, tags: ['tailored', 'heavyweight', 'investment'], specs: { material: '90% wool melton', detail: 'Horn buttons' } },
  { name: 'Eclipse Moto Jacket', category: 'outerwear', costMinor: 8200, listMinor: 28500, tags: ['leather', 'icon', 'investment'], specs: { material: 'Calfskin leather', detail: 'Asymmetric zip' } },
  { name: 'Ashfall Trench', category: 'outerwear', costMinor: 6800, listMinor: 22400, tags: ['tailored', 'drape'], specs: { material: 'Waxed cotton', detail: 'Storm-flap front' } },
  { name: 'Vigil Quilted Liner', category: 'outerwear', costMinor: 4200, listMinor: 14800, tags: ['layer', 'utility'], specs: { material: 'Ripstop shell', detail: 'Recycled fill' } },

  // — Tops —
  { name: 'Ashen Cropped Hoodie', category: 'tops', costMinor: 2600, listMinor: 9800, tags: ['fleece', 'cropped', 'street'], specs: { material: '500GSM French terry', detail: 'Garment-dyed' } },
  { name: 'Relic Heavy Tee', category: 'tops', costMinor: 1200, listMinor: 5200, tags: ['cotton', 'everyday'], specs: { material: '300GSM cotton', detail: 'Boxy cut' } },
  { name: 'Cinder Knit Sweater', category: 'tops', costMinor: 3400, listMinor: 12800, tags: ['knit', 'wool'], specs: { material: 'Lambswool', detail: 'Ribbed funnel neck' } },
  { name: 'Shroud Mesh Longsleeve', category: 'tops', costMinor: 1800, listMinor: 6800, tags: ['layer', 'gothic'], specs: { material: 'Tech mesh', detail: 'Thumbhole cuffs' } },
  { name: 'Obelisk Oxford Shirt', category: 'tops', costMinor: 2200, listMinor: 8400, tags: ['tailored', 'staple'], specs: { material: 'Brushed cotton', detail: 'Hidden placket' } },

  // — Bottoms —
  { name: 'Onyx Cargo Trousers', category: 'bottoms', costMinor: 3800, listMinor: 14200, tags: ['utility', 'relaxed', 'street'], specs: { material: '12oz cotton twill', detail: 'Bellowed cargo pockets' } },
  { name: 'Midnight Pleated Skirt', category: 'bottoms', costMinor: 3100, listMinor: 11800, tags: ['pleated', 'movement', 'luxe'], specs: { material: 'Crepe de chine', detail: 'Knife pleats' } },
  { name: 'Tar Selvedge Denim', category: 'bottoms', costMinor: 4200, listMinor: 15800, tags: ['denim', 'investment'], specs: { material: '14oz selvedge', detail: 'Chain-stitched hem' } },
  { name: 'Wraith Wide Trouser', category: 'bottoms', costMinor: 3600, listMinor: 13200, tags: ['drape', 'tailored'], specs: { material: 'Wool gabardine', detail: 'Pressed crease' } },

  // — Footwear —
  { name: 'Crypt Platform Boots', category: 'footwear', costMinor: 6100, listMinor: 21900, tags: ['leather', 'platform', 'statement'], specs: { material: 'Box calf leather', detail: 'Stacked lug sole' } },
  { name: 'Hollow Derby Shoes', category: 'footwear', costMinor: 5200, listMinor: 18400, tags: ['leather', 'formal'], specs: { material: 'Polished calf', detail: 'Goodyear welt' } },
  { name: 'Ghost Runner Lows', category: 'footwear', costMinor: 4400, listMinor: 16200, tags: ['sneaker', 'everyday'], specs: { material: 'Nubuck + mesh', detail: 'Foam midsole' } },

  // — Bags —
  { name: 'Void Structured Tote', category: 'bag', costMinor: 4200, listMinor: 16500, tags: ['leather', 'everyday', 'structured'], specs: { material: 'Full-grain leather', detail: 'Suede-lined interior' } },
  { name: 'Reliquary Crossbody', category: 'bag', costMinor: 3200, listMinor: 12400, tags: ['leather', 'compact'], specs: { material: 'Pebbled leather', detail: 'Adjustable strap' } },
  { name: 'Cargo Hold Duffel', category: 'bag', costMinor: 5400, listMinor: 19800, tags: ['travel', 'utility'], specs: { material: 'Coated canvas', detail: 'Weatherproof zip' } },

  // — Jewelry —
  { name: 'Halo Hoop Earrings', category: 'jewelry', costMinor: 900, listMinor: 4200, tags: ['gold', 'minimal', 'everyday'], specs: { material: '14k gold vermeil', detail: 'Hypoallergenic posts' } },
  { name: 'Eclipse Signet Ring', category: 'jewelry', costMinor: 1400, listMinor: 6800, tags: ['silver', 'icon'], specs: { material: 'Sterling silver', detail: 'Engraved face' } },
  { name: 'Tether Chain Necklace', category: 'jewelry', costMinor: 1600, listMinor: 7400, tags: ['silver', 'layering'], specs: { material: 'Rhodium-plated', detail: 'Lobster clasp' } },

  // — Accessories —
  { name: 'Obsidian Chain Belt', category: 'accessory', costMinor: 1400, listMinor: 5800, tags: ['hardware', 'gothic', 'unisex'], specs: { material: 'Antiqued brass', detail: 'Hand-linked chain' } },
  { name: 'Vesper Silk Scarf', category: 'accessory', costMinor: 1600, listMinor: 6400, tags: ['silk', 'print', 'luxe'], specs: { material: '100% mulberry silk', detail: 'Hand-rolled hem' } },
  { name: 'Nocturne Leather Gloves', category: 'accessory', costMinor: 2200, listMinor: 8900, tags: ['leather', 'cold-weather', 'sleek'], specs: { material: 'Lambskin', detail: 'Cashmere lining' } },
  { name: 'Sable Knit Balaclava', category: 'accessory', costMinor: 1500, listMinor: 5600, tags: ['knit', 'street', 'unisex'], specs: { material: 'Merino wool', detail: 'Rib-knit face opening' } },
  { name: 'Plasma Chrome Sunglasses', category: 'accessory', costMinor: 1900, listMinor: 7400, tags: ['chrome', 'futurist', 'uv'], specs: { material: 'Acetate + steel', detail: 'UV400 mirrored lens' } },
  { name: 'Ironclad Card Holder', category: 'accessory', costMinor: 800, listMinor: 3800, tags: ['leather', 'edc'], specs: { material: 'Saffiano leather', detail: 'RFID-blocking' } },

  // — Home / objects (the breadth play, still on-brand) —
  { name: 'Altar Pillar Candle', category: 'home', costMinor: 900, listMinor: 3600, tags: ['ritual', 'scent'], specs: { material: 'Soy-coconut wax', detail: '60-hour burn' } },
  { name: 'Monolith Incense Holder', category: 'home', costMinor: 1100, listMinor: 4400, tags: ['ritual', 'object'], specs: { material: 'Cast concrete', detail: 'Matte black finish' } },
  { name: 'Umbral Throw Blanket', category: 'home', costMinor: 3400, listMinor: 11800, tags: ['textile', 'comfort'], specs: { material: 'Brushed wool', detail: 'Fringed edge' } },
]);

/** Distinct categories present in the library. */
export function categories() {
  return [...new Set(CONCEPT_LIBRARY.map((c) => c.category))];
}
