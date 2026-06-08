import { describe, it, expect, afterEach } from 'vitest';
import crypto from 'node:crypto';
import { verifyVendorWebhook } from './lumera-db';

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
});
