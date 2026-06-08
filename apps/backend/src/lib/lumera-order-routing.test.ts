import { afterEach, describe, expect, it } from 'vitest';
import { vendorOrderDraftsFromOrder } from './lumera-order-routing';

const savedLiveMode = process.env.VENDOR_LIVE_MODE;
const savedAutoSubmit = process.env.AUTO_SUBMIT_VENDOR_ORDERS;

function restoreEnv() {
  if (savedLiveMode === undefined) delete process.env.VENDOR_LIVE_MODE;
  else process.env.VENDOR_LIVE_MODE = savedLiveMode;
  if (savedAutoSubmit === undefined) delete process.env.AUTO_SUBMIT_VENDOR_ORDERS;
  else process.env.AUTO_SUBMIT_VENDOR_ORDERS = savedAutoSubmit;
}

describe('lumera order routing', () => {
  afterEach(restoreEnv);

  it('groups paid order items by fulfillment vendor with deterministic record ids', () => {
    const drafts = vendorOrderDraftsFromOrder({
      id: 'order_123',
      items: [
        { product_id: 'prod_1', quantity: 2, metadata: { fulfillment_provider: 'printify', supplier_sku: 'sku_a' } },
        { product_id: 'prod_2', quantity: 1, metadata: { fulfillment_provider: 'printify', supplier_sku: 'sku_b' } },
        { product_id: 'prod_3', quantity: 1, metadata: { fulfillment_provider: 'printful', supplier_sku: 'sku_c' } },
      ],
    });

    expect(drafts).toHaveLength(2);
    expect(drafts.map((draft) => draft.id)).toEqual(['lvo_order_123_printify', 'lvo_order_123_printful']);
    expect(drafts[0]?.payload.items).toHaveLength(2);
    expect(drafts.every((draft) => draft.status === 'staged_for_approval')).toBe(true);
  });

  it('never marks vendor orders submitted without a provider acknowledgement', () => {
    process.env.VENDOR_LIVE_MODE = 'true';
    process.env.AUTO_SUBMIT_VENDOR_ORDERS = 'true';

    const [draft] = vendorOrderDraftsFromOrder({
      id: 'order_live',
      items: [{ metadata: { fulfillment_provider: 'cj', supplier_sku: 'cj_sku' } }],
    });

    expect(draft?.status).toBe('ready_for_vendor_submission');
    expect(draft?.vendor_order_id).toBeNull();
    expect(draft?.payload.live_mode).toBe(true);
    expect(draft?.payload.auto_submit_vendor_orders).toBe(true);
  });

  it('blocks vendor drafts that lack supplier sku evidence', () => {
    const [draft] = vendorOrderDraftsFromOrder({
      id: 'order_missing_sku',
      items: [{ metadata: { fulfillment_provider: 'printify' } }],
    });

    expect(draft?.status).toBe('blocked_missing_supplier_sku');
    expect(draft?.payload.blockers).toEqual(['missing_supplier_sku']);
  });
});
