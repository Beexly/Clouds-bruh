import { describe, it, expect } from 'vitest';
import * as brand from './brand';

describe('brand identity', () => {
  it('is Lumera — no old codename in any user-facing string', () => {
    expect(brand.BRAND).toBe('Lumera');
    for (const v of Object.values(brand)) {
      if (typeof v === 'string') expect(v).not.toMatch(/\bXIV\b|Alter\s?XIV/i);
    }
  });

  it('exposes the core lexicon + motto', () => {
    expect(brand.EXPERIENCE).toBe('The Broadcast');
    expect(brand.CURRENCY).toBe('Lumens');
    expect(brand.LOYALTY).toBe('Luminance');
    expect(brand.COLLECTIVE).toBe('The Constellation');
    expect(brand.MOTTO).toBeTruthy();
  });
});
