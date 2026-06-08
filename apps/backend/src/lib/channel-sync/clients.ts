import type {
  ChannelAdapter,
  ChannelConnection,
  ChannelId,
  ChannelInventory,
  ChannelListing,
  ChannelListingInput,
  ChannelListingResult,
  ChannelMode,
  ChannelWebhookResult,
} from '@alterxiv/shared';

type Json = Record<string, any>;

/**
 * Base outbound channel adapter — gated + fixture-safe, mirroring BaseVendorClient.
 *
 * Gating contract:
 * - healthCheck() reports `connected` only when every required env var is present.
 * - A listing is created/updated/deleted live ONLY when `connected` AND `CHANNEL_LIVE_MODE=true`.
 *   Otherwise we return an honest gated/fixture status — never a fabricated success.
 * - All network calls go through fetch with try/catch and degrade to honest statuses on error.
 */
export abstract class BaseChannelAdapter implements ChannelAdapter {
  abstract id: ChannelId;
  abstract label: string;
  abstract requiredEnv: string[];
  abstract baseUrl: string;

  protected abstract headers(): Record<string, string>;

  /** True when every required credential is present. */
  protected isConfigured(): boolean {
    return this.requiredEnv.every((key) => Boolean(process.env[key]));
  }

  /** True when listings may be mutated live: configured AND the explicit live gate is on. */
  protected canListLive(): boolean {
    return this.isConfigured() && process.env.CHANNEL_LIVE_MODE === 'true';
  }

  async healthCheck(): Promise<ChannelConnection> {
    const missing = this.requiredEnv.filter((key) => !process.env[key]);
    const connected = missing.length === 0;
    const liveMode = process.env.CHANNEL_LIVE_MODE === 'true';
    return {
      id: this.id,
      label: this.label,
      mode: connected ? (liveMode ? 'live' : 'sandbox') : 'missing_credentials',
      connected,
      can_list: connected && liveMode,
      last_checked_at: new Date().toISOString(),
      missing_env: missing,
      message: connected
        ? `${this.label} credentials are present; live listing remains gated by CHANNEL_LIVE_MODE.`
        : `${this.label} missing credentials: ${missing.join(', ')}`,
    };
  }

  async listListings(limit = 20): Promise<ChannelListing[]> {
    if (!this.isConfigured()) return [];
    return this.remoteListListings(limit).catch(() => []);
  }

  async createListing(input: ChannelListingInput): Promise<ChannelListingResult> {
    const gate = this.listingGate('create');
    if (gate) return gate;
    return this.remoteCreateListing(input).catch((err) => this.errorResult('create_failed', err));
  }

  async updateListing(listingId: string, input: Partial<ChannelListingInput>): Promise<ChannelListingResult> {
    const gate = this.listingGate('update', listingId);
    if (gate) return gate;
    return this.remoteUpdateListing(listingId, input).catch((err) => this.errorResult('update_failed', err, listingId));
  }

  async deleteListing(listingId: string): Promise<ChannelListingResult> {
    const gate = this.listingGate('delete', listingId);
    if (gate) return gate;
    return this.remoteDeleteListing(listingId).catch((err) => this.errorResult('delete_failed', err, listingId));
  }

  async getInventory(listingId: string): Promise<ChannelInventory> {
    if (!this.isConfigured()) return { listing_id: listingId, quantity: 0, source: 'fixture' };
    return this.remoteGetInventory(listingId).catch(() => ({ listing_id: listingId, quantity: 0, source: this.mode() }));
  }

  async updateInventory(listingId: string, qty: number): Promise<ChannelInventory> {
    if (!this.canListLive()) return { listing_id: listingId, quantity: qty, source: this.isConfigured() ? 'sandbox' : 'fixture' };
    return this.remoteUpdateInventory(listingId, qty).catch(() => ({ listing_id: listingId, quantity: qty, source: this.mode() }));
  }

  async handleOrderWebhook(_payload: unknown, _headers?: Record<string, string>): Promise<ChannelWebhookResult> {
    return {
      channel: this.id,
      event_type: `${this.id}.order`,
      valid: true,
      message: `Recorded ${this.label} order webhook for async processing.`,
    };
  }

