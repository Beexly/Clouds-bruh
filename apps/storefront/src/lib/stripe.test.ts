import { describe, expect, it } from 'vitest';
import { hasStripeProvider, stripeClientSecretFromCollection, STRIPE_PROVIDER_ID } from './api';

// B1 card rail — pure gating + session-parsing logic (the browser-side money path glue).
// The Elements UI itself is exercised end-to-end with Stripe test cards (auth/capture/FAIL/refund).

describe('STRIPE_PROVIDER_ID', () => {
  it('matches the medusa-config wiring (identifier stripe, id stripe)', () => {
    expect(STRIPE_PROVIDER_ID).toBe('pp_stripe_stripe');
  });
});

describe('hasStripeProvider', () => {
  it('finds the exact provider id', () => {
    expect(hasStripeProvider([{ id: 'pp_system_default' }, { id: 'pp_stripe_stripe' }])).toBe(true);
  });
  it('tolerates id variants that still contain stripe', () => {
    expect(hasStripeProvider([{ id: 'pp_stripe' }])).toBe(true);
  });
  it('is false for the test provider only', () => {
    expect(hasStripeProvider([{ id: 'pp_system_default' }])).toBe(false);
  });
  it('is false for empty / PayPal-only regions', () => {
    expect(hasStripeProvider([])).toBe(false);
    expect(hasStripeProvider([{ id: 'pp_paypal_paypal' }])).toBe(false);
  });
});

describe('stripeClientSecretFromCollection', () => {
  it('extracts the server-issued client_secret from the stripe session', () => {
    const collection = {
      payment_sessions: [
        { provider_id: 'pp_paypal_paypal', data: { id: 'PAYPAL123' } },
        { provider_id: 'pp_stripe_stripe', data: { client_secret: 'pi_123_secret_abc' } },
      ],
    };
    expect(stripeClientSecretFromCollection(collection)).toBe('pi_123_secret_abc');
  });
  it('returns null when there is no stripe session', () => {
    expect(stripeClientSecretFromCollection({ payment_sessions: [{ provider_id: 'pp_system_default', data: {} }] })).toBeNull();
  });
  it('returns null when the stripe session has no secret (never fabricates one)', () => {
    expect(stripeClientSecretFromCollection({ payment_sessions: [{ provider_id: 'pp_stripe_stripe', data: {} }] })).toBeNull();
  });
  it('returns null for empty / missing collections', () => {
    expect(stripeClientSecretFromCollection(null)).toBeNull();
    expect(stripeClientSecretFromCollection({})).toBeNull();
  });
});
