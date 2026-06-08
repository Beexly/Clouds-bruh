import type { VendorId } from '@alterxiv/shared';
import { ensureLumeraTables, pool, bestConfiguredVendor } from './lumera-db';

type OrderItemLike = {
  product_id?: string;
  variant_id?: string;
  quantity?: number;
  unit_price?: number;
  metadata?: Record<string, any>;
};

type OrderLike = {
  id: string;
  metadata?: Record<string, any>;
  items?: OrderItemLike[];
};

export type VendorOrderStatus =
  | 'blocked_missing_supplier_sku'
  | 'ready_for_vendor_submission'
  | 'staged_for_approval';

export type VendorOrderDraft = {
  id: string;
  order_id: string;
  vendor: VendorId;
  vendor_order_id: string | null;
  status: VendorOrderStatus;
  payload: {
    source: 'order.placed';
    external_order_id: string;
    live_mode: boolean;
    auto_submit_vendor_orders: boolean;
    delay_consent_required_after_days: number;
    blockers: string[];
    items: Array<{
      product_id?: string;
      variant_id?: string;
      quantity: number;
      unit_price: number;
      supplier_sku?: string;
    }>;
  };
};

const allowedVendors = new Set<VendorId>(['printify', 'printful', 'cj', 'spocket', 'syncee', 'manual', 'radar']);

export function vendorOrderDraftsFromOrder(order: OrderLike): VendorOrderDraft[] {
  const liveMode = process.env.VENDOR_LIVE_MODE === 'true';
  const autoSubmit = process.env.AUTO_SUBMIT_VENDOR_ORDERS === 'true';
  const grouped = new Map<VendorId, OrderItemLike[]>();

  for (const item of order.items ?? []) {
    const vendor = vendorForItem(item, order);
    grouped.set(vendor, [...(grouped.get(vendor) ?? []), item]);
  }

  return Array.from(grouped.entries()).map(([vendor, items]) => {
    const normalizedItems = items.map((item) => ({
      product_id: item.product_id,
      variant_id: item.variant_id,
      quantity: Number(item.quantity ?? 1),
      unit_price: Number(item.unit_price ?? 0),
      supplier_sku: item.metadata?.supplier_sku ?? item.metadata?.supplierSku,
    }));
    const blockers = normalizedItems.some((item) => !item.supplier_sku) ? ['missing_supplier_sku'] : [];
    const status: VendorOrderStatus = blockers.length
      ? 'blocked_missing_supplier_sku'
      : liveMode && autoSubmit
        ? 'ready_for_vendor_submission'
        : 'staged_for_approval';
    const id = vendorOrderRecordId(order.id, vendor);

    return {
      id,
      order_id: order.id,
      vendor,
      vendor_order_id: null,
      status,
      payload: {
        source: 'order.placed',
        external_order_id: `${order.id}-${vendor}`,
        live_mode: liveMode,
        auto_submit_vendor_orders: autoSubmit,
        delay_consent_required_after_days: 30,
        blockers,
        items: normalizedItems,
      },
    };
  });
}

export async function persistVendorOrderDrafts(order: OrderLike) {
  await ensureLumeraTables();
  const drafts = vendorOrderDraftsFromOrder(order);
  for (const draft of drafts) {
    await pool().query(
      `INSERT INTO lumera_vendor_order (id, order_id, vendor, vendor_order_id, status, payload)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET
         vendor_order_id=EXCLUDED.vendor_order_id,
         status=EXCLUDED.status,
         payload=EXCLUDED.payload,
         updated_at=now()`,
      [
        draft.id,
        draft.order_id,
        draft.vendor,
        draft.vendor_order_id,
        draft.status,
        JSON.stringify(draft.payload),
      ]
    );
  }
  return drafts;
}

function vendorForItem(item: OrderItemLike, order: OrderLike): VendorId {
  const explicit =
    item.metadata?.fulfillment_provider ??
    item.metadata?.vendor ??
    item.metadata?.lumera_truth?.fulfillment_provider ??
    order.metadata?.fulfillment_provider;
  // Respect an explicit assignment (never silently re-route a SKU to a vendor that may not carry it).
  if (explicit) return normalizeVendor(explicit);
  // Unassigned items route to the best currently-connected vendor (falls back to 'manual').
  return bestConfiguredVendor();
}

function normalizeVendor(value: unknown): VendorId {
  const id = String(value ?? 'manual').toLowerCase() as VendorId;
  return allowedVendors.has(id) && id !== 'radar' ? id : 'manual';
}

function vendorOrderRecordId(orderId: string, vendor: VendorId) {
  return `lvo_${orderId}_${vendor}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}
