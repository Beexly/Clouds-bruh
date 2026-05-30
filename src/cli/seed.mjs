import { pathToFileURL } from 'node:url';
import { createPaths } from '../lib/paths.mjs';
import { createSupplier } from '../model/supplier.mjs';
import { createProduct } from '../model/product.mjs';
import { createCollection } from '../model/collection.mjs';
import { saveCatalog } from '../catalog/store.mjs';
import { writeJson } from '../lib/jsonfile.mjs';
import { renderStorefront } from '../storefront/render.mjs';
import { rebuildQueueIndex } from '../queue/store.mjs';
import { computeLedger } from '../ops/progress.mjs';
import { supplierScore } from '../scoring/supplier-score.mjs';
import { ALTAR_XIV_CAPSULE } from '../storefront/copy.mjs';
import { BRAND } from '../brand.mjs';

// [listMinor, costMinor] per capsule piece.
const CAPSULE_PRICES = {
  'altar-tee': [6800, 2300],
  'xiv-hoodie': [12800, 4300],
  'remnant-cap': [4800, 1500],
  'consecrated-crewneck': [11800, 3900],
};

/** Seed suppliers + the Altar XIV House capsule (all draft/hidden/out-of-stock). */
export async function seed(paths = createPaths(process.cwd())) {
  const suppliers = [
    createSupplier({ name: 'Lusitania Mills', country: 'Portugal', capabilities: ['screenprint', 'embroidery', 'garment-dye'], leadTimeDays: 18, minOrderQty: 50, unitCostMinor: 2300, reliability: 88, status: 'active' }),
    createSupplier({ name: 'Atlas Knitworks', country: 'Italy', capabilities: ['knit', 'tailoring'], leadTimeDays: 25, minOrderQty: 40, unitCostMinor: 3100, reliability: 82, status: 'active' }),
  ].map((s) => ({ ...s, score: supplierScore(s) }));
  const supplier = suppliers[0];

  const products = ALTAR_XIV_CAPSULE.map((item) => {
    const [listMinor, costMinor] = CAPSULE_PRICES[item.key] || [9800, 3200];
    const colors = item.category === 'accessory' ? ['Onyx', 'Bone', 'Oxblood'] : ['Onyx', 'Bone'];
    const sizes = item.category === 'accessory' ? ['OS'] : ['S', 'M', 'L', 'XL'];
    const variants = [];
    for (const color of colors) for (const size of sizes) {
      variants.push({ color, size, inventory: { onHand: 0, reserved: 0, restockThreshold: 6 } });
    }
    return createProduct({
      title: item.title,
      subtitle: item.subtitle,
      description: item.description,
      bulletBenefits: item.bulletBenefits,
      emotionalHooks: item.emotionalHooks,
      category: item.category,
      tags: ['altar-xiv', 'capsule', 'house'],
      specs: item.specs,
      variants,
      media: [{ role: 'hero', url: 'assets/placeholder/hero.svg', alt: `${item.title} — hero`, provenance: 'placeholder', approved: false }],
      pricing: { listMinor, floorMinor: costMinor * 2, currency: 'USD' },
      supplierId: supplier.id,
      tier: BRAND.tiers.house,
      origin: { source: 'seed' },
    });
  });

  const collections = [
    createCollection({ title: 'Eclipse House — Altar XIV Capsule', slug: 'eclipse-house', productIds: products.map((p) => p.id), dropCode: 'AX-CAPSULE' }),
    createCollection({ title: 'The Vault', slug: 'the-vault', productIds: [] }),
  ];

  await saveCatalog(paths, { products });
  await writeJson(paths.suppliers, suppliers);
  await writeJson(paths.collections, collections);
  await rebuildQueueIndex(paths);
  const ledger = await computeLedger(paths);
  await writeJson(paths.ledger, ledger);
  const storefront = await renderStorefront(paths);
  return { suppliers, products, collections, ledger, storefront };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed()
    .then((r) => {
      console.log(`Seeded ${r.products.length} Altar XIV capsule products — all draft / hidden / out-of-stock.`);
      console.log(`${r.suppliers.length} active suppliers.`);
      console.log(`Storefront live products: ${r.storefront.count} (expected 0 — nothing is published yet).`);
      console.log(`Overall readiness: ${r.ledger.overallPct}%`);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
