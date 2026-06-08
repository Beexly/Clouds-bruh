import { describe, it, expect, afterEach } from 'vitest';
import { parseSentryDsn, captureException, captureMessage } from './observability';

describe('observability — Sentry DSN parsing', () => {
  afterEach(() => {
    delete process.env.SENTRY_DSN;
  });

  it('parses a valid DSN into ingest url + auth header', () => {
    const parsed = parseSentryDsn('https://abc123@o42.ingest.sentry.io/1337');
    expect(parsed).not.toBeNull();
    expect(parsed!.publicKey).toBe('abc123');
    expect(parsed!.host).toBe('o42.ingest.sentry.io');
    expect(parsed!.projectId).toBe('1337');
    expect(parsed!.ingestUrl).toBe('https://o42.ingest.sentry.io/api/1337/envelope/');
    expect(parsed!.authHeader).toBe('Sentry sentry_key=abc123, sentry_version=7');
  });

  it('returns null for empty / undefined DSN', () => {
    expect(parseSentryDsn(undefined)).toBeNull();
    expect(parseSentryDsn('')).toBeNull();
    expect(parseSentryDsn(null)).toBeNull();
  });

  it('returns null for a malformed DSN (missing public key)', () => {
    expect(parseSentryDsn('https://o42.ingest.sentry.io/1337')).toBeNull();
  });

  it('returns null for a non-url string', () => {
    expect(parseSentryDsn('not a dsn')).toBeNull();
  });
});

describe('observability — no-op when unconfigured', () => {
  afterEach(() => {
    delete process.env.SENTRY_DSN;
  });

  it('captureException never throws and returns void when SENTRY_DSN is unset', () => {
    delete process.env.SENTRY_DSN;
    expect(() => captureException(new Error('boom'), { foo: 'bar' })).not.toThrow();
    expect(captureException(new Error('boom'))).toBeUndefined();
  });

  it('captureException handles non-Error values without throwing', () => {
    delete process.env.SENTRY_DSN;
    expect(() => captureException('a string error')).not.toThrow();
    expect(() => captureException({ weird: true })).not.toThrow();
  });

  it('captureMessage never throws and returns void when SENTRY_DSN is unset', () => {
    delete process.env.SENTRY_DSN;
    expect(() => captureMessage('hello', 'info')).not.toThrow();
    expect(captureMessage('hello')).toBeUndefined();
  });
});
