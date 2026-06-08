import { describe, expect, it } from 'vitest';
import {
  normalizeScrapedProduct,
  normalizeMany,
  toCents,
  slugify,
  radarDiscover,
  RADAR_SOURCES,
} from './index';

describe('radar sourcing normalizer', () => {
  it('normalizes an aliexpress-product-scraper shaped item into a scored candidate', () => {
    const raw = {
      id: '100500',
      title: 'Heavyweight Oversized Hoodie',
      salePrice: '18.90',
      originalPrice: '42.00',
      currency: 'USD',
      ratings: { averageStar: 4.7 },
      totalOrders: '3,204',
      images: ['https://img.example/ae/1.jpg'],
      url: 'https://www.aliexpress.com/item/100500.html',
      sku: 'AE-HOODIE-1',
      stock: 240,
    };
    const c = normalizeScrapedProduct(raw, { source: 'aliexpress', query: 'oversized hoodie', index: 0 });

    expect(c.vendor).toBe('radar');
    expect(c.supplier_name).toBe('AliExpress (radar)');
    expect(c.cost_cents).toBe(1890);
    // retail = max(originalPrice 4200, cost*markup 1890*2.6=4914, cost+500) → markup wins
    expect(c.retail_cents).toBe(4914);
    expect(c.source_url).toBe('https://www.aliexpress.com/item/100500.html');
    expect(c.demand_score).toBeGreaterThan(0);
    expect(c.score).toBeDefined();
    // scraped media is never licensed → flagged for re-shoot, which blocks publish honestly
    expect(c.media_rights).toBe('unknown');
    expect(c.score?.blockers.some((b) => b.startsWith('media_rights'))).toBe(true);
    expect(c.reasons.some((r) => /fulfilment route/i.test(r))).toBe(true);
  });

  it('derives a retail price by markup when only a supplier cost is present', () => {
    const c = normalizeScrapedProduct({ title: 'Plain Tee', price: 6, sku: 'X1' }, { source: 'aliexpress', markup: 3 });
    expect(c.cost_cents).toBe(600);
    expect(c.retail_cents).toBe(1800); // 600 * 3
  });

  it('skips error rows and normalizes the rest', () => {
    const items = [{ error: 'rate limited' }, { title: 'A', price: 10, sku: 'a' }, { title: 'B', price: 12, sku: 'b' }];
    const out = normalizeMany(items, { source: 'shein', query: 'tee' });
    expect(out).toHaveLength(2);
    expect(out.every((c) => c.vendor === 'radar')).toBe(true);
  });

  it('toCents reads scraped marketplace prices as dollars', () => {
    expect(toCents('19.99')).toBe(1999);
    expect(toCents(49)).toBe(4900);
    expect(toCents('$1,499')).toBe(149900); // high-dollar item is not misread as cents
    expect(toCents(0)).toBe(0);
    expect(toCents('free')).toBe(0);
  });

  it('slugify produces a clean handle', () => {
    expect(slugify('AliExpress  Oversized — Hoodie!!')).toBe('aliexpress-oversized-hoodie');
  });

  it('radarDiscover returns [] (not an error) when no scraping creds are configured', async () => {
    const prevOxy = process.env.OXYLABS_USER;
    const prevApify = process.env.APIFY_TOKEN;
    delete process.env.OXYLABS_USER;
    delete process.env.APIFY_TOKEN;
    const out = await radarDiscover({ query: 'pendant', source: 'aliexpress' });
    expect(out).toEqual([]);
    if (prevOxy) process.env.OXYLABS_USER = prevOxy;
    if (prevApify) process.env.APIFY_TOKEN = prevApify;
  });

  it('exposes search URL builders for each radar source', () => {
    expect(RADAR_SOURCES.aliexpress.searchUrl('gold chain')).toContain('aliexpress.com');
    expect(RADAR_SOURCES.alibaba.searchUrl('tote')).toContain('alibaba.com');
  });
});
