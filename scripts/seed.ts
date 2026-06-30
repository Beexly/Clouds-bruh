/**
 * Lumera catalog seed — real Medusa v2 exec script.
 * Run: pnpm seed  (from repo root, delegates to apps/backend medusa exec)
 *
 * Reads Bright Data sample CSVs, maps products to the 5 chapters,
 * creates Medusa categories + products, then seeds 2 live drops.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';
import type { ExecArgs } from '@medusajs/framework/types';
import { Modules } from '@medusajs/framework/utils';
import type { Chapter } from '@alterxiv/shared';
import { seedMembershipTiers } from './seed-monetization';

const DATA = join(__dirname, '../packages/data');

const FALLBACK_FIXTURES: Record<string, string> = {
  'amazon-products.sample.csv': 'fixtures/amazon-products.fixture.csv',
  'shein-products.sample.csv': 'fixtures/shein-products.fixture.csv',
};

// Chapter detection: keyword → chapter
const CHAPTER_KEYWORDS: Record<Chapter, string[]> = {
  stillness:  ['meditat', 'calm', 'quiet', 'peace', 'candle', 'incense', 'journal', 'yoga', 'linen', 'retreat'],
  armor:      ['jacket', 'vest', 'coat', 'hoodie', 'protect', 'layer', 'puffer', 'outerwear', 'safety', 'reflective'],
  signal:     ['tech', 'wireless', 'bluetooth', 'earbu', 'headphone', 'speaker', 'cable', 'charger', 'phone', 'gadget', 'watch'],
  altar:      ['crystal', 'stone', 'ritual', 'decor', 'spiritual', 'aroma', 'diffuser', 'sage', 'altar', 'blessing', 'prayer'],
  relentless: ['running', 'athletic', 'sneaker', 'training', 'gym', 'performance', 'sport', 'shoe', 'workout', 'fitness'],
};

function detectChapter(text: string): Chapter {
  const lower = text.toLowerCase();
  for (const [chapter, keywords] of Object.entries(CHAPTER_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return chapter as Chapter;
  }
  return 'relentless'; // default
}

function parseCsv(file: string): Record<string, string>[] {
  const primaryPath = join(DATA, file);
  const fallback = FALLBACK_FIXTURES[file];
  const fallbackPath = fallback ? join(DATA, fallback) : undefined;
  let sourcePath = primaryPath;

  if (!existsSync(primaryPath) && fallbackPath && existsSync(fallbackPath)) {
    sourcePath = fallbackPath;
    console.warn(`[seed] ${file} not found; using committed fixture ${fallback}`);
  }

  const content = readFileSync(sourcePath, 'utf8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Record<string, string>[];
}

function amazonToProduct(row: Record<string, string>) {
  const title = row.title?.replace(/[""]/g, '') || 'Untitled';
  const chapter = detectChapter(title + ' ' + (row.categories || ''));
  const finalPrice = parseFloat(row.final_price?.replace(/[^0-9.]/g, '') || '0');
  return {
    title: title.slice(0, 200),
    description: (row.description?.replace(/[""]/g, '') || '').slice(0, 2000),
    handle: `amazon-${(row.asin || title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60)}`,
    status: 'published' as const,
    metadata: {
      chapter,
      sku: row.asin,
      source: 'amazon',
      rating: row.rating ? parseFloat(row.rating) : undefined,
      reviews_count: row.reviews_count ? parseInt(row.reviews_count) : undefined,
      main_image: row.image_url || '',
      brand: row.brand || 'Lumera',
      scripture_ref: undefined as string | undefined,
    },
    variants: [{
      title: 'Standard',
      prices: [{ amount: Math.round(finalPrice * 100), currency_code: 'usd' }],
      inventory_quantity: 50,
      manage_inventory: true,
    }],
    images: row.image_url ? [{ url: row.image_url }] : [],
  };
}

function sheinToProduct(row: Record<string, string>) {
  const title = row.product_name?.replace(/[""]/g, '') || 'Untitled';
  const chapter = detectChapter(title + ' ' + (row.category_tree || '') + ' ' + (row.root_category || ''));
  const finalPrice = parseFloat(row.final_price?.replace(/[^0-9.]/g, '') || '0');
  const mainImage = row.main_image?.replace(/[""]/g, '') || '';
  return {
    title: title.slice(0, 200),
    description: (row.description?.replace(/[""]/g, '') || '').slice(0, 2000),
    handle: `shein-${(row.product_id || row.model_number || title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60)}`,
    status: 'published' as const,
    metadata: {
      chapter,
      sku: row.product_id || row.model_number || '',
      source: 'shein',
      rating: row.rating ? parseFloat(row.rating) : undefined,
      reviews_count: row.reviews_count ? parseInt(row.reviews_count) : undefined,
      main_image: mainImage,
      brand: 'Lumera',
      scripture_ref: undefined as string | undefined,
    },
    variants: [{
      title: 'Standard',
      prices: [{ amount: Math.round(finalPrice * 100), currency_code: 'usd' }],
      inventory_quantity: 30,
      manage_inventory: true,
    }],
    images: mainImage ? [{ url: mainImage }] : [],
  };
}

export default async function ({ container }: ExecArgs) {
  console.log('[seed] Starting Lumera catalog seed...');

  const productModule = container.resolve(Modules.PRODUCT);

  // ── 1. Create chapter categories ──────────────────────────────────────────
  console.log('[seed] Creating chapter categories...');
  const chapterDefs: { name: string; handle: string; description: string; metadata: Record<string, string> }[] = [
    { name: 'Stillness', handle: 'stillness', description: 'The calm before. Garments for contemplation and sacred rest.', metadata: { chapter: 'stillness', scripture: 'Psalm 46:10 — Be still and know' } },
    { name: 'Armor', handle: 'armor', description: 'Put on the full armor. Built for those who carry weight.', metadata: { chapter: 'armor', scripture: 'Ephesians 6:11' } },
    { name: 'Signal', handle: 'signal', description: 'Tuned to frequency. Technology as devotion.', metadata: { chapter: 'signal', scripture: 'Romans 10:17 — Faith comes by hearing' } },
    { name: 'Altar', handle: 'altar', description: 'Sacred objects. The space where intention becomes action.', metadata: { chapter: 'altar', scripture: 'Exodus 14:14 — The Lord will fight for you' } },
    { name: 'Relentless', handle: 'relentless', description: 'The grind is worship. Performance for the devoted.', metadata: { chapter: 'relentless', scripture: 'Philippians 4:13' } },
  ];

  const allExisting = await productModule.listProductCategories({}, { select: ['id', 'handle'] }).catch(() => []) as any[];
  const existingHandles = new Set(allExisting.map((c: any) => c.handle));
  let categories: any[] = [...allExisting];

  for (const def of chapterDefs) {
    if (existingHandles.has(def.handle)) continue;
    const created = await productModule.createProductCategories([def]);
    const arr = Array.isArray(created) ? created : [created];
    categories = [...categories, ...arr];
    console.log(`[seed] Created category: ${def.name}`);
  }
  if (categories.length === chapterDefs.length) {
    console.log('[seed] All 5 chapter categories ready.');
  }

  const categoryByChapter = Object.fromEntries(
    categories.map((c: any) => [c.handle, c.id])
  ) as Record<Chapter, string>;

  // ── 2. Parse CSVs ─────────────────────────────────────────────────────────
  console.log('[seed] Parsing CSV files...');
  const amazonRows = parseCsv('amazon-products.sample.csv');
  const sheinRows = parseCsv('shein-products.sample.csv');

  const amazonProducts = amazonRows.slice(0, 40).map(amazonToProduct);
  const sheinProducts = sheinRows.slice(0, 40).map(sheinToProduct);
  const allProducts = [...amazonProducts, ...sheinProducts];

  console.log(`[seed] Prepared ${allProducts.length} products (${amazonProducts.length} Amazon + ${sheinProducts.length} Shein).`);

  // ── 3. Check existing products (idempotent by handle) ────────────────────
  const existingHandlesList = (await productModule.listProducts(
    { handle: allProducts.map((p) => p.handle) },
    { select: ['handle'] }
  ).catch(() => [])) as { handle: string }[];
  const existingProductHandles = new Set(existingHandlesList.map((p) => p.handle));

  const toInsert = allProducts.filter((p) => !existingProductHandles.has(p.handle));
  console.log(`[seed] Inserting ${toInsert.length} new products (${allProducts.length - toInsert.length} already exist)...`);

  // Insert in batches of 20 to avoid overwhelming Medusa
  const BATCH = 20;
  const insertedIds: string[] = [];
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    const created = await productModule.createProducts(batch as any[]);
    const createdArr = Array.isArray(created) ? created : [created];
    insertedIds.push(...createdArr.map((p: any) => p.id));

    // Assign each product to its chapter category
    for (const product of createdArr) {
      const chapter = (product.metadata as any)?.chapter as Chapter | undefined;
      if (chapter && categoryByChapter[chapter]) {
        await productModule.updateProducts(product.id, {
          categories: [{ id: categoryByChapter[chapter] }],
        } as any).catch((e: Error) => console.warn(`[seed] Category assign failed for ${product.id}: ${e.message.slice(0, 80)}`));
      }
    }
    console.log(`[seed] Batch ${Math.floor(i / BATCH) + 1}: inserted ${createdArr.length} products.`);
  }
  console.log(`[seed] ✅ Products seeded. ${insertedIds.length} new, ${allProducts.length - toInsert.length} pre-existing.`);

  // ── 4. Seed 2 drops ───────────────────────────────────────────────────────
  const dropsService = container.resolve('drops') as any;
  const existingDrops = await dropsService.listDrops({}).catch(() => []);
  if ((existingDrops as any[]).length > 0) {
    console.log(`[seed] Drops already seeded (${(existingDrops as any[]).length} found), skipping.`);
  } else {
    // Assign roughly equal product IDs to each drop
    const armorIds = insertedIds.slice(0, Math.min(10, insertedIds.length));
    const relentlessIds = insertedIds.slice(10, Math.min(20, insertedIds.length));

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const in21Days = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);

    await dropsService.createDrops([
      {
        name: 'THE IRON GATE — DROP I',
        series: 'Season Zero',
        chapter: 'armor',
        status: 'live',
        starts_at: now,
        ends_at: in7Days,
        units_total: 144,
        units_remaining: 144,
        product_ids: armorIds,
      },
      {
        name: 'UNBROKEN — DROP II',
        series: 'Season Zero',
        chapter: 'relentless',
        status: 'scheduled',
        starts_at: in14Days,
        ends_at: in21Days,
        units_total: 72,
        units_remaining: 72,
        product_ids: relentlessIds,
      },
    ]);
    console.log('[seed] ✅ 2 drops created (THE IRON GATE live, UNBROKEN scheduled).');
  }

  // ── 4b. Membership tiers (idempotent) ─────────────────────────────────────
  // Without these, monetization.subscribe() throws 'Unknown tier' and Patron entitlements / the 2x
  // Luminance multiplier are inert. Guarded so a monetization hiccup never fails the catalog seed.
  try {
    const monetization = container.resolve('monetization') as any;
    await seedMembershipTiers(monetization);
    console.log('[seed] ✅ Membership tiers ready (disciple, patron).');
  } catch (e) {
    console.warn('[seed] membership tier seed skipped:', (e as Error).message);
  }

  // ── 5. Report ─────────────────────────────────────────────────────────────
  const totalProducts = await productModule.listProducts({}, { select: ['id'] }).catch(() => []);
  const drops = await dropsService.listDrops({}).catch(() => []);
  console.log(`\n[seed] ══════════════════════════════════`);
  console.log(`[seed] Catalog: ${(totalProducts as any[]).length} products across 5 chapters`);
  console.log(`[seed] Drops:   ${(drops as any[]).length} drops (${(drops as any[]).filter((d: any) => d.status === 'live').length} live)`);
  console.log(`[seed] ══════════════════════════════════`);
  console.log('[seed] Phase 1 done. Products queryable via Medusa.');
}
