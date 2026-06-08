import { fixtureCandidates, type VendorConnection, type VendorId } from '@alterxiv/shared';
import { allVendorClients, vendorClient } from './clients';
export { allVendorClients, vendorClient } from './clients';

export interface SupplierQuote {
  vendor: VendorId;
  supplier_sku: string;
  price: number;
  stock: number;
  lead_time_days: number;
  source: VendorConnection['mode'];
  live_ready: boolean;
  message: string;
}

export function vendorConnections(): VendorConnection[] {
  const liveMode = process.env.VENDOR_LIVE_MODE === 'true';
  const autoSubmit = process.env.AUTO_SUBMIT_VENDOR_ORDERS === 'true';
  const radarConnected = Boolean(process.env.OXYLABS_USER || process.env.APIFY_TOKEN);
  const connections: VendorConnection[] = [
    ...allVendorClients().map((client) => syncHealth(client.id)),
    {
      id: 'radar',
      label: 'Radar Only',
      mode: radarConnected ? 'sandbox' : 'fixture',
      connected: radarConnected,
      can_publish: false,
      can_submit_orders: false,
      last_checked_at: new Date().toISOString(),
      missing_env: radarConnected ? [] : ['OXYLABS_USER or APIFY_TOKEN'],
      message: radarConnected ? 'Radar credentials configured.' : 'Radar is fixture-backed until search credentials are supplied.',
    },
  ];
  return connections.map((connection) => ({
    ...connection,
    can_submit_orders: connection.can_submit_orders && liveMode && autoSubmit,
  }));
}

export async function quoteSupplierSku(supplierSku: string, preferredVendor?: VendorId): Promise<SupplierQuote> {
  const client = vendorClient(preferredVendor ?? bestVendor());
  const connection = await client.healthCheck();
  const candidate =
    (await client.getProductDetails(supplierSku).catch(() => null)) ??
    fixtureCandidates(preferredVendor ?? bestVendor()).find((c) => c.supplier_sku === supplierSku || c.variants.some((v) => v.supplier_sku === supplierSku)) ??
    fixtureCandidates(preferredVendor ?? bestVendor())[0];
  const variant = candidate.variants.find((v) => v.supplier_sku === supplierSku) ?? candidate.variants[0];
  return {
    vendor: candidate.vendor,
    supplier_sku: supplierSku,
    price: (variant?.cost_cents ?? candidate.cost_cents) / 100,
    stock: variant?.stock ?? candidate.stock,
    lead_time_days: candidate.lead_time_days,
    source: connection.mode,
    live_ready: connection.connected && connection.can_submit_orders,
    message: connection.connected
      ? `${connection.label} quote path is configured; order submission remains gated.`
      : `${connection.label} quote path is fixture-backed until credentials are supplied.`,
  };
}

function bestVendor(): VendorId {
  return vendorConnections().find((v) => v.connected && v.id !== 'radar')?.id ?? 'manual';
}

function syncHealth(id: VendorId): VendorConnection {
  const liveMode = process.env.VENDOR_LIVE_MODE === 'true';
  const autoSubmit = process.env.AUTO_SUBMIT_VENDOR_ORDERS === 'true';
  const labels: Record<VendorId, string> = {
    printify: 'Printify',
    printful: 'Printful',
    cj: 'CJ Dropshipping',
    spocket: 'Spocket',
    syncee: 'Syncee (Alibaba-backed)',
    manual: 'Manual Supplier Intake',
    radar: 'Radar Only',
  };
  const required: Record<VendorId, string[]> = {
    printify: ['PRINTIFY_TOKEN', 'PRINTIFY_SHOP_ID'],
    printful: ['PRINTFUL_TOKEN', 'PRINTFUL_STORE_ID'],
    cj: ['CJ_API_KEY', 'CJ_ACCESS_TOKEN'],
    spocket: ['SPOCKET_API_KEY'],
    syncee: ['SYNCEE_API_KEY'],
    manual: [],
    radar: [],
  };
  const missing = required[id].filter((key) => !process.env[key]);
  const connected = id === 'manual' ? process.env.MANUAL_SUPPLIER_VERIFIED === 'true' : missing.length === 0;
  return {
    id,
    label: labels[id],
    mode: id === 'manual' ? (connected ? 'sandbox' : 'fixture') : connected ? (liveMode ? 'live' : 'sandbox') : 'missing_credentials',
    connected,
    can_publish: connected && id !== 'radar' && process.env.AUTO_PUBLISH_APPROVED !== 'false',
    can_submit_orders: id !== 'manual' && connected && liveMode && autoSubmit,
    last_checked_at: new Date().toISOString(),
    missing_env: missing,
    message: connected ? `${labels[id]} configured.` : `${labels[id]} missing ${missing.join(', ') || 'credentials'}.`,
  };
}
