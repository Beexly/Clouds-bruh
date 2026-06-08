import {
  attachReview,
  type ProductCandidate,
  type CandidateVariant,
  type VendorId,
} from './curation';

/**
 * Radar sourcing — turn raw scraped marketplace listings (AliExpress / Alibaba / Shein / Amazon)
 * into scorable Lumera ProductCandidates, and discover them through managed scraping
 * infrastructure (Oxylabs realtime + Apify Actors).
 *
 * Design notes / integrity:
 * - Compliant-by-default: discovery routes through Oxylabs/Apify (rotating proxies + parsers),
 *   never a hand-rolled browser against marketplace ToS.
 * - Radar candidates are DISCOVERY only. A scraped AliExpress URL is not directly fulfillable, so
 *   each candidate is tagged with a fulfillment vendor to assign (default `manual`) and a reason
 *   noting a real order route (CJ / manual intake) must be attached before publish. We never
 *   pretend a scraped listing can auto-ship.
 * - Everything degrades to [] when OXYLABS/APIFY creds are absent, so the loop + tests run on a
 *   clean checkout. Live discovery turns on the moment Garrett sets the keys.
 *
 * The normalizer is pure (no network) and adapts the field shapes emitted by the common OSS
 * AliExpress scrapers (sudheer-ranga/aliexpress-product-scraper, ducdev/aliexscrape), Oxylabs'
 * parsed e-commerce output, and Apify marketplace Actors.
 */

export type RadarSource = 'aliexpress' | 'alibaba' | 'shein' | 'amazon' | 'generic';

export interface RadarSourceConfig {
  id: RadarSource;
  label: string;
  /** Build a search URL for a query term (used by the Oxylabs `universal` source). */
  searchUrl: (query: string) => string;
  /** A reasonable default Apify Actor slug (override per-source via env). */
  apifyActor?: string;
  region: string;
}

