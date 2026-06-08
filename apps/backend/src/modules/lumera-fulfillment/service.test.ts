import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LumeraDropshipFulfillmentService, deriveDestination } from './service';

describe('LumeraDropshipFulfillmentService', () => {
  let dbUrl: string | undefined;
  let live: string | undefined;
  let auto: string | undefined;
  let easypost: string | undefined;
  let shippo: string | undefined;

  beforeEach(() => {
    dbUrl = process.env.DATABASE_URL;
    live = process.env.VENDOR_LIVE_MODE;
    auto = process.env.AUTO_SUBMIT_VENDOR_ORDERS;
    easypost = process.env.EASYPOST_API_KEY;
    shippo = process.env.SHIPPO_API_KEY;
    // Ensure no DB so createFulfillment uses the pure path (no connection attempt).
    delete process.env.DATABASE_URL;
    delete process.env.VENDOR_LIVE_MODE;
    delete process.env.AUTO_SUBMIT_VENDOR_ORDERS;
    // Ensure no carrier creds so price calc takes the fixture-safe (no network) fallback path.
    delete process.env.EASYPOST_API_KEY;
    delete process.env.SHIPPO_API_KEY;
  });
  afterEach(() => {
    if (dbUrl) process.env.DATABASE_URL = dbUrl; else delete process.env.DATABASE_URL;
    if (live) process.env.VENDOR_LIVE_MODE = live; else delete process.env.VENDOR_LIVE_MODE;
    if (auto) process.env.AUTO_SUBMIT_VENDOR_ORDERS = auto; else delete process.env.AUTO_SUBMIT_VENDOR_ORDERS;
    if (easypost) process.env.EASYPOST_API_KEY = easypost; else delete process.env.EASYPOST_API_KEY;
    if (shippo) process.env.SHIPPO_API_KEY = shippo; else delete process.env.SHIPPO_API_KEY;
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

  it('canCalculate() is false when no carrier (EasyPost/Shippo) is configured', async () => {
    // creds are deleted in beforeEach
    expect(await svc().canCalculate()).toBe(false);
  });

  it('canCalculate() is true once a carrier key is present', async () => {
    process.env.EASYPOST_API_KEY = 'ep_test_key';
    expect(await svc().canCalculate()).toBe(true);
  });

  it('calculatePrice() does not throw and returns a flat fallback when unconfigured (no network)', async () => {
    const price = await svc().calculatePrice(
      {},
      { to_country: 'us', to_postal: '10001' },
      { items: [{ quantity: 2 }], shipping_address: { country_code: 'us', postal_code: '10001' } }
    );
    expect(price).toEqual({ calculated_amount: 0, is_calculated_price_tax_inclusive: false });
  });

  it('calculatePrice() honors LUMERA_FLAT_SHIPPING_USD as the fallback amount', async () => {
    process.env.LUMERA_FLAT_SHIPPING_USD = '7.5';
    try {
      const price = await svc().calculatePrice({}, {}, {});
      expect(price.calculated_amount).toBe(7.5);
      expect(price.is_calculated_price_tax_inclusive).toBe(false);
    } finally {
      delete process.env.LUMERA_FLAT_SHIPPING_USD;
    }
  });

  it('deriveDestination prefers method data, then falls back to the cart shipping address', () => {
    const fromData = deriveDestination(
      { to_country: 'CA', to_postal: 'M5V' },
      { shipping_address: { country_code: 'us', postal_code: '10001' }, items: [{ quantity: 3 }] }
    );
    expect(fromData).toEqual({ country: 'ca', postal: 'M5V', items: [{ quantity: 3 }] });

    const fromAddress = deriveDestination(
      {},
      { shipping_address: { country_code: 'GB', postal_code: 'SW1A' }, items: [] }
    );
    expect(fromAddress.country).toBe('gb');
    expect(fromAddress.postal).toBe('SW1A');
    expect(fromAddress.items).toEqual([]);
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
