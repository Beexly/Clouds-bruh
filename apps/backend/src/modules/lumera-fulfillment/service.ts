import { AbstractFulfillmentProviderService } from '@medusajs/framework/utils';
import type { Logger, CalculatedShippingOptionPrice } from '@medusajs/framework/types';
import { vendorOrderDraftsFromOrder, persistVendorOrderDrafts } from '../../lib/lumera-order-routing';
import { createReturnCase, ensureLumeraTables, pool } from '../../lib/lumera-db';
import { getLiveShippingRate, shippingRatesConfigured } from '../../lib/shipping-rates';

type InjectedDependencies = { logger?: Logger };
type LumeraFulfillmentOptions = Record<string, unknown>;

/**
 * Lumera dropship fulfillment provider — makes vendor routing native to Medusa's order lifecycle.
 *
 * When Medusa creates a fulfillment for an order using this provider, we stage a vendor order per
 * supplier (reusing the same gated routing the order.placed subscriber uses, keyed idempotently by
 * order+vendor). Live submission stays gated behind VENDOR_LIVE_MODE + AUTO_SUBMIT_VENDOR_ORDERS —
 * this provider never moves money or submits a supplier order on its own.
 *
 * Provider id resolves to `lumera_dropship` (identifier `lumera`, config id `dropship`).
 */
export class LumeraDropshipFulfillmentService extends AbstractFulfillmentProviderService {
  static identifier = 'lumera';
  protected logger_?: Logger;
  protected options_?: LumeraFulfillmentOptions;

  constructor({ logger }: InjectedDependencies = {}, options: LumeraFulfillmentOptions = {}) {
    super();
    this.logger_ = logger;
    this.options_ = options;
  }

  async getFulfillmentOptions() {
    return [{ id: 'lumera-dropship' }, { id: 'lumera-dropship-return', is_return: true }];
  }

  async validateFulfillmentData(_optionData: Record<string, unknown>, data: Record<string, unknown>) {
    return data;
  }

  async validateOption() {
    return true;
  }

  async canCalculate() {
    // Dynamic carrier rating is available only when a live shipping-rate provider (EasyPost/Shippo)
    // is configured. With no carrier creds this returns false so the shipping option stays flat-rate
    // and nothing reaches a live carrier API.
    return shippingRatesConfigured();
  }