export const RADAR_SOURCES: Record<RadarSource, RadarSourceConfig> = {
  aliexpress: {
    id: 'aliexpress',
    label: 'AliExpress',
    searchUrl: (q) => `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(q)}`,
    apifyActor: process.env.APIFY_ALIEXPRESS_ACTOR || 'mocwatter/aliexpress-listings-scraper',
    region: 'CN / global warehouses',
  },
  alibaba: {
    id: 'alibaba',
    label: 'Alibaba',
    searchUrl: (q) => `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(q)}`,
    apifyActor: process.env.APIFY_ALIBABA_ACTOR,
    region: 'CN suppliers',
  },
  shein: {
    id: 'shein',
    label: 'Shein',
    searchUrl: (q) => `https://www.shein.com/pdsearch/${encodeURIComponent(q)}`,
    apifyActor: process.env.APIFY_SHEIN_ACTOR,
    region: 'CN / global',
  },
  amazon: {
    id: 'amazon',
    label: 'Amazon',
    searchUrl: (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}`,
    apifyActor: process.env.APIFY_AMAZON_ACTOR,
    region: 'Marketplace',
  },
  generic: {
    id: 'generic',
    label: 'Generic',
    searchUrl: (q) => q, // caller passes a full URL as the query
    region: 'Web',
  },
};

type Raw = Record<string, any>;

export interface NormalizeOpts {
  source: RadarSource;
  query?: string;
  index?: number;
  /** Vendor that will actually fulfil a radar pick (scraped listings are not directly orderable). */
  fulfillmentVendor?: VendorId;
  marginFloor?: number;
  maxShippingDays?: number;
  /** Default retail markup multiple applied to supplier cost when no retail price is present. */
  markup?: number;
}

/** Cents-normalizer: treats values > 1000 as already-cents, else dollars. */
export function toCents(value: unknown): number {
  const n = typeof value === 'string' ? Number(value.replace(/[^0-9.]/g, '')) : Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n > 1000 ? Math.round(n) : Math.round(n * 100);
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 90);
}

function firstString(...values: unknown[]): string | undefined {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  }
  return undefined;
}

function pickImage(raw: Raw): string | undefined {
  return firstString(
    raw.image_url,
    raw.imageUrl,
    raw.image,
    raw.thumbnail,
    raw.thumbnail_url,
    raw.main_image,
    Array.isArray(raw.images) ? (typeof raw.images[0] === 'string' ? raw.images[0] : raw.images[0]?.src ?? raw.images[0]?.url) : undefined,
    raw.productImage
  );
}

function ratingOf(raw: Raw): number {
  const r =
    raw.rating ??
    raw.ratings?.averageStar ??
    raw.averageStar ??
    raw.evaluation?.star ??
    raw.score;
  const n = Number(r);
  return Number.isFinite(n) ? n : 0;
}

function ordersOf(raw: Raw): number {
  const o = raw.orders ?? raw.totalOrders ?? raw.trade_count ?? raw.sales ?? raw.sold ?? raw.reviews_count ?? raw.totalStar;
  const n = Number(typeof o === 'string' ? o.replace(/[^0-9]/g, '') : o);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Normalize one raw scraped listing into a scored ProductCandidate.
 * Pure: no network, deterministic given inputs (timestamps aside).
 */
export function normalizeScrapedProduct(raw: Raw, opts: NormalizeOpts): ProductCandidate {
  const src = RADAR_SOURCES[opts.source] ?? RADAR_SOURCES.generic;
  const index = opts.index ?? 0;
  const markup = opts.markup ?? 2.6;

  const supplierId = firstString(raw.id, raw.productId, raw.product_id, raw.pid, raw.asin) ?? `${opts.source}-${index}`;
  const title = firstString(raw.title, raw.name, raw.productTitle, raw.subject) ?? `${opts.query ?? 'Radar'} find ${index + 1}`;

  const costCents = toCents(
    raw.cost ?? raw.salePrice ?? raw.sale_price ?? raw.price?.value ?? raw.price ?? raw.app_sale_price ?? raw.minPrice
  );
  const explicitRetail = toCents(raw.retail_price ?? raw.originalPrice ?? raw.original_price ?? raw.list_price);
  const retailCents = Math.max(explicitRetail, Math.round(costCents * markup), costCents + 500);

  const rating = ratingOf(raw);
  const orders = ordersOf(raw);
  // Demand: blend popularity (orders) + satisfaction (rating) into a 0-100 score.
  const demandScore = clampInt(Math.round(Math.min(100, Math.log10(orders + 1) * 22 + rating * 8)));
  const supplierReliability = clampInt(Math.round(50 + rating * 8)); // 5★ → ~90

  const leadTime = Number(
    raw.lead_time_days ?? raw.shipping?.deliveryDays ?? raw.delivery_days ?? process.env.MAX_SHIPPING_DAYS ?? 12
  );

  const category = firstString(raw.category, raw.categoryName, raw.type, raw.first_level_category_name) ?? 'radar discovery';
  const sourceUrl = firstString(raw.url, raw.productUrl, raw.product_url, raw.link, raw.detailUrl);
  const stock = Number(raw.stock ?? raw.quantity ?? raw.inventory ?? raw.available_quantity ?? 100);

  const variant: CandidateVariant = {
    sku: String(raw.sku ?? supplierId),
    title: 'Default',
    supplier_sku: String(raw.sku ?? raw.variant_id ?? supplierId),
    option_values: { Default: 'Default' },
    cost_cents: costCents,
    retail_cents: retailCents,
    stock,
  };

  const ts = new Date().toISOString();
  const candidate: ProductCandidate = {
    id: `${opts.source}-${supplierId}`,
    vendor: 'radar',
    supplier_id: `${opts.source}:${supplierId}`,
    supplier_name: `${src.label} (radar)`,
    supplier_sku: String(raw.sku ?? supplierId),
    title,
    description: firstString(raw.description, raw.short_description, raw.subTitle) ?? `${title} — sourced via ${src.label} radar; assign a fulfilment route before publish.`,
    handle: slugify(`${opts.source}-${title}-${supplierId}`),
    category,
    category_tree: [src.label.toLowerCase(), category.toLowerCase()],
    chapter: 'signal',
    source_url: sourceUrl,
    image_url: pickImage(raw),
    // Scraped marketplace media is not licensed for our storefront — must be re-shot/replaced.
    media_rights: 'unknown',
    brand_risk: 'medium',
    quality_risk: rating >= 4.5 ? 'unknown' : 'high',
    counterfeit_risk: opts.source === 'aliexpress' || opts.source === 'alibaba' ? 'medium' : 'low',
    recalled_risk: 'unknown',
    regulated_risk: 'low',
    supplier_reliability: supplierReliability,
    demand_score: demandScore,
    brand_fit_score: 60,
    novelty_score: 64,
    return_risk_score: rating >= 4.5 ? 35 : 55,
    lead_time_days: Number.isFinite(leadTime) ? leadTime : 12,
    warehouse_region: src.region,
    cost_cents: costCents,
    retail_cents: retailCents,
    stock,
    variants: [variant],
    reasons: [
      `Discovered on ${src.label}${opts.query ? ` for “${opts.query}”` : ''}`,
      orders ? `${orders.toLocaleString()} reported orders` : 'Popularity signal pending',
      rating ? `${rating}★ supplier rating` : 'Rating pending',
      `Assign fulfilment route (${opts.fulfillmentVendor ?? 'manual'} / CJ) and re-shoot media before publish`,
    ],
    created_at: ts,
    updated_at: ts,
    status: 'ingested',
  };

  // Score + compliance (radar picks typically land in review/needs_sample/media_blocked — honest).
  return attachReview(candidate, opts.marginFloor, opts.maxShippingDays);
}

export function normalizeMany(rawItems: Raw[], opts: Omit<NormalizeOpts, 'index'>): ProductCandidate[] {
  return rawItems
    .filter((r) => r && typeof r === 'object' && !r.error)
    .map((raw, index) => normalizeScrapedProduct(raw, { ...opts, index }));
}

// ── Managed transport (network) ────────────────────────────────────────────
// Kept here so both the backend and the intelligence runtime share one implementation.
// Uses global fetch (Node 22 / browser) and btoa (avoids node-only Buffer for safe bundling).

export function oxylabsConfigured(): boolean {
  return Boolean(process.env.OXYLABS_USER && process.env.OXYLABS_PASS);
}

export function apifyConfigured(): boolean {
  return Boolean(process.env.APIFY_TOKEN);
}

/** True when any managed scraping source is credentialed (Oxylabs or Apify). */
export function radarConfigured(): boolean {
  return oxylabsConfigured() || apifyConfigured();
}

export async function oxylabsQuery(payload: Record<string, unknown>): Promise<any[]> {
  if (!oxylabsConfigured()) return [];
  const auth = typeof btoa === 'function'
    ? btoa(`${process.env.OXYLABS_USER}:${process.env.OXYLABS_PASS}`)
    : Buffer.from(`${process.env.OXYLABS_USER}:${process.env.OXYLABS_PASS}`).toString('base64');
  const res = await fetch('https://realtime.oxylabs.io/v1/queries', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ parse: true, ...payload }),
  });
  if (!res.ok) throw new Error(`Oxylabs ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  const body = (await res.json()) as { results?: any[] };
  return Array.isArray(body.results) ? body.results : [];
}

export async function runApifyActor(actor: string, input: Record<string, unknown> = {}): Promise<any[]> {
  if (!apifyConfigured() || !actor) return [];
  const actorPath = encodeURIComponent(actor.replace('/', '~'));
  const url = `https://api.apify.com/v2/acts/${actorPath}/run-sync-get-dataset-items?token=${process.env.APIFY_TOKEN}`;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  if (!res.ok) throw new Error(`Apify ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  const body = (await res.json()) as any;
  return Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : [];
}

export interface RadarDiscoverInput {
  source?: RadarSource;
  query: string;
  limit?: number;
  fulfillmentVendor?: VendorId;
}

/**
 * Discover candidates for a query from a radar source. Tries Apify Actor first (richest parsed
 * output), then Oxylabs universal. Returns [] (not an error) when nothing is configured.
 */
export async function radarDiscover(input: RadarDiscoverInput): Promise<ProductCandidate[]> {
  const source = input.source ?? 'aliexpress';
  const cfg = RADAR_SOURCES[source] ?? RADAR_SOURCES.generic;
  const limit = input.limit ?? 12;
  const fulfillmentVendor = input.fulfillmentVendor ?? 'manual';

  let raw: Raw[] = [];
  if (apifyConfigured() && cfg.apifyActor) {
    raw = await runApifyActor(cfg.apifyActor, { search: input.query, query: input.query, maxItems: limit }).catch(() => []);
  }
  if (raw.length === 0 && oxylabsConfigured()) {
    const results = await oxylabsQuery({ source: 'universal', url: cfg.searchUrl(input.query), parse: true }).catch(() => []);
    raw = results.flatMap((r) => contentToItems(r?.content));
  }
  return normalizeMany(raw.slice(0, limit), { source, query: input.query, fulfillmentVendor });
}

/** Oxylabs parsed `content` can be a single object, {products|results|items:[...]}, or array. */
function contentToItems(content: any): Raw[] {
  if (!content) return [];
  if (Array.isArray(content)) return content;
  if (Array.isArray(content.products)) return content.products;
  if (Array.isArray(content.results)) return content.results;
  if (Array.isArray(content.items)) return content.items;
  return [content];
}

function clampInt(n: number): number {
  return Math.min(100, Math.max(0, Number.isFinite(n) ? Math.round(n) : 0));
}
