import { describe, it, expect } from 'vitest';
import { authHeaders, trackingFor, formatMoney, orderNumber, statusLabel } from './customer';

describe('authHeaders', () => {
  it('always includes the publishable key + JSON content-type', () => {
    const h = authHeaders();
    expect(h['Content-Type']).toBe('application/json');
    expect(h).toHaveProperty('x-publishable-api-key');
  });

  it('adds a Bearer Authorization header when a token is present', () => {
    expect(authHeaders('abc.def.ghi').Authorization).toBe('Bearer abc.def.ghi');
  });

  it('omits Authorization for null/undefined/blank tokens (anonymous fallback)', () => {
    expect(authHeaders(null).Authorization).toBeUndefined();
    expect(authHeaders(undefined).Authorization).toBeUndefined();
    expect(authHeaders('   ').Authorization).toBeUndefined();
  });

  it('trims whitespace around the token', () => {
    expect(authHeaders('  tok  ').Authorization).toBe('Bearer tok');
  });
});

describe('trackingFor', () => {
  it('returns an empty array when there are no fulfillments', () => {
    expect(trackingFor({})).toEqual([]);
    expect(trackingFor({ fulfillments: [] })).toEqual([]);
  });

  it('reads tracking number + url from labels', () => {
    const out = trackingFor({
      fulfillments: [{ id: 'f1', labels: [{ tracking_number: '1Z999', tracking_url: 'https://t/1Z999' }] }],
    });
    expect(out).toEqual([{ number: '1Z999', url: 'https://t/1Z999' }]);
  });

  it('falls back to top-level tracking_numbers and de-dupes', () => {
    const out = trackingFor({
      fulfillments: [
        { id: 'f1', labels: [{ tracking_number: 'A' }], tracking_numbers: ['A', 'B'] },
      ],
    });
    expect(out).toEqual([{ number: 'A', url: undefined }, { number: 'B' }]);
  });
});

describe('formatMoney', () => {
  it('divides by 100 by default (cents → dollars)', () => {
    expect(formatMoney(14900, 'usd')).toBe('$149.00');
  });

  it('renders an em dash for nullish/NaN amounts', () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(undefined)).toBe('—');
    expect(formatMoney(Number.NaN)).toBe('—');
  });

  it('honors a custom divisor', () => {
    expect(formatMoney(149, 'usd', 1)).toBe('$149.00');
  });

  it('falls back to a plain dollar string for an invalid currency code', () => {
    expect(formatMoney(1000, 'not-a-currency')).toBe('$10.00');
  });
});

describe('orderNumber', () => {
  it('prefers display_id', () => {
    expect(orderNumber({ display_id: 1042, id: 'order_abc' })).toBe('#1042');
  });
  it('falls back to a short id slug', () => {
    expect(orderNumber({ id: 'order_0123456789' })).toBe('#23456789');
  });
});

describe('statusLabel', () => {
  it('title-cases snake_case statuses', () => {
    expect(statusLabel('not_fulfilled')).toBe('Not Fulfilled');
    expect(statusLabel('captured')).toBe('Captured');
  });
  it('handles missing status', () => {
    expect(statusLabel()).toBe('Unknown');
    expect(statusLabel(null)).toBe('Unknown');
  });
});