  /**
   * Calculate a shipping price by deriving a destination from the cart context / shipping-method data,
   * then asking the configured carrier (EasyPost/Shippo) for the cheapest live rate. Returns the
   * Medusa `CalculatedShippingOptionPrice` shape. `calculated_amount` is in **integer cents** — the
   * Lumera convention used across the catalog/cart/storefront (which divides by 100 for display).
   *
   * Resilient by design: if no carrier is configured, the lookup fails, or no rate is returned, this
   * falls back to a flat amount (LUMERA_FLAT_SHIPPING_USD dollars → cents, default 0) and NEVER throws —
   * checkout must not break because a carrier API is down.
   */
  async calculatePrice(
    _optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<CalculatedShippingOptionPrice> {
    const fallbackCents = Math.round((Number(process.env.LUMERA_FLAT_SHIPPING_USD ?? 0) || 0) * 100);
    const fallback: CalculatedShippingOptionPrice = {
      calculated_amount: fallbackCents,
      is_calculated_price_tax_inclusive: false,
    };

    try {
      const dest = deriveDestination(data, context);
      const rate = await getLiveShippingRate({
        to_country: dest.country,
        to_postal: dest.postal,
        items: dest.items,
      });
      if (!rate) return fallback;
      return {
        calculated_amount: rate.amount_cents, // integer cents (Lumera convention; storefront ÷100 for display)
        is_calculated_price_tax_inclusive: false,
      };
    } catch (e) {
      this.logger_?.warn?.(`[lumera-dropship] shipping rate calc fell back: ${(e as Error).message?.slice(0, 80)}`);
      return fallback;
    }
  }

  /**
   * Compute the per-vendor staging decision for a fulfillment's items. Pure (no I/O) so it is
   * unit-testable without a database.
   */
  stageDecision(order: { id: string; metadata?: Record<string, any>; items: any[] }) {
    return vendorOrderDraftsFromOrder(order);
  }

  async createFulfillment(
    _data: Record<string, unknown>,
    items: any[],
    order: any,
    fulfillment: any
  ) {
    const orderLike = {
      id: String(order?.id ?? fulfillment?.order_id ?? fulfillment?.id ?? `ful_${Date.now()}`),
      metadata: order?.metadata ?? {},
      items: (items ?? []).map((it: any) => ({
        product_id: it?.line_item?.product_id ?? it?.product_id,
        variant_id: it?.line_item?.variant_id ?? it?.variant_id,
        quantity: Number(it?.quantity ?? 1),
        unit_price: Number(it?.line_item?.unit_price ?? it?.unit_price ?? 0),
        metadata: it?.line_item?.metadata ?? it?.metadata ?? {},
      })),
    };

    // Compute the routing decision (pure), then best-effort persist when a DB is available.
    const drafts = this.stageDecision(orderLike);
    if (process.env.DATABASE_URL) {
      await persistVendorOrderDrafts(orderLike).catch((e: Error) =>
        this.logger_?.warn?.(`[lumera-dropship] vendor order staging deferred: ${e.message?.slice(0, 80)}`)
      );
    }

    const liveSubmission = process.env.VENDOR_LIVE_MODE === 'true' && process.env.AUTO_SUBMIT_VENDOR_ORDERS === 'true';
    return {
      data: {
        lumera: true,
        order_id: orderLike.id,
        staged_vendor_orders: drafts.map((d) => ({ id: d.id, vendor: d.vendor, status: d.status })),
        live_submission_gated: !liveSubmission,
      },
      labels: [],
    };
  }

  async cancelFulfillment(data: Record<string, unknown>) {
    const staged = ((data as any)?.staged_vendor_orders ?? []) as Array<{ id: string }>;
    if (process.env.DATABASE_URL && staged.length) {
      try {
        await ensureLumeraTables();
        for (const s of staged) {
          await pool()
            .query(`UPDATE lumera_vendor_order SET status='cancelled', updated_at=now() WHERE id=$1`, [s.id])
            .catch(() => {});
        }
      } catch (e) {
        this.logger_?.warn?.(`[lumera-dropship] cancel staging update skipped: ${(e as Error).message?.slice(0, 80)}`);
      }
    }
    return {};
  }

  async createReturnFulfillment(fulfillment: Record<string, unknown>) {
    const data = ((fulfillment as any)?.data ?? {}) as Record<string, any>;
    if (process.env.DATABASE_URL) {
      await createReturnCase({
        order_id: data.order_id,
        reason: 'return_fulfillment',
        payload: fulfillment,
      }).catch((e: Error) => this.logger_?.warn?.(`[lumera-dropship] return case deferred: ${e.message?.slice(0, 80)}`));
    }
    return { data: { lumera_return: true, order_id: data.order_id }, labels: [] };
  }
}

/**
 * Derive a shipping destination from the shipping-method `data` and the calculation `context`.
 * Pure (no I/O) so it is unit-testable. Medusa passes the cart's `shipping_address` and `items` in the
 * context; the frontend may also stash a `to_country`/`to_postal` on the method `data`. We read both,
 * preferring explicit `data` overrides, then the cart's shipping address.
 */
export function deriveDestination(
  data: Record<string, unknown> | undefined,
  context: Record<string, unknown> | undefined
): { country?: string; postal?: string; items: Array<{ quantity: number }> } {
  const d = (data ?? {}) as Record<string, any>;
  const ctx = (context ?? {}) as Record<string, any>;
  const addr = (ctx.shipping_address ?? {}) as Record<string, any>;

  const country = String(d.to_country ?? d.country_code ?? addr.country_code ?? '').toLowerCase() || undefined;
  const postal = String(d.to_postal ?? d.postal_code ?? addr.postal_code ?? '') || undefined;

  const rawItems = Array.isArray(ctx.items) ? ctx.items : [];
  const items = rawItems.map((it: any) => ({ quantity: Number(it?.quantity ?? 1) || 1 }));

  return { country, postal, items };
}

export default LumeraDropshipFulfillmentService;
