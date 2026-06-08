import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LumeraDropshipFulfillmentService } from './service';

describe('LumeraDropshipFulfillmentService', () => {
  let dbUrl: string | undefined;
  let live: string | undefined;
  let auto: string | undefined;

  beforeEach(() => {
    dbUrl = process.env.DATABASE_URL;
    live = process.env.VENDOR_LIVE_MODE;
    auto = process.env.AUTO_SUBMIT_VENDOR_ORDERS;
    // Ensure no DB so createFulfillment uses the pure path (no connection attempt).
    delete process.env.DATABASE_URL;
    delete process.env.VENDOR_LIVE_MODE;
    delete process.env.AUTO_SUBMIT_VENDOR_ORDERS;
  });
  afterEach(() => {
    if (dbUrl) process.env.DATABASE_URL = dbUrl; else delete process.env.DATABASE_URL;
    if (live) process.env.VENDOR_LIVE_MODE = live; else delete process.env.VENDOR_LIVE_MODE;
    if (auto) process.env.AUTO_SUBMIT_VENDOR_ORDERS = auto; else delete process.env.AUTO_SUBMIT_VENDOR_ORDERS;
  });

  const svc = () => new LumeraDropshipFulfillmentService();

  it('has the lumera identifier (resolves to lumera_dropship)', () => {
    expect(LumeraDropshipFulfillmentService.identifier).toBe('lumera');
  });

  it('exposes a forward + return fulfillment option', async () => {
    const opts = await svc().getFulfillmentOptions();
    expect(opts.find((o: any) => o.id === 'lumera-dropship')).toBeTruthy();
    expect(opts.find((o: any) => o.is_return)).toBeTruthy();
  });

  it('does not support dynamic price calculation', async () => {
    expect(await svc().canCalculate()).toBe(false);
    await expect(svc().calculatePrice()).rejects.toThrow();
  });

  it('stages a vendor order per supplier and keeps live submission gated', async () => {
    const result = await svc().createFulfillment(
      {},
      [
        { line_item: { product_id: 'p1', variant_id: 'v1', unit_price: 4900, metadata: { supplier_sku: 'CJ-1', vendor: 'cj' } }, quantity: 1 },
        { line_item: { product_id: 'p2', variant_id: 'v2', unit_price: 3200, metadata: { supplier_sku: 'PF-1', vendor: 'printful' } }, quantity: 2 },
      ],
      { id: 'order_123', metadata: {} },
      { id: 'ful_1' }
    );
    expect((result.data as any).lumera).toBe(true);
    const staged = (result.data as any).staged_vendor_orders;
    expect(staged).toHaveLength(2);
    expect(staged.map((s: any) => s.vendor).sort()).toEqual(['cj', 'printful']);
    // No live flags → staged for approval, not auto-submitted; submission gated.
    expect(staged.every((s: any) => s.status === 'staged_for_approval')).toBe(true);
    expect((result.data as any).live_submission_gated).toBe(true);
  });

  it('flags items missing a supplier SKU instead of submitting blind', async () => {
    const result = await svc().createFulfillment(
      {},
      [{ line_item: { product_id: 'p1', variant_id: 'v1', unit_price: 4900, metadata: { vendor: 'cj' } }, quantity: 1 }],
      { id: 'order_456', metadata: {} },
      { id: 'ful_2' }
    );
    const staged = (result.data as any).staged_vendor_orders;
    expect(staged[0].status).toBe('blocked_missing_supplier_sku');
  });

  it('createReturnFulfillment returns a return result without throwing', async () => {
    const result = await svc().createReturnFulfillment({ data: { order_id: 'order_123' } });
    expect((result.data as any).lumera_return).toBe(true);
    expect(result.labels).toEqual([]);
  });
});
