import { AbstractFulfillmentProviderService } from '@medusajs/framework/utils';
import type { Logger } from '@medusajs/framework/types';
import { vendorOrderDraftsFromOrder, persistVendorOrderDrafts } from '../../lib/lumera-order-routing';
import { createReturnCase, ensureLumeraTables, pool } from '../../lib/lumera-db';

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
    // Flat-rate via the Medusa shipping option price; no dynamic carrier calculation.
    return false;
  }

  async calculatePrice(): Promise<never> {
    throw new Error('Lumera dropship uses flat-rate shipping options; price calculation is not supported.');
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

export default LumeraDropshipFulfillmentService;
