import { describe, it, expect, afterEach } from 'vitest';
import { assertSafeOutboundUrl, rateLimit, mintingBlocked } from './security';

describe('mintingBlocked (store-value minting guard)', () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; });

  it('allows minting in dev / test (no live key)', () => {
    delete process.env.NODE_ENV; delete process.env.STRIPE_API_KEY;
    expect(mintingBlocked()).toBe(false);
    process.env.NODE_ENV = 'test'; process.env.STRIPE_API_KEY = 'sk_test_x';
    expect(mintingBlocked()).toBe(false);
  });
  it('blocks minting in production with a live key (unless explicitly allowed)', () => {
    process.env.NODE_ENV = 'production'; process.env.STRIPE_API_KEY = 'sk_live_x';
    delete process.env.MONETIZATION_ALLOW_UNPAID_ISSUE;
    expect(mintingBlocked()).toBe(true);
    process.env.MONETIZATION_ALLOW_UNPAID_ISSUE = 'true';
    expect(mintingBlocked()).toBe(false);
  });
  it('does not block prod when only a TEST key is present', () => {
    process.env.NODE_ENV = 'production'; process.env.STRIPE_API_KEY = 'sk_test_x';
    expect(mintingBlocked()).toBe(false);
  });
});

describe('assertSafeOutboundUrl (SSRF guard)', () => {
  it('allows a normal public https host', () => {
    expect(assertSafeOutboundUrl('https://api.anthropic.com/v1/messages').hostname).toBe('api.anthropic.com');
  });

  it('blocks loopback, link-local metadata, and private IPs', () => {
    for (const u of [
      'http://localhost/admin',
      'http://127.0.0.1:9000',
      'http://169.254.169.254/latest/meta-data',
      'http://10.0.0.5/internal',
      'http://192.168.1.10',
      'http://metadata.google.internal/',
    ]) {
      expect(() => assertSafeOutboundUrl(u)).toThrow(/ssrf_blocked/);
    }
  });

  it('blocks non-http(s) protocols and invalid urls', () => {
    expect(() => assertSafeOutboundUrl('file:///etc/passwd')).toThrow(/ssrf_blocked/);
    expect(() => assertSafeOutboundUrl('not a url')).toThrow(/ssrf_blocked/);
  });

  it('enforces an optional host allowlist', () => {
    expect(() => assertSafeOutboundUrl('https://evil.com', ['api.anthropic.com'])).toThrow(/not_allowlisted/);
    expect(assertSafeOutboundUrl('https://api.anthropic.com', ['api.anthropic.com']).hostname).toBe('api.anthropic.com');
  });
});

describe('rateLimit middleware', () => {
  const savedEnv = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = savedEnv;
    delete process.env.RATE_LIMIT_DISABLED;
  });

  function harness(ip: string) {
    const req: any = { headers: {}, socket: { remoteAddress: ip } };
    let status = 200;
    const res: any = {
      statusCode: 200,
      setHeader() {},
      status(s: number) { status = s; return res; },
      json() { return res; },
    };
    return { req, res, get status() { return status; } };
  }

  it('allows up to max then returns 429', () => {
    process.env.NODE_ENV = 'development';
    const mw = rateLimit({ windowMs: 10_000, max: 2 });
    const ip = `7.7.7.${Math.floor(Math.random() * 1000)}`;
    let nextCount = 0;
    const next = () => { nextCount += 1; };

    const h1 = harness(ip); mw(h1.req, h1.res as any, next); expect(h1.status).toBe(200);
    const h2 = harness(ip); mw(h2.req, h2.res as any, next); expect(h2.status).toBe(200);
    const h3 = harness(ip); mw(h3.req, h3.res as any, next); expect(h3.status).toBe(429);
    expect(nextCount).toBe(2);
  });

  it('is disabled under NODE_ENV=test', () => {
    process.env.NODE_ENV = 'test';
    const mw = rateLimit({ windowMs: 10_000, max: 1 });
    const ip = '8.8.8.8';
    let nextCount = 0;
    const next = () => { nextCount += 1; };
    for (let i = 0; i < 5; i++) { const h = harness(ip); mw(h.req, h.res as any, next); }
    expect(nextCount).toBe(5); // never throttled
  });
});
