import { describe, it, expect } from 'vitest';
import { dollarsToCents, centsToUsd, normalizeCode } from './gift-cards';

describe('dollarsToCents', () => {
  it('converts valid dollar inputs to integer cents', () => {
    expect(dollarsToCents('100')).toBe(10000);
    expect(dollarsToCents('49.99')).toBe(4999);
    expect(dollarsToCents('0.5')).toBe(50);
    expect(dollarsToCents(25)).toBe(2500);
  });

  it('strips a leading $ and commas', () => {
    expect(dollarsToCents('$1,000')).toBe(100000);
  });

  it('rejects invalid / non-positive / over-precise input', () => {
    expect(dollarsToCents('')).toBeNull();
    expect(dollarsToCents('abc')).toBeNull();
    expect(dollarsToCents('0')).toBeNull();
    expect(dollarsToCents('-5')).toBeNull();
    expect(dollarsToCents('1.234')).toBeNull();
  });
});

describe('centsToUsd', () => {
  it('formats cents as USD', () => {
    expect(centsToUsd(10000)).toBe('$100.00');
    expect(centsToUsd(4999)).toBe('$49.99');
  });
  it('renders an em dash for nullish / invalid', () => {
    expect(centsToUsd(null)).toBe('—');
    expect(centsToUsd(undefined)).toBe('—');
    expect(centsToUsd(NaN)).toBe('—');
  });
});

describe('normalizeCode', () => {
  it('trims and uppercases', () => {
    expect(normalizeCode('  altar-ab12-cd  ')).toBe('ALTAR-AB12-CD');
    expect(normalizeCode('')).toBe('');
  });
});
