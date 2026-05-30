/**
 * Seed the catalog from the Bright Data samples, mapped to the Alter XIV product schema.
 * Lets you design + test The Broadcast before real inventory lands.
 * Run: pnpm seed  (from apps/backend)
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Product, Chapter } from '@alterxiv/shared';

const DATA = join(__dirname, '../packages/data');
const CHAPTERS: Chapter[] = ['stillness', 'armor', 'signal', 'altar', 'relentless'];

function parseCsv(file: string): Record<string, string>[] {
  const lines = readFileSync(join(DATA, file), 'utf8').split('\n').filter(Boolean);
  const headers = lines[0].split(',');
  return lines.slice(1).map((l) => {
    const cells = l.split(','); // NOTE: swap for a real CSV parser (quoted commas) at build time
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']));
  });
}

function toProduct(row: Record<string, string>, i: number): Partial<Product> {
  return {
    sku: row.sku || row.asin || `AXIV-${i}`,
    gtin: row.gtin, upc: row.upc, model_number: row.model_number,
    brand: 'Alter XIV',
    title: row.title || row.product_name || 'Untitled',
    description: row.description || '',
    chapter: CHAPTERS[i % CHAPTERS.length],
    price: { initial: Number(row.initial_price) || 0, final: Number(row.final_price || row.final_price) || 0, currency: row.currency || 'USD' },
    media: { main_image: row.main_image || row.image_url || '', image_urls: [], image_count: Number(row.images_count || row.image_count) || 0 },
    social: { rating: Number(row.rating) || undefined, reviews_count: Number(row.reviews_count || row.review_count) || undefined },
    ai: { image_audit_status: 'pending', copy_audit_status: 'pending', trained_algorithmic_media: false },
  };
}

async function main() {
  const rows = [
    ...parseCsv('shein-products.sample.csv'),
    ...parseCsv('amazon-products.sample.csv'),
  ];
  const products = rows.map(toProduct);
  console.log(`Prepared ${products.length} seed products across ${CHAPTERS.length} chapters.`);
  // TODO: insert via Medusa product module + assign to chapters/drops; queue ORACLE embedding build.
}
main().catch(console.error);
