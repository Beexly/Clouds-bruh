import { describe, it, expect } from 'vitest';
import { resolveSite, CANONICAL_SITE, SITE } from './site';

describe('site origin', () => {
  it('falls back to the canonical brand domain when env is unset or blank', () => {
    expect(resolveSite(undefined)).toBe(CANONICAL_SITE);
    expect(resolveSite('')).toBe(CANONICAL_SITE);
    expect(resolveSite('   ')).toBe(CANONICAL_SITE);
  });

  it('uses the env value and trims trailing slashes', () => {
    expect(resolveSite('https://lumeralabel.com/')).toBe('https://lumeralabel.com');
    expect(resolveSite('https://shop.example.org/path//')).toBe('https://shop.example.org/path');
  });

  it('the canonical default is a real https origin, never a .example placeholder', () => {
    expect(CANONICAL_SITE.startsWith('https://')).toBe(true);
    expect(CANONICAL_SITE).not.toMatch(/\.example(?:\b|\/|$)/);
    expect(CANONICAL_SITE).toContain('lumeralabel.com');
  });

  it('the resolved SITE is a valid absolute URL', () => {
    expect(() => new URL(SITE)).not.toThrow();
  });
});
