import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  LumeraPayPalProviderService,
  paypalBaseUrl,
  mapPayPalStatus,
  formatPayPalAmount,
  paypalWebhookAction,
} from './service';

describe('paypal pure helpers', () => {
  it('paypalBaseUrl() selects sandbox unless PAYPAL_ENV=live', () => {
    expect(paypalBaseUrl(undefined)).toBe('https://api-m.sandbox.paypal.com');
    expect(paypalBaseUrl('sandbox')).toBe('https://api-m.sandbox.paypal.com');
    expect(paypalBaseUrl('LIVE')).toBe('https://api-m.paypal.com');
    expect(paypalBaseUrl('live')).toBe('https://api-m.paypal.com');
    expect(paypalBaseUrl('anything')).toBe('https://api-m.sandbox.paypal.com');
  });

  it('mapPayPalStatus() maps PayPal order states to Medusa statuses', () => {
    expect(mapPayPalStatus('COMPLETED')).toBe('captured');
    expect(mapPayPalStatus('APPROVED')).toBe('authorized');
    expect(mapPayPalStatus('SAVED')).toBe('authorized');
    expect(mapPayPalStatus('VOIDED')).toBe('canceled');
    expect(mapPayPalStatus('PAYER_ACTION_REQUIRED')).toBe('requires_more');
    expect(mapPayPalStatus('CREATED')).toBe('pending');
    expect(mapPayPalStatus(undefined)).toBe('pending');
    expect(mapPayPalStatus('???')).toBe('pending');
  });

  it('formatPayPalAmount() converts integer cents → a 2-decimal dollar string', () => {
    expect(formatPayPalAmount(9900)).toBe('99.00'); // 9900 cents → $99.00
    expect(formatPayPalAmount(750)).toBe('7.50');
    expect(formatPayPalAmount(1)).toBe('0.01');
    expect(formatPayPalAmount(0)).toBe('0.00');
    expect(formatPayPalAmount(undefined)).toBe('0.00');
    expect(formatPayPalAmount(NaN)).toBe('0.00');
    expect(formatPayPalAmount(-5)).toBe('0.00');
  });

  it('paypalWebhookAction() maps webhook events to Medusa actions', () => {
    expect(
      paypalWebhookAction({ event_type: 'CHECKOUT.ORDER.APPROVED', resource: { id: 'o1', amount: { value: '10.00' } } })
    ).toEqual({ action: 'authorized', data: { session_id: 'o1', amount: 10 } });

    expect(
      paypalWebhookAction({ event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: { id: 'c1', amount: { value: '5.25' } } })
    ).toEqual({ action: 'captured', data: { session_id: 'c1', amount: 5.25 } });

    expect(paypalWebhookAction({ event_type: 'PAYMENT.CAPTURE.DENIED', resource: { id: 'c2' } }).action).toBe('failed');
    expect(paypalWebhookAction({ event_type: 'CHECKOUT.ORDER.VOIDED', resource: { id: 'o3' } }).action).toBe('canceled');
    expect(paypalWebhookAction({ event_type: 'SOMETHING.ELSE' }).action).toBe('not_supported');
  });
});

describe('LumeraPayPalProviderService (gated, fixture-safe)', () => {
  let id: string | undefined;
  let secret: string | undefined;
  let env: string | undefined;

  beforeEach(() => {
    id = process.env.PAYPAL_CLIENT_ID;
    secret = process.env.PAYPAL_CLIENT_SECRET;
    env = process.env.PAYPAL_ENV;
    delete process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_SECRET;
    delete process.env.PAYPAL_ENV;
  });
  afterEach(() => {
    if (id) process.env.PAYPAL_CLIENT_ID = id; else delete process.env.PAYPAL_CLIENT_ID;
    if (secret) process.env.PAYPAL_CLIENT_SECRET = secret; else delete process.env.PAYPAL_CLIENT_SECRET;
    if (env) process.env.PAYPAL_ENV = env; else delete process.env.PAYPAL_ENV;
    vi.restoreAllMocks();
  });

  // Construct via `new` directly (AbstractPaymentProvider's constructor is protected, so cast).
  const svc = () => new (LumeraPayPalProviderService as any)({}, {}) as LumeraPayPalProviderService;

  it('has the paypal identifier', () => {
    expect(LumeraPayPalProviderService.identifier).toBe('paypal');
  });

  it('constructs without creds and makes NO network call at construction', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const provider = svc();
    expect(provider).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('baseUrl() reflects PAYPAL_ENV', () => {
    expect(svc().baseUrl()).toBe('https://api-m.sandbox.paypal.com');
    process.env.PAYPAL_ENV = 'live';
    expect(svc().baseUrl()).toBe('https://api-m.paypal.com');
  });

  it('initiatePayment() returns a pending fixture session without network when unconfigured', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const out = await svc().initiatePayment({ amount: 25, currency_code: 'usd' } as any);
    expect(out.status).toBe('pending');
    expect(out.id).toMatch(/^paypal_local_/);
    expect((out.data as any).gated).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('getPaymentStatus() returns pending from cached data without network when unconfigured', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const out = await svc().getPaymentStatus({ data: { id: 'o1', status: 'CREATED' } } as any);
    expect(out.status).toBe('pending');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('capturePayment()/refundPayment()/cancelPayment() do not throw or call network when unconfigured', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const provider = svc();
    await expect(provider.capturePayment({ data: { id: 'o1' } } as any)).resolves.toBeTruthy();
    await expect(provider.refundPayment({ data: { id: 'o1' }, amount: 5 } as any)).resolves.toBeTruthy();
    await expect(provider.cancelPayment({ data: { id: 'o1' } } as any)).resolves.toBeTruthy();
    await expect(provider.deletePayment({ data: { id: 'o1' } } as any)).resolves.toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('getWebhookActionAndData() delegates to the pure mapper', async () => {
    const out = await svc().getWebhookActionAndData({
      data: { event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: { id: 'c9', amount: { value: '3.00' } } },
      rawData: '',
      headers: {},
    } as any);
    expect(out.action).toBe('captured');
    expect(out.data?.session_id).toBe('c9');
  });
});
