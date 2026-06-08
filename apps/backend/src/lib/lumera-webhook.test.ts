import { describe, it, expect, afterEach } from 'vitest';
import crypto from 'node:crypto';
import { verifyVendorWebhook, verifyStripeWebhook } from './lumera-db';

const sign = (secret: string, payload: unknown) =>
  crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');

describe('verifyVendorWebhook (HMAC signature verification)', () => {
  afterEach(() => {
    delete process.env.PRINTIFY_WEBHOOK_SECRET;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it('accepts but marks unsigned when no secret is configured', () => {
    const res = verifyVendorWebhook('printify', { a: 1 }, {});
    expect(res.valid).toBe(true);
    expect(res.proof).toBe('unsigned_no_secret_configured');
  });

  it('verifies a correct HMAC signature', () => {
    process.env.PRINTIFY_WEBHOOK_SECRET = 'shh';
    const payload = { vendor_order_id: 'po_1', status: 'shipped' };
    const res = verifyVendorWebhook('printify', payload, { 'x-printify-hmac-sha256': sign('shh', payload) });
    expect(res.valid).toBe(true);
    expect(res.proof).toBe('hmac_sha256_verified');
  });

  it('accepts a sha256= prefixed signature', () => {
    process.env.PRINTIFY_WEBHOOK_SECRET = 'shh';
    const payload = { x: 'y' };
    const res = verifyVendorWebhook('printify', payload, { 'x-printify-hmac-sha256': `sha256=${sign('shh', payload)}` });
    expect(res.valid).toBe(true);
  });

  it('rejects a forged signature', () => {
    process.env.PRINTIFY_WEBHOOK_SECRET = 'shh';
    const res = verifyVendorWebhook('printify', { vendor_order_id: 'po_1' }, { 'x-printify-hmac-sha256': 'deadbeef' });
    expect(res.valid).toBe(false);
    expect(res.proof).toBe('signature_invalid');
  });

  it('rejects when the signature header is missing but a secret is set', () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec';
    const res = verifyVendorWebhook('stripe', { id: 'evt' }, {});
    expect(res.valid).toBe(false);
  });

  it('fails CLOSED in production when no secret is configured', () => {
    const prev = process.env.NODE_ENV;
    delete process.env.PRINTIFY_WEBHOOK_SECRET;
    try {
      (process.env as any).NODE_ENV = 'production';
      const res = verifyVendorWebhook('printify', { a: 1 }, {});
      expect(res.valid).toBe(false);
      expect(res.proof).toBe('missing_secret_in_production');
    } finally {
      (process.env as any).NODE_ENV = prev;
    }
  });

  it('verifies over the RAW body bytes when provided (not the re-serialized JSON)', () => {
    process.env.PRINTIFY_WEBHOOK_SECRET = 'shh';
    // Odd whitespace so JSON.stringify(JSON.parse(raw)) would differ from the original bytes.
    const raw = '{"vendor_order_id":"po_1",   "status":"shipped"}';
    const sig = crypto.createHmac('sha256', 'shh').update(raw).digest('hex');
    const overRaw = verifyVendorWebhook('printify', JSON.parse(raw), { 'x-printify-hmac-sha256': sig }, raw);
    expect(overRaw.valid).toBe(true);
    // Without the raw body, the re-serialized JSON won't match the signature over the original bytes.
    const overJson = verifyVendorWebhook('printify', JSON.parse(raw), { 'x-printify-hmac-sha256': sig });
    expect(overJson.valid).toBe(false);
  });
});

describe('verifyStripeWebhook (Stripe t,v1 scheme over raw body)', () => {
  const secret = 'whsec_test';
  const raw = JSON.stringify({ id: 'evt_1', type: 'payment_intent.succeeded' });
  const stripeSig = (t: number, body: string, key = secret) =>
    `t=${t},v1=${crypto.createHmac('sha256', key).update(`${t}.${body}`).digest('hex')}`;

  it('accepts a correctly signed, in-tolerance payload', () => {
    const t = Math.floor(Date.now() / 1000);
    const res = verifyStripeWebhook(raw, stripeSig(t, raw), secret);
    expect(res.valid).toBe(true);
    expect(res.proof).toBe('stripe_signature_verified');
  });

  it('rejects a stale timestamp outside tolerance', () => {
    const t = Math.floor(Date.now() / 1000) - 10_000;
    const res = verifyStripeWebhook(raw, stripeSig(t, raw), secret);
    expect(res.valid).toBe(false);
    expect(res.proof).toBe('timestamp_outside_tolerance');
  });

  it('rejects a signature computed with the wrong secret', () => {
    const t = Math.floor(Date.now() / 1000);
    const res = verifyStripeWebhook(raw, stripeSig(t, raw, 'wrong'), secret);
    expect(res.valid).toBe(false);
    expect(res.proof).toBe('signature_invalid');
  });

  it('rejects a malformed header and accepts-and-flags when no secret configured', () => {
    expect(verifyStripeWebhook(raw, 'garbage', secret).proof).toBe('malformed_signature');
    expect(verifyStripeWebhook(raw, undefined, undefined).valid).toBe(true);
  });
});