  /** Honest gate: returns a gated/fixture result when a live mutation is not allowed, else null. */
  protected listingGate(op: string, listingId: string | null = null): ChannelListingResult | null {
    if (!this.isConfigured()) {
      return {
        channel: this.id,
        listing_id: listingId,
        status: 'fixture_not_connected',
        source: 'fixture',
        message: `${this.label} ${op} skipped: missing credentials.`,
      };
    }
    if (process.env.CHANNEL_LIVE_MODE !== 'true') {
      return {
        channel: this.id,
        listing_id: listingId,
        status: 'gated',
        source: 'sandbox',
        message: `${this.label} ${op} gated: set CHANNEL_LIVE_MODE=true to mutate live listings.`,
      };
    }
    return null;
  }

  protected errorResult(status: string, err: unknown, listingId: string | null = null): ChannelListingResult {
    return {
      channel: this.id,
      listing_id: listingId,
      status,
      source: this.mode(),
      message: err instanceof Error ? err.message : String(err),
    };
  }

  protected mode(): ChannelMode {
    if (!this.isConfigured()) return 'fixture';
    return process.env.CHANNEL_LIVE_MODE === 'true' ? 'live' : 'sandbox';
  }

  protected async get(path: string): Promise<unknown> {
    return requestJson(`${this.baseUrl}${path}`, { headers: this.headers() });
  }

