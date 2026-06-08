import {
  attachReview,
  fixtureCandidates,
  type ProductCandidate,
  type VendorConnection,
  type VendorConnector,
  type VendorId,
  type VendorMode,
} from '@alterxiv/shared';

type Json = Record<string, any>;

export abstract class BaseVendorClient implements VendorConnector {
  abstract id: VendorId;
  abstract label: string;
  abstract requiredEnv: string[];
  abstract baseUrl: string;

  protected abstract headers(): Record<string, string>;

  async healthCheck(): Promise<VendorConnection> {
    const missing = this.requiredEnv.filter((key) => !process.env[key]);
    const liveMode = process.env.VENDOR_LIVE_MODE === 'true';
    const autoSubmit = process.env.AUTO_SUBMIT_VENDOR_ORDERS === 'true';
    const connected = missing.length === 0;
    return {
      id: this.id,
      label: this.label,
      mode: connected ? (liveMode ? 'live' : 'sandbox') : 'missing_credentials',
      connected,
      can_publish: connected && process.env.AUTO_PUBLISH_APPROVED !== 'false',
      can_submit_orders: connected && liveMode && autoSubmit,
      last_checked_at: new Date().toISOString(),
      missing_env: missing,
      message: connected
        ? `${this.label} credentials are present; order submission remains gated by live-mode flags.`
        : `${this.label} missing credentials: ${missing.join(', ')}`,
    };
  }

  async searchProducts(query: string, limit = 10): Promise<ProductCandidate[]> {
    const health = await this.healthCheck();
    if (!health.connected) return fixtureCandidates(this.id).slice(0, limit);
    const rows = await this.remoteSearch(query, limit).catch(() => fixtureCandidates(this.id).slice(0, limit));
    return rows.map((candidate) => attachReview(candidate));
  }

  async getProductDetails(supplierSku: string): Promise<ProductCandidate | null> {
    const found = (await this.searchProducts(supplierSku, 20)).find(
      (candidate) => candidate.supplier_sku === supplierSku || candidate.variants.some((variant) => variant.supplier_sku === supplierSku)
    );
    return found ?? null;
  }

  async getVariantInventory(supplierSku: string) {
    const candidate = await this.getProductDetails(supplierSku);
    const variant = candidate?.variants.find((v) => v.supplier_sku === supplierSku) ?? candidate?.variants[0];
    const health = await this.healthCheck();
    return {
      supplier_sku: supplierSku,
      stock: variant?.stock ?? candidate?.stock ?? 0,
      lead_time_days: candidate?.lead_time_days ?? Number(process.env.MAX_SHIPPING_DAYS ?? 12),
      source: health.mode,
    };
  }

  async quoteShipping(input: { supplier_sku: string; country_code?: string; postal_code?: string; quantity?: number }) {
    const inventory = await this.getVariantInventory(input.supplier_sku);
    return {
      min_days: Math.max(2, inventory.lead_time_days - 4),
      max_days: inventory.lead_time_days,
      cost_cents: 0,
      source: inventory.source,
    };
  }

  async createDraftOrder(input: { external_order_id: string; items: Array<{ supplier_sku: string; quantity: number }>; shipping_address?: unknown }) {
    const health = await this.healthCheck();
    if (!health.connected) {
      return { vendor_order_id: `fixture_${this.id}_${Date.now()}`, status: 'fixture_draft', source: 'fixture' as VendorMode };
    }
    if (process.env.VENDOR_DRAFT_ORDER_PROOF !== 'true') {
      return { vendor_order_id: `proof_gated_${this.id}_${Date.now()}`, status: 'draft_order_proof_gated', source: health.mode };
    }
    const created = await this.remoteCreateDraftOrder(input);
    return { vendor_order_id: created.vendor_order_id, status: created.status, source: health.mode };
  }

  async submitOrder(vendorOrderId: string) {
    const health = await this.healthCheck();
    if (!health.can_submit_orders) return { vendor_order_id: vendorOrderId, status: 'submission_gated', source: health.mode };
    return this.remoteSubmitOrder(vendorOrderId, health.mode);
  }

