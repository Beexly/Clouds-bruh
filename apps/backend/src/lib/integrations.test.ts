import { describe, it, expect } from 'vitest';
import { integrationStatus } from './integrations';

describe('integration ignition status', () => {
  it('reports everything asleep for an empty env, with labels + unlocks', () => {
    const s = integrationStatus({});
    expect(s.length).toBeGreaterThanOrEqual(9);
    expect(s.every((i) => i.configured === false)).toBe(true);
    for (const i of s) {
      expect(i.label.trim().length, i.key).toBeGreaterThan(0);
      expect(i.unlocks.trim().length, i.key).toBeGreaterThan(0);
    }
  });

  it('treats the ANTHROPIC_API_KEY placeholder as not configured', () => {
    const live = integrationStatus({ ANTHROPIC_API_KEY: 'sk-ant-real-key' }).find((i) => i.key === 'anthropic');
    const placeholder = integrationStatus({ ANTHROPIC_API_KEY: 'sk-ant-...' }).find((i) => i.key === 'anthropic');
    expect(live?.configured).toBe(true);
    expect(placeholder?.configured).toBe(false);
  });

  it('flips capabilities on when their keys are present — and never leaks the secret value', () => {
    const s = integrationStatus({
      STRIPE_API_KEY: 'sk_test_LEAKCHECK_STRIPE',
      REDIS_URL: 'redis://example',
      PRINTIFY_TOKEN: 'LEAKCHECK_PRINTIFY',
    });
    const by = Object.fromEntries(s.map((i) => [i.key, i]));
    expect(by.stripe.configured).toBe(true);
    expect(by.redis.configured).toBe(true);
    expect(by.vendors.configured).toBe(true);
    expect(by.paypal.configured).toBe(false);
    const serialized = JSON.stringify(s);
    expect(serialized).not.toContain('LEAKCHECK_STRIPE');
    expect(serialized).not.toContain('LEAKCHECK_PRINTIFY');
  });
});
