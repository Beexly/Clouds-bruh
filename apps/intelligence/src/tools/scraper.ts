import type { Tool } from './index';
import { oxylabsConfigured, oxylabsQuery } from '@alterxiv/shared';

/**
 * Sourcing radar — Oxylabs E-Commerce / Web Scraper API (realtime), via the shared transport in
 * `@alterxiv/shared/sourcing` (one implementation for both the backend and the agent runtime).
 *
 * Compliant-by-default: discovery routes through Oxylabs' managed scraping (rotating proxies +
 * structured parsers) rather than a hand-rolled browser against marketplace ToS. Degrades to an
 * empty result set when OXYLABS_USER/OXYLABS_PASS are absent, so the loop + tests run clean.
 */

export const sheinScraper: Tool = {
  name: 'shein_scraper',
  description:
    'Mine an e-commerce source (Shein / AliExpress / Alibaba / Amazon / any URL) for trending products, prices, and attributes via Oxylabs realtime. Returns structured JSON. Read-only; empty until OXYLABS creds are set.',
  inputSchema: {
    type: 'object',
    properties: {
      url: { type: 'string' },
      source: { type: 'string', default: 'universal' },
      parse: { type: 'boolean', default: true },
      geo_location: { type: 'string' },
    },
    required: ['url'],
  },
  run: async ({ url, source = 'universal', parse = true, geo_location }) => {
    if (!oxylabsConfigured()) {
      return { url, parsed: parse, products: [], source: 'unconfigured', note: 'Set OXYLABS_USER/OXYLABS_PASS to enable live discovery.' };
    }
    const results = await oxylabsQuery({ source, url, parse, ...(geo_location ? { geo_location } : {}) }).catch(
      (e: unknown) => [{ error: String((e as Error).message) }]
    );
    const content = results.map((r: any) => r?.content ?? r).filter(Boolean);
    return { url, parsed: parse, source, products: content };
  },
};

export const priceScraper: Tool = {
  name: 'price_scraper',
  description:
    'Track supplier/competitor prices for given product URLs; returns current price points (margin tracking input). Read-only; empty until OXYLABS creds are set.',
  inputSchema: {
    type: 'object',
    properties: { urls: { type: 'array', items: { type: 'string' } }, skus: { type: 'array', items: { type: 'string' } } },
  },
  run: async ({ urls = [], skus = [] }) => {
    if (!oxylabsConfigured() || (urls as string[]).length === 0) {
      return { skus, urls, series: [], source: oxylabsConfigured() ? 'no_targets' : 'unconfigured' };
    }
    const floor = Number(process.env.SUPPLIER_MARGIN_FLOOR ?? 0.38);
    const series = await Promise.all(
      (urls as string[]).slice(0, 20).map(async (url) => {
        const results = await oxylabsQuery({ source: 'universal', url, parse: true }).catch(() => []);
        const content = results[0]?.content ?? {};
        const raw = content.price ?? content.sale_price ?? content.current_price;
        const n = Number(typeof raw === 'string' ? raw.replace(/[^0-9.]/g, '') : raw);
        const price_cents = Number.isFinite(n) ? (n > 1000 ? Math.round(n) : Math.round(n * 100)) : null;
        return { url, at: new Date().toISOString(), price_cents, currency: content.currency ?? 'USD' };
      })
    );
    return { skus, urls, floor, series };
  },
};