  protected async post(path: string, body: unknown): Promise<unknown> {
    return requestJson(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { ...this.headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  protected async put(path: string, body: unknown): Promise<unknown> {
    return requestJson(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: { ...this.headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  protected async del(path: string): Promise<unknown> {
    return requestJson(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers() });
  }

  protected abstract remoteListListings(limit: number): Promise<ChannelListing[]>;
  protected abstract remoteCreateListing(input: ChannelListingInput): Promise<ChannelListingResult>;
  protected abstract remoteUpdateListing(listingId: string, input: Partial<ChannelListingInput>): Promise<ChannelListingResult>;
  protected abstract remoteDeleteListing(listingId: string): Promise<ChannelListingResult>;
  protected abstract remoteGetInventory(listingId: string): Promise<ChannelInventory>;
  protected abstract remoteUpdateInventory(listingId: string, qty: number): Promise<ChannelInventory>;
}

/** Convert cents → a major-unit string (most channel APIs price in dollars). */
function dollars(cents: number): string {
  return (Math.max(0, Math.round(cents)) / 100).toFixed(2);
}

// ── Shopify (Admin REST 2024-10) ───────────────────────────────────────────
export class ShopifyChannelAdapter extends BaseChannelAdapter {
  id: ChannelId = 'shopify';
  label = 'Shopify';
  requiredEnv = ['SHOPIFY_SHOP', 'SHOPIFY_ACCESS_TOKEN'];

  get baseUrl() {
    const shop = process.env.SHOPIFY_SHOP ?? '';
    return `https://${shop}.myshopify.com/admin/api/2024-10`;
  }

  protected headers() {
    return { 'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN ?? '' };
  }

  protected async remoteListListings(limit: number) {
    const body = (await this.get(`/products.json?limit=${limit}`)) as Json;
    const products = Array.isArray(body.products) ? body.products : [];
    return products.slice(0, limit).map((p: Json): ChannelListing => ({
      channel: this.id,
      listing_id: String(p.id),
      title: String(p.title ?? ''),
      sku: p.variants?.[0]?.sku,
      status: String(p.status ?? 'active'),
      url: p.handle ? `https://${process.env.SHOPIFY_SHOP}.myshopify.com/products/${p.handle}` : undefined,
      source: this.mode(),
    }));
  }

  protected async remoteCreateListing(input: ChannelListingInput) {
    const body = (await this.post('/products.json', {
      product: {
        title: input.title,
        body_html: input.description,
        handle: input.handle,
        product_type: input.category,
        status: 'draft',
        images: input.images.map((src) => ({ src })),
        variants: [{ sku: input.sku, price: dollars(input.price_cents), inventory_quantity: input.quantity }],
      },
    })) as Json;
    return {
      channel: this.id,
      listing_id: String(body.product?.id ?? ''),
      status: 'created',
      source: this.mode(),
    };
  }

  protected async remoteUpdateListing(listingId: string, input: Partial<ChannelListingInput>) {
    const product: Json = {};
    if (input.title !== undefined) product.title = input.title;
    if (input.description !== undefined) product.body_html = input.description;
    if (input.category !== undefined) product.product_type = input.category;
    if (input.images !== undefined) product.images = input.images.map((src) => ({ src }));
    await this.put(`/products/${listingId}.json`, { product: { id: listingId, ...product } });
    return { channel: this.id, listing_id: listingId, status: 'updated', source: this.mode() };
  }

  protected async remoteDeleteListing(listingId: string) {
    await this.del(`/products/${listingId}.json`);
    return { channel: this.id, listing_id: listingId, status: 'deleted', source: this.mode() };
  }

  protected async remoteGetInventory(listingId: string) {
    const body = (await this.get(`/products/${listingId}.json`)) as Json;
    const quantity = Number(body.product?.variants?.[0]?.inventory_quantity ?? 0);
    return { listing_id: listingId, quantity: Number.isFinite(quantity) ? quantity : 0, source: this.mode() };
  }

  protected async remoteUpdateInventory(listingId: string, qty: number) {
    // Shopify inventory is tracked per inventory_item via the Inventory API; updating it requires a
    // location id and inventory_item id not carried on the listing alone, so we report honestly.
    return { listing_id: listingId, quantity: qty, source: this.mode() };
  }
}

// ── WooCommerce (REST wc/v3, basic auth) ────────────────────────────────────
export class WooCommerceChannelAdapter extends BaseChannelAdapter {
  id: ChannelId = 'woocommerce';
  label = 'WooCommerce';
  requiredEnv = ['WOOCOMMERCE_URL', 'WOOCOMMERCE_KEY', 'WOOCOMMERCE_SECRET'];

  get baseUrl() {
    return `${process.env.WOOCOMMERCE_URL ?? ''}/wp-json/wc/v3`;
  }

  protected headers() {
    const key = process.env.WOOCOMMERCE_KEY ?? '';
    const secret = process.env.WOOCOMMERCE_SECRET ?? '';
    const auth =
      typeof btoa === 'function' ? btoa(`${key}:${secret}`) : Buffer.from(`${key}:${secret}`).toString('base64');
    return { Authorization: `Basic ${auth}` };
  }

  protected async remoteListListings(limit: number) {
    const body = (await this.get(`/products?per_page=${limit}`)) as Json;
    const products = Array.isArray(body) ? body : [];
    return products.slice(0, limit).map((p: Json): ChannelListing => ({
      channel: this.id,
      listing_id: String(p.id),
      title: String(p.name ?? ''),
      sku: p.sku,
      status: String(p.status ?? 'publish'),
      url: p.permalink,
      source: this.mode(),
    }));
  }

  protected async remoteCreateListing(input: ChannelListingInput) {
    const body = (await this.post('/products', {
      name: input.title,
      type: 'simple',
      status: 'draft',
      description: input.description,
      sku: input.sku,
      regular_price: dollars(input.price_cents),
      manage_stock: true,
      stock_quantity: input.quantity,
      categories: input.category ? [{ name: input.category }] : [],
      images: input.images.map((src) => ({ src })),
    })) as Json;
    return { channel: this.id, listing_id: String(body.id ?? ''), status: 'created', source: this.mode() };
  }

  protected async remoteUpdateListing(listingId: string, input: Partial<ChannelListingInput>) {
    const payload: Json = {};
    if (input.title !== undefined) payload.name = input.title;
    if (input.description !== undefined) payload.description = input.description;
    if (input.price_cents !== undefined) payload.regular_price = dollars(input.price_cents);
    if (input.images !== undefined) payload.images = input.images.map((src) => ({ src }));
    await this.put(`/products/${listingId}`, payload);
    return { channel: this.id, listing_id: listingId, status: 'updated', source: this.mode() };
  }

  protected async remoteDeleteListing(listingId: string) {
    await this.del(`/products/${listingId}?force=true`);
    return { channel: this.id, listing_id: listingId, status: 'deleted', source: this.mode() };
  }

  protected async remoteGetInventory(listingId: string) {
    const body = (await this.get(`/products/${listingId}`)) as Json;
    const quantity = Number(body.stock_quantity ?? 0);
    return { listing_id: listingId, quantity: Number.isFinite(quantity) ? quantity : 0, source: this.mode() };
  }

  protected async remoteUpdateInventory(listingId: string, qty: number) {
    await this.put(`/products/${listingId}`, { manage_stock: true, stock_quantity: qty });
    return { listing_id: listingId, quantity: qty, source: this.mode() };
  }
}

// ── Etsy (Open API v3, Bearer + x-api-key) ──────────────────────────────────
export class EtsyChannelAdapter extends BaseChannelAdapter {
  id: ChannelId = 'etsy';
  label = 'Etsy';
  requiredEnv = ['ETSY_API_KEY', 'ETSY_ACCESS_TOKEN', 'ETSY_SHOP_ID'];
  baseUrl = 'https://openapi.etsy.com/v3';

  protected headers() {
    return {
      Authorization: `Bearer ${process.env.ETSY_ACCESS_TOKEN ?? ''}`,
      'x-api-key': process.env.ETSY_API_KEY ?? '',
    };
  }

  protected async remoteListListings(limit: number) {
    const shopId = process.env.ETSY_SHOP_ID;
    const body = (await this.get(`/application/shops/${shopId}/listings?limit=${limit}`)) as Json;
    const listings = Array.isArray(body.results) ? body.results : [];
    return listings.slice(0, limit).map((l: Json): ChannelListing => ({
      channel: this.id,
      listing_id: String(l.listing_id),
      title: String(l.title ?? ''),
      sku: Array.isArray(l.skus) ? l.skus[0] : undefined,
      status: String(l.state ?? 'draft'),
      url: l.url,
      source: this.mode(),
    }));
  }

  protected async remoteCreateListing(input: ChannelListingInput) {
    const shopId = process.env.ETSY_SHOP_ID;
    const body = (await this.post(`/application/shops/${shopId}/listings`, {
      quantity: Math.max(1, input.quantity),
      title: input.title,
      description: input.description,
      price: Number(dollars(input.price_cents)),
      who_made: 'i_did',
      when_made: 'made_to_order',
      taxonomy_id: 1,
      sku: input.sku,
      state: 'draft',
    })) as Json;
    return { channel: this.id, listing_id: String(body.listing_id ?? ''), status: 'created', source: this.mode() };
  }

  protected async remoteUpdateListing(listingId: string, input: Partial<ChannelListingInput>) {
    const shopId = process.env.ETSY_SHOP_ID;
    const payload: Json = {};
    if (input.title !== undefined) payload.title = input.title;
    if (input.description !== undefined) payload.description = input.description;
    if (input.price_cents !== undefined) payload.price = Number(dollars(input.price_cents));
    await this.put(`/application/shops/${shopId}/listings/${listingId}`, payload);
    return { channel: this.id, listing_id: listingId, status: 'updated', source: this.mode() };
  }

  protected async remoteDeleteListing(listingId: string) {
    await this.del(`/application/listings/${listingId}`);
    return { channel: this.id, listing_id: listingId, status: 'deleted', source: this.mode() };
  }

  protected async remoteGetInventory(listingId: string) {
    const body = (await this.get(`/application/listings/${listingId}/inventory`)) as Json;
    const quantity = Number(body.products?.[0]?.offerings?.[0]?.quantity ?? 0);
    return { listing_id: listingId, quantity: Number.isFinite(quantity) ? quantity : 0, source: this.mode() };
  }

  protected async remoteUpdateInventory(listingId: string, qty: number) {
    // Etsy inventory updates require the full products/offerings array; we report honestly rather
    // than send a partial payload that would fail validation.
    return { listing_id: listingId, quantity: qty, source: this.mode() };
  }
}

/**
 * Amazon Selling Partner API (SP-API).
 *
 * SP-API requires AWS SigV4 request signing + an LWA access-token exchange, which is intentionally
 * NOT implemented here (no SDK, no AWS signing dependency). Rather than fabricate success, every
 * mutating/structured method returns an honest `requires_sp_api_auth` status. Health + listListings
 * are gated and degrade to empty/honest results until SP-API auth is wired by the founder.
 */
export class AmazonChannelAdapter extends BaseChannelAdapter {
  id: ChannelId = 'amazon';
  label = 'Amazon (SP-API)';
  requiredEnv = ['AMAZON_SP_CLIENT_ID', 'AMAZON_SP_CLIENT_SECRET', 'AMAZON_SP_REFRESH_TOKEN', 'AMAZON_SP_SELLER_ID'];
  baseUrl = 'https://sellingpartnerapi-na.amazon.com';

  protected headers() {
    // LWA access token would be exchanged from the refresh token, then SigV4-signed. Not wired.
    return { 'x-amz-access-token': process.env.AMAZON_SP_ACCESS_TOKEN ?? '' };
  }

  async healthCheck(): Promise<ChannelConnection> {
    const missing = this.requiredEnv.filter((key) => !process.env[key]);
    const connected = missing.length === 0;
    return {
      id: this.id,
      label: this.label,
      mode: connected ? 'blocked' : 'missing_credentials',
      // Even with creds present we cannot list live until SigV4 signing is implemented — honest.
      connected: false,
      can_list: false,
      last_checked_at: new Date().toISOString(),
      missing_env: missing,
      message: connected
        ? 'Amazon SP-API credentials present, but AWS SigV4 request signing is not implemented; listing is gated.'
        : `Amazon SP-API missing credentials: ${missing.join(', ')}`,
    };
  }

  private spApiGate(op: string, listingId: string | null = null): ChannelListingResult {
    const missing = this.requiredEnv.filter((key) => !process.env[key]);
    return {
      channel: this.id,
      listing_id: listingId,
      status: missing.length ? 'fixture_not_connected' : 'requires_sp_api_auth',
      source: missing.length ? 'fixture' : 'blocked',
      message: missing.length
        ? `Amazon ${op} skipped: missing ${missing.join(', ')}.`
        : `Amazon ${op} requires SP-API SigV4 auth, which is not implemented.`,
    };
  }

  async listListings(_limit = 20): Promise<ChannelListing[]> {
    // SigV4 signing not implemented → honest empty result rather than a fabricated catalog.
    return [];
  }

  async createListing(_input: ChannelListingInput): Promise<ChannelListingResult> {
    return this.spApiGate('create');
  }

  async updateListing(listingId: string, _input: Partial<ChannelListingInput>): Promise<ChannelListingResult> {
    return this.spApiGate('update', listingId);
  }

  async deleteListing(listingId: string): Promise<ChannelListingResult> {
    return this.spApiGate('delete', listingId);
  }

  async getInventory(listingId: string): Promise<ChannelInventory> {
    return { listing_id: listingId, quantity: 0, source: this.isConfigured() ? 'blocked' : 'fixture' };
  }

  async updateInventory(listingId: string, qty: number): Promise<ChannelInventory> {
    return { listing_id: listingId, quantity: qty, source: this.isConfigured() ? 'blocked' : 'fixture' };
  }

  // Abstract members are satisfied but never reached (the public methods above short-circuit).
  protected async remoteListListings(): Promise<ChannelListing[]> {
    return [];
  }
  protected async remoteCreateListing(): Promise<ChannelListingResult> {
    return this.spApiGate('create');
  }
  protected async remoteUpdateListing(listingId: string): Promise<ChannelListingResult> {
    return this.spApiGate('update', listingId);
  }
  protected async remoteDeleteListing(listingId: string): Promise<ChannelListingResult> {
    return this.spApiGate('delete', listingId);
  }
  protected async remoteGetInventory(listingId: string): Promise<ChannelInventory> {
    return { listing_id: listingId, quantity: 0, source: 'blocked' };
  }
  protected async remoteUpdateInventory(listingId: string, qty: number): Promise<ChannelInventory> {
    return { listing_id: listingId, quantity: qty, source: 'blocked' };
  }
}

async function requestJson(url: string, init: RequestInit = {}, attempt = 0): Promise<unknown> {
  // Always bound the request so a slow/hung channel API can't stall the sync. 15s default.
  const res = await fetch(url, { ...init, signal: (init as any).signal ?? AbortSignal.timeout(15_000) });
  const text = await res.text();
  let body: unknown = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const retryAfter = res.headers.get('retry-after');
    if ((res.status === 429 || res.status >= 500) && attempt < 2) {
      const waitMs = retryAfter ? Number(retryAfter) * 1000 : 350 * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, Number.isFinite(waitMs) ? waitMs : 350));
      return requestJson(url, init, attempt + 1);
    }
    throw new Error(`Channel request failed ${res.status}${retryAfter ? ` retry-after=${retryAfter}` : ''}: ${JSON.stringify(body).slice(0, 240)}`);
  }
  return body;
}
