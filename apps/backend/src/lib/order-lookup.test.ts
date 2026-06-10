import { describe, it, expect } from 'vitest';
import { validateLookup } from './order-lookup';

describe('guest order-lookup validation (pure, anti-enumeration)', () => {
  it('accepts a numeric order + valid email, stripping a leading #', () => {
    expect(validateLookup({ order_no: '#1042', email: ' Patron@Lumeralabel.com ' })).toEqual({
      ok: true, orderNo: 1042, email: 'patron@lumeralabel.com',
    });
    expect(validateLookup({ order_no: 7, email: 'a@b.co' })).toEqual({ ok: true, orderNo: 7, email: 'a@b.co' });
  });

  it('requires BOTH a valid order number and a valid email', () => {
    expect(validateLookup({ order_no: '', email: 'a@b.co' }).ok).toBe(false);
    expect(validateLookup({ order_no: 'abc', email: 'a@b.co' }).ok).toBe(false);
    expect(validateLookup({ order_no: '12', email: 'nope' }).ok).toBe(false);
    expect(validateLookup({}).ok).toBe(false);
  });

  it('rejects absurd order numbers', () => {
    expect(validateLookup({ order_no: '1'.repeat(20), email: 'a@b.co' }).ok).toBe(false);
  });
});
