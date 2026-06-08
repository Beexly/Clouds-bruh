import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getLiveShippingRate, shippingRatesConfigured } from './shipping-rates';

describe('shipping-rates (gated, fixture-safe)', () => {
  let easypost: string | undefined;
  let shippo: string | undefined;

  beforeEach(() => {
    easypost = process.env.EASYPOST_API_KEY;
    shippo = process.env.SHIPPO_API_KEY;
    delete process.env.EASYPOST_API_KEY;
    delete process.env.SHIPPO_API_KEY;
  });
  afterEach(() => {
    if (easypost) process.env.EASYPOST_API_KEY = easypost; else delete process.env.EASYPOST_API_KEY;
    if (shippo) process.env.SHIPPO_API_KEY = shippo; else delete process.env.SHIPPO_API_KEY;
    vi.restoreAllMocks();
  });

  it('shippingRatesConfigured() is false with no carrier keys', () => {
    expect(shippingRatesConfigured()).toBe(false);
  });

  it('shippingRatesConfigured() is true with EasyPost or Shippo key', () => {
    process.env.EASYPOST_API_KEY = 'ep_test';
    expect(shippingRatesConfigured()).toBe(true);
    delete process.env.EASYPOST_API_KEY;
    process.env.SHIPPO_API_KEY = 'sh_test';
    expect(shippingRatesConfigured()).toBe(true);
  });

  it('getLiveShippingRate() returns null and makes NO network call when unconfigured', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const rate = await getLiveShippingRate({
      to_country: 'US',
      to_postal: '10001',
      items: [{ quantity: 2 }],
    });
    expect(rate).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('getLiveShippingRate() returns null (never throws) when a carrier call fails', async () => {
    process.env.EASYPOST_API_KEY = 'ep_test';
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));
    const rate = await getLiveShippingRate({ to_country: 'US', to_postal: '10001' });
    expect(rate).toBeNull();
  });

  it('getLiveShippingRate() picks the lowest EasyPost rate', async () => {
    process.env.EASYPOST_API_KEY = 'ep_test';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          rates: [
            { rate: '12.50', currency: 'USD', carrier: 'UPS', service: 'Ground', delivery_days: 5 },
            { rate: '7.99', currency: 'usd', carrier: 'USPS', service: 'Priority', delivery_days: 3 },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    const rate = await getLiveShippingRate({ to_country: 'US', to_postal: '10001', items: [{ quantity: 1 }] });
    expect(rate).toEqual({
      amount_cents: 799,
      currency: 'USD',
      carrier: 'USPS',
      service: 'Priority',
      est_days: 3,
    });
  });

  it('getLiveShippingRate() picks the lowest Shippo rate when only Shippo is configured', async () => {
    process.env.SHIPPO_API_KEY = 'sh_test';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          rates: [
            { amount: '9.20', currency: 'USD', provider: 'FedEx', servicelevel: { name: 'Home' }, estimated_days: 4 },
            { amount: '5.10', currency: 'USD', provider: 'USPS', servicelevel: { name: 'First' }, estimated_days: 2 },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    const rate = await getLiveShippingRate({ to_country: 'US', to_postal: '10001' });
    expect(rate?.amount_cents).toBe(510);
    expect(rate?.carrier).toBe('USPS');
    expect(rate?.service).toBe('First');
    expect(rate?.est_days).toBe(2);
  });

  it('getLiveShippingRate() returns null when the carrier responds non-OK', async () => {
    process.env.EASYPOST_API_KEY = 'ep_test';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('forbidden', { status: 401 }));
    const rate = await getLiveShippingRate({ to_country: 'US', to_postal: '10001' });
    expect(rate).toBeNull();
  });
});
