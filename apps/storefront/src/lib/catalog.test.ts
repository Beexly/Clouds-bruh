import { describe, it, expect } from 'vitest';
import { priceCents, priceStr } from './catalog';

describe('catalog price helpers', () => {
  it('prefers region-calculated price', () => {
    const p = { variants: [{ calculated_price: { calculated_amount: 7900 }, prices: [{ amount: 9999 }] }] };
    expect(priceCents(p)).toBe(7900);
  });
  it('falls back to legacy prices[]', () => {
    const p = { variants: [{ prices: [{ amount: 4900 }] }] };
    expect(priceCents(p)).toBe(4900);
  });
  it('returns null when no price is present', () => {
    expect(priceCents({ variants: [{}] })).toBeNull();
    expect(priceCents({})).toBeNull();
  });
  it('formats dollars', () => {
    expect(priceStr({ variants: [{ calculated_price: { calculated_amount: 14900 } }] })).toBe('$149.00');
  });
  it('shows "Price on request" when unpriced', () => {
    expect(priceStr({})).toBe('Price on request');
  });
});
