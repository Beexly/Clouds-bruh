import { describe, it, expect, afterEach } from 'vitest';
import { shippingPromise, defaultRadarQueries, radarConfigured } from './lumera-db';

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});

describe('shippingPromise (pure)', () => {
  it('builds a sane window for the default 12-day lead time', () => {
    delete process.env.VENDOR_LIVE_MODE;
    const p = shippingPromise(12);
    expect(p.max_days).toBe(12);
    expect(p.min_days).toBe(8); // max(2, 12-4)
    expect(p.requires_delay_consent).toBe(false);
    expect(p.provider).toMatch(/preview/); // not live
    expect(p.message).toContain('8-12');
  });

  it('floors the window so it never inverts on tiny lead times', () => {
    const p = shippingPromise(2);
    expect(p.max_days).toBe(3); // max(3, days)
    expect(p.min_days).toBe(2); // max(2, 3-4)
  });

  it('requires delay consent past 30 days', () => {
    expect(shippingPromise(40).requires_delay_consent).toBe(true);
    expect(shippingPromise(30).requires_delay_consent).toBe(false);
  });

  it('reflects live vendor routing when VENDOR_LIVE_MODE=true', () => {
    process.env.VENDOR_LIVE_MODE = 'true';
    expect(shippingPromise(10).provider).toMatch(/vendor-routed/);
  });
});

describe('radar config helpers (pure)', () => {
  it('defaultRadarQueries falls back to a built-in seed set, or parses env', () => {
    delete process.env.LUMERA_RADAR_QUERIES;
    const def = defaultRadarQueries();
    expect(Array.isArray(def)).toBe(true);
    expect(def.length).toBeGreaterThanOrEqual(3);

    process.env.LUMERA_RADAR_QUERIES = 'a, b ,c';
    expect(defaultRadarQueries()).toEqual(['a', 'b', 'c']);
  });

  it('radarConfigured is true only with Oxylabs(user+pass) or Apify token', () => {
    delete process.env.OXYLABS_USER;
    delete process.env.OXYLABS_PASS;
    delete process.env.APIFY_TOKEN;
    expect(radarConfigured()).toBe(false);

    process.env.APIFY_TOKEN = 'tok';
    expect(radarConfigured()).toBe(true);

    delete process.env.APIFY_TOKEN;
    process.env.OXYLABS_USER = 'u';
    expect(radarConfigured()).toBe(false); // needs pass too
    process.env.OXYLABS_PASS = 'p';
    expect(radarConfigured()).toBe(true);
  });
});