  async cancelOrder(vendorOrderId: string) {
    const health = await this.healthCheck();
    if (!health.connected) return { vendor_order_id: vendorOrderId, status: 'cancel_fixture', source: 'fixture' as VendorMode };
    return this.remoteCancelOrder(vendorOrderId, health.mode);
  }

  async getTracking(vendorOrderId: string) {
    const health = await this.healthCheck();
    if (!health.connected) return { vendor_order_id: vendorOrderId, status: 'fixture_pending', source: 'fixture' as VendorMode };
    return this.remoteGetTracking(vendorOrderId, health.mode);
  }

  async handleWebhook(payload: unknown) {
    return { event_type: `${this.id}.webhook`, valid: true, message: `Recorded ${this.label} webhook for async processing.` };
  }

  protected async get(path: string) {
    return requestJson(`${this.baseUrl}${path}`, { headers: this.headers() });
  }

  protected async post(path: string, body: unknown) {
    return requestJson(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { ...this.headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  protected abstract remoteSearch(query: string, limit: number): Promise<ProductCandidate[]>;
  protected abstract remoteCreateDraftOrder(input: { external_order_id: string; items: Array<{ supplier_sku: string; quantity: number }>; shipping_address?: unknown }): Promise<{ vendor_order_id: string; status: string }>;
  protected abstract remoteSubmitOrder(vendorOrderId: string, source: VendorMode): Promise<{ vendor_order_id: string; status: string; source: VendorMode }>;
  protected abstract remoteCancelOrder(vendorOrderId: string, source: VendorMode): Promise<{ vendor_order_id: string; status: string; source: VendorMode }>;
  protected abstract remoteGetTracking(vendorOrderId: string, source: VendorMode): Promise<{ vendor_order_id: string; tracking_number?: string; tracking_url?: string; status: string; source: VendorMode }>;
}

export class PrintifyClient extends BaseVendorClient {
  id: VendorId = 'printify';
  label = 'Printify';
  requiredEnv = ['PRINTIFY_TOKEN', 'PRINTIFY_SHOP_ID'];
  baseUrl = 'https://api.printify.com/v1';

  protected headers() {
    return { Authorization: `Bearer ${process.env.PRINTIFY_TOKEN ?? ''}` };
  }

  protected async remoteSearch(query: string, limit: number) {
    const shopId = process.env.PRINTIFY_SHOP_ID;
    const body = await this.get(`/shops/${shopId}/products.json`) as Json;
    const products = Array.isArray(body.data) ? body.data : Array.isArray(body) ? body : [];
    return products.slice(0, limit).map((item: Json, index: number) => remoteCandidate('printify', item, query, index));
  }

  protected async remoteCreateDraftOrder(input: { external_order_id: string; items: Array<{ supplier_sku: string; quantity: number }>; shipping_address?: unknown }) {
    const shopId = process.env.PRINTIFY_SHOP_ID;
    const body = await this.post(`/shops/${shopId}/orders.json`, {
      external_id: input.external_order_id,
      label: 'Lumera staged order',
      line_items: input.items.map((item) => ({ sku: item.supplier_sku, quantity: item.quantity })),
      shipping_method: 1,
      send_shipping_notification: false,
      address_to: input.shipping_address ?? {},
    }) as Json;
    return { vendor_order_id: String(body.id ?? body.order_id ?? `printify_${Date.now()}`), status: 'draft_created' };
  }

  protected async remoteSubmitOrder(vendorOrderId: string, source: VendorMode) {
    const shopId = process.env.PRINTIFY_SHOP_ID;
    await this.post(`/shops/${shopId}/orders/${vendorOrderId}/send_to_production.json`, {});
    return { vendor_order_id: vendorOrderId, status: 'submitted_to_production', source };
  }

  protected async remoteCancelOrder(vendorOrderId: string, source: VendorMode) {
    const shopId = process.env.PRINTIFY_SHOP_ID;
    await this.post(`/shops/${shopId}/orders/${vendorOrderId}/cancel.json`, {});
    return { vendor_order_id: vendorOrderId, status: 'cancel_requested', source };
  }

  protected async remoteGetTracking(vendorOrderId: string, source: VendorMode) {
    const shopId = process.env.PRINTIFY_SHOP_ID;
    const body = await this.get(`/shops/${shopId}/orders/${vendorOrderId}.json`) as Json;
    const tracking = body.shipments?.[0] ?? body.shipping_tracking ?? {};
    return {
      vendor_order_id: vendorOrderId,
      tracking_number: tracking.number ?? tracking.tracking_number,
      tracking_url: tracking.url ?? tracking.tracking_url,
      status: body.status ?? 'unknown',
      source,
    };
  }
}

export class PrintfulClient extends BaseVendorClient {
  id: VendorId = 'printful';
  label = 'Printful';
  requiredEnv = ['PRINTFUL_TOKEN', 'PRINTFUL_STORE_ID'];
  baseUrl = 'https://api.printful.com';

  protected headers() {
    return {
      Authorization: `Bearer ${process.env.PRINTFUL_TOKEN ?? ''}`,
      'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID ?? '',
    };
  }

  protected async remoteSearch(query: string, limit: number) {
    const body = await this.get(`/products?limit=${limit}`) as Json;
    const products = Array.isArray(body.result) ? body.result : [];
    return products.slice(0, limit).map((item: Json, index: number) => remoteCandidate('printful', item, query, index));
  }

  protected async remoteCreateDraftOrder(input: { external_order_id: string; items: Array<{ supplier_sku: string; quantity: number }>; shipping_address?: unknown }) {
    const body = await this.post('/orders', {
      external_id: input.external_order_id,
      confirm: false,
      recipient: input.shipping_address ?? {},
      items: input.items.map((item) => ({ sync_variant_id: item.supplier_sku, quantity: item.quantity })),
    }) as Json;
    return { vendor_order_id: String(body.result?.id ?? `printful_${Date.now()}`), status: 'draft_created' };
  }

  protected async remoteSubmitOrder(vendorOrderId: string, source: VendorMode) {
    await this.post(`/orders/${vendorOrderId}/confirm`, {});
    return { vendor_order_id: vendorOrderId, status: 'confirmed', source };
  }

  protected async remoteCancelOrder(vendorOrderId: string, source: VendorMode) {
    await this.post(`/orders/${vendorOrderId}/cancel`, {});
    return { vendor_order_id: vendorOrderId, status: 'cancel_requested', source };
  }

  protected async remoteGetTracking(vendorOrderId: string, source: VendorMode) {
    const body = await this.get(`/orders/${vendorOrderId}`) as Json;
    const shipment = body.result?.shipments?.[0] ?? {};
    return {
      vendor_order_id: vendorOrderId,
      tracking_number: shipment.tracking_number,
      tracking_url: shipment.tracking_url,
      status: body.result?.status ?? 'unknown',
      source,
    };
  }
}

export class CjClient extends BaseVendorClient {
  id: VendorId = 'cj';
  label = 'CJ Dropshipping';
  requiredEnv = ['CJ_API_KEY', 'CJ_ACCESS_TOKEN'];
  baseUrl = 'https://developers.cjdropshipping.com/api2.0/v1';

  protected headers() {
    return {
      'CJ-Access-Token': process.env.CJ_ACCESS_TOKEN ?? '',
      Authorization: `Bearer ${process.env.CJ_ACCESS_TOKEN ?? ''}`,
    };
  }

  protected async remoteSearch(query: string, limit: number) {
    const body = await this.get(`/product/list?productName=${encodeURIComponent(query)}&pageNum=1&pageSize=${limit}`) as Json;
    const products = body.data?.list ?? body.data ?? [];
    return (Array.isArray(products) ? products : []).slice(0, limit).map((item: Json, index: number) => remoteCandidate('cj', item, query, index));
  }

  protected async remoteCreateDraftOrder(input: { external_order_id: string; items: Array<{ supplier_sku: string; quantity: number }>; shipping_address?: unknown }) {
    const body = await this.post('/shopping/order/createOrder', {
      orderNumber: input.external_order_id,
      products: input.items.map((item) => ({ sku: item.supplier_sku, quantity: item.quantity })),
      shippingAddress: input.shipping_address ?? {},
    }) as Json;
    return { vendor_order_id: String(body.data?.orderId ?? body.data ?? `cj_${Date.now()}`), status: 'draft_created' };
  }

  protected async remoteSubmitOrder(vendorOrderId: string, source: VendorMode) {
    // Honest status: CJ order confirmation/payment is a separate provider call not yet wired, so we
    // never claim a fabricated "submitted". The order is created; confirmation stays pending.
    return {
      vendor_order_id: vendorOrderId,
      status: process.env.CJ_SANDBOX === 'true' ? 'sandbox_submission_gated' : 'submission_pending_provider_confirm',
      source,
    };
  }

  protected async remoteCancelOrder(vendorOrderId: string, source: VendorMode) {
    return { vendor_order_id: vendorOrderId, status: 'cancel_requested', source };
  }

  protected async remoteGetTracking(vendorOrderId: string, source: VendorMode) {
    return { vendor_order_id: vendorOrderId, status: 'tracking_pending', source };
  }
}

/**
 * Spocket — SaaS dropship bridge (US/EU + global suppliers). Catalog/inventory read is API-driven;
 * order placement is typically managed inside Spocket, so submitOrder reports a bridge-managed status
 * (honest) unless a direct order endpoint is configured. Gated + fixture-safe until SPOCKET_API_KEY set.
 */
export class SpocketClient extends BaseVendorClient {
  id: VendorId = 'spocket';
  label = 'Spocket';
  requiredEnv = ['SPOCKET_API_KEY'];
  baseUrl = process.env.SPOCKET_API_URL || 'https://api.spocket.co/api/v1';

  protected headers() {
    return { Authorization: `Bearer ${process.env.SPOCKET_API_KEY ?? ''}` };
  }

  protected async remoteSearch(query: string, limit: number) {
    const body = (await this.get(`/search/products?search=${encodeURIComponent(query)}&per_page=${limit}`)) as Json;
    const products = Array.isArray(body.data) ? body.data : Array.isArray(body.products) ? body.products : [];
    return products.slice(0, limit).map((item: Json, index: number) => remoteCandidate('spocket', item, query, index));
  }

  protected async remoteCreateDraftOrder(input: { external_order_id: string; items: Array<{ supplier_sku: string; quantity: number }>; shipping_address?: unknown }) {
    const body = (await this.post('/orders', {
      external_id: input.external_order_id,
      line_items: input.items.map((item) => ({ sku: item.supplier_sku, quantity: item.quantity })),
      shipping_address: input.shipping_address ?? {},
    })) as Json;
    return { vendor_order_id: String(body.id ?? body.order_id ?? `spocket_${Date.now()}`), status: 'draft_created' };
  }

  protected async remoteSubmitOrder(vendorOrderId: string, source: VendorMode) {
    // Spocket order processing is completed inside the Spocket dashboard for most plans.
    return { vendor_order_id: vendorOrderId, status: 'bridge_managed_in_spocket', source };
  }

  protected async remoteCancelOrder(vendorOrderId: string, source: VendorMode) {
    return { vendor_order_id: vendorOrderId, status: 'cancel_requested', source };
  }

  protected async remoteGetTracking(vendorOrderId: string, source: VendorMode) {
    const body = (await this.get(`/orders/${vendorOrderId}`).catch(() => ({}))) as Json;
    return {
      vendor_order_id: vendorOrderId,
      tracking_number: body.tracking_number ?? body.tracking?.number,
      tracking_url: body.tracking_url ?? body.tracking?.url,
      status: body.status ?? 'tracking_pending',
      source,
    };
  }
}

/**
 * Syncee — SaaS dropship bridge with a large Alibaba-backed catalog (the cleanest Alibaba automation
 * route, since pure-OSS Alibaba ordering doesn't exist). Catalog/inventory read is API-driven; order
 * placement is bridge-managed. Gated + fixture-safe until SYNCEE_API_KEY set.
 */
export class SynceeClient extends BaseVendorClient {
  id: VendorId = 'syncee';
  label = 'Syncee (Alibaba-backed)';
  requiredEnv = ['SYNCEE_API_KEY'];
  baseUrl = process.env.SYNCEE_API_URL || 'https://api.syncee.com/v2';

  protected headers() {
    return { Authorization: `Bearer ${process.env.SYNCEE_API_KEY ?? ''}`, 'X-Api-Key': process.env.SYNCEE_API_KEY ?? '' };
  }

  protected async remoteSearch(query: string, limit: number) {
    const body = (await this.get(`/products?search=${encodeURIComponent(query)}&limit=${limit}`)) as Json;
    const products = body.data?.products ?? body.products ?? body.data ?? [];
    return (Array.isArray(products) ? products : []).slice(0, limit).map((item: Json, index: number) => remoteCandidate('syncee', item, query, index));
  }

  protected async remoteCreateDraftOrder(input: { external_order_id: string; items: Array<{ supplier_sku: string; quantity: number }>; shipping_address?: unknown }) {
    const body = (await this.post('/orders', {
      reference: input.external_order_id,
      items: input.items.map((item) => ({ sku: item.supplier_sku, qty: item.quantity })),
      shipping: input.shipping_address ?? {},
    })) as Json;
    return { vendor_order_id: String(body.id ?? body.order_id ?? `syncee_${Date.now()}`), status: 'draft_created' };
  }

  protected async remoteSubmitOrder(vendorOrderId: string, source: VendorMode) {
    return { vendor_order_id: vendorOrderId, status: 'bridge_managed_in_syncee', source };
  }

  protected async remoteCancelOrder(vendorOrderId: string, source: VendorMode) {
    return { vendor_order_id: vendorOrderId, status: 'cancel_requested', source };
  }

  protected async remoteGetTracking(vendorOrderId: string, source: VendorMode) {
    const body = (await this.get(`/orders/${vendorOrderId}`).catch(() => ({}))) as Json;
    return {
      vendor_order_id: vendorOrderId,
      tracking_number: body.tracking_number,
      tracking_url: body.tracking_url,
      status: body.status ?? 'tracking_pending',
      source,
    };
  }
}

/** Modalyst — SaaS dropship bridge (US/EU + AliExpress). Same gated, fixture-safe pattern. */
export class ModalystClient extends BaseVendorClient {
  id: VendorId = 'modalyst';
  label = 'Modalyst';
  requiredEnv = ['MODALYST_API_KEY'];
  baseUrl = process.env.MODALYST_API_URL || 'https://api.modalyst.co/v1';

  protected headers() {
    return { Authorization: `Bearer ${process.env.MODALYST_API_KEY ?? ''}` };
  }

  protected async remoteSearch(query: string, limit: number) {
    const body = (await this.get(`/products?search=${encodeURIComponent(query)}&limit=${limit}`)) as Json;
    const products = Array.isArray(body.results) ? body.results : Array.isArray(body.data) ? body.data : [];
    return products.slice(0, limit).map((item: Json, index: number) => remoteCandidate('modalyst', item, query, index));
  }

  protected async remoteCreateDraftOrder(input: { external_order_id: string; items: Array<{ supplier_sku: string; quantity: number }>; shipping_address?: unknown }) {
    const body = (await this.post('/orders', {
      external_id: input.external_order_id,
      items: input.items.map((item) => ({ sku: item.supplier_sku, quantity: item.quantity })),
      shipping_address: input.shipping_address ?? {},
    })) as Json;
    return { vendor_order_id: String(body.id ?? `modalyst_${Date.now()}`), status: 'draft_created' };
  }

  protected async remoteSubmitOrder(vendorOrderId: string, source: VendorMode) {
    return { vendor_order_id: vendorOrderId, status: 'bridge_managed_in_modalyst', source };
  }

  protected async remoteCancelOrder(vendorOrderId: string, source: VendorMode) {
    return { vendor_order_id: vendorOrderId, status: 'cancel_requested', source };
  }

  protected async remoteGetTracking(vendorOrderId: string, source: VendorMode) {
    const body = (await this.get(`/orders/${vendorOrderId}`).catch(() => ({}))) as Json;
    return { vendor_order_id: vendorOrderId, tracking_number: body.tracking_number, tracking_url: body.tracking_url, status: body.status ?? 'tracking_pending', source };
  }
}

/** Dropified — multi-supplier order-automation bridge. Same gated, fixture-safe pattern. */
export class DropifiedClient extends BaseVendorClient {
  id: VendorId = 'dropified';
  label = 'Dropified';
  requiredEnv = ['DROPIFIED_API_KEY'];
  baseUrl = process.env.DROPIFIED_API_URL || 'https://api.dropified.com/api';

  protected headers() {
    return { Authorization: `Token ${process.env.DROPIFIED_API_KEY ?? ''}` };
  }

  protected async remoteSearch(query: string, limit: number) {
    const body = (await this.get(`/products?title=${encodeURIComponent(query)}&limit=${limit}`)) as Json;
    const products = Array.isArray(body.products) ? body.products : Array.isArray(body.data) ? body.data : [];
    return products.slice(0, limit).map((item: Json, index: number) => remoteCandidate('dropified', item, query, index));
  }

  protected async remoteCreateDraftOrder(input: { external_order_id: string; items: Array<{ supplier_sku: string; quantity: number }>; shipping_address?: unknown }) {
    const body = (await this.post('/orders/place', {
      reference: input.external_order_id,
      line_items: input.items.map((item) => ({ sku: item.supplier_sku, quantity: item.quantity })),
      shipping_address: input.shipping_address ?? {},
    })) as Json;
    return { vendor_order_id: String(body.id ?? body.order_id ?? `dropified_${Date.now()}`), status: 'draft_created' };
  }

  protected async remoteSubmitOrder(vendorOrderId: string, source: VendorMode) {
    return { vendor_order_id: vendorOrderId, status: 'bridge_managed_in_dropified', source };
  }

  protected async remoteCancelOrder(vendorOrderId: string, source: VendorMode) {
    return { vendor_order_id: vendorOrderId, status: 'cancel_requested', source };
  }

  protected async remoteGetTracking(vendorOrderId: string, source: VendorMode) {
    const body = (await this.get(`/orders/${vendorOrderId}`).catch(() => ({}))) as Json;
    return { vendor_order_id: vendorOrderId, tracking_number: body.tracking_number, tracking_url: body.tracking_url, status: body.status ?? 'tracking_pending', source };
  }
}

export class ManualSupplierClient extends BaseVendorClient {
  id: VendorId = 'manual';
  label = 'Manual Supplier Intake';
  requiredEnv: string[] = [];
  baseUrl = 'manual://supplier';

  async healthCheck(): Promise<VendorConnection> {
    const verified = process.env.MANUAL_SUPPLIER_VERIFIED === 'true';
    return {
      id: this.id,
      label: this.label,
      mode: verified ? 'sandbox' : 'fixture',
      connected: verified,
      can_publish: verified && process.env.AUTO_PUBLISH_APPROVED !== 'false',
      can_submit_orders: false,
      last_checked_at: new Date().toISOString(),
      missing_env: verified ? [] : ['MANUAL_SUPPLIER_VERIFIED'],
      message: verified
        ? 'Manual supplier intake is founder-verified; order submission still requires founder approval.'
        : 'Manual supplier intake is fixture-backed until a vetted supplier CSV/API is approved.',
    };
  }

  protected headers() {
    return {};
  }

  protected async remoteSearch(_query: string, limit: number) {
    return fixtureCandidates('manual').slice(0, limit);
  }

  protected async remoteCreateDraftOrder() {
    return { vendor_order_id: `manual_${Date.now()}`, status: 'manual_staged' };
  }

  protected async remoteSubmitOrder(vendorOrderId: string, source: VendorMode) {
    return { vendor_order_id: vendorOrderId, status: 'manual_submission_requires_founder', source };
  }

  protected async remoteCancelOrder(vendorOrderId: string, source: VendorMode) {
    return { vendor_order_id: vendorOrderId, status: 'manual_cancel_staged', source };
  }

  protected async remoteGetTracking(vendorOrderId: string, source: VendorMode) {
    return { vendor_order_id: vendorOrderId, status: 'manual_tracking_pending', source };
  }
}

export function vendorClient(id: VendorId): VendorConnector {
  switch (id) {
    case 'printify':
      return new PrintifyClient();
    case 'printful':
      return new PrintfulClient();
    case 'cj':
      return new CjClient();
    case 'spocket':
      return new SpocketClient();
    case 'syncee':
      return new SynceeClient();
    case 'modalyst':
      return new ModalystClient();
    case 'dropified':
      return new DropifiedClient();
    case 'manual':
    case 'radar':
    default:
      return new ManualSupplierClient();
  }
}

export function allVendorClients(): VendorConnector[] {
  return [
    vendorClient('printify'),
    vendorClient('printful'),
    vendorClient('cj'),
    vendorClient('spocket'),
    vendorClient('syncee'),
    vendorClient('modalyst'),
    vendorClient('dropified'),
    vendorClient('manual'),
  ];
}

function remoteCandidate(vendor: VendorId, item: Json, query: string, index: number): ProductCandidate {
  const id = String(item.id ?? item.productId ?? item.pid ?? `${vendor}_${index}`);
  const title = String(item.title ?? item.name ?? item.productName ?? `${query} candidate ${index + 1}`);
  const costCents = cents(item.cost ?? item.price ?? item.suggestedPrice ?? 1800);
  const retailCents = Math.max(cents(item.retail_price ?? item.retailPrice ?? item.price ?? 4900), Math.round(costCents / 0.55));
  const ts = new Date().toISOString();
  return {
    id: `${vendor}-${id}`,
    vendor,
    supplier_id: `${vendor}-api`,
    supplier_name: `${vendor.toUpperCase()} API`,
    supplier_sku: String(item.sku ?? item.variant_id ?? item.productSku ?? id),
    title,
    description: String(item.description ?? item.short_description ?? `Vendor-provided ${title} candidate.`),
    handle: slug(`${vendor}-${title}-${id}`),
    category: String(item.category ?? item.type ?? 'vendor catalog'),
    category_tree: ['vendor catalog'],
    chapter: 'signal',
    source_url: item.url,
    image_url: imageUrl(item),
    media_rights: 'supplier_license',
    brand_risk: 'medium',
    quality_risk: 'unknown',
    counterfeit_risk: 'low',
    recalled_risk: 'low',
    regulated_risk: 'low',
    supplier_reliability: 74,
    demand_score: 68,
    brand_fit_score: 68,
    novelty_score: 60,
    return_risk_score: 40,
    lead_time_days: Number(process.env.MAX_SHIPPING_DAYS ?? 12),
    warehouse_region: vendor === 'cj' ? 'CJ warehouse' : 'Provider network',
    cost_cents: costCents,
    retail_cents: retailCents,
    stock: Number(item.stock ?? item.quantity ?? 50),
    variants: [
      {
        sku: String(item.sku ?? item.variant_id ?? id),
        title: 'Default',
        supplier_sku: String(item.sku ?? item.variant_id ?? item.productSku ?? id),
        option_values: { Default: 'Default' },
        cost_cents: costCents,
        retail_cents: retailCents,
        stock: Number(item.stock ?? item.quantity ?? 50),
      },
    ],
    reasons: ['Imported from configured provider API', 'Requires founder review before publish'],
    created_at: ts,
    updated_at: ts,
    status: 'ingested',
  };
}

function cents(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return n > 1000 ? Math.round(n) : Math.round(n * 100);
}

function imageUrl(item: Json) {
  return item.thumbnail_url ?? item.thumbnail ?? item.image ?? item.imageUrl ?? item.images?.[0]?.src ?? item.images?.[0] ?? item.productImage;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 90);
}

async function requestJson(url: string, init: RequestInit = {}, attempt = 0): Promise<unknown> {
  const res = await fetch(url, init);
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
    throw new Error(`Vendor request failed ${res.status}${retryAfter ? ` retry-after=${retryAfter}` : ''}: ${JSON.stringify(body).slice(0, 240)}`);
  }
  return body;
}
