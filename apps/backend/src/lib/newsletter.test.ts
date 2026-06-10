import { describe, it, expect } from 'vitest';
import { normalizeEmail } from './newsletter';

describe('newsletter email normalize/validate', () => {
  it('accepts and normalizes a valid address', () => {
    expect(normalizeEmail('  Patron@Lumeralabel.com ')).toBe('patron@lumeralabel.com');
    expect(normalizeEmail('a.b+tag@sub.domain.co')).toBe('a.b+tag@sub.domain.co');
  });

  it('rejects malformed addresses', () => {
    for (const bad of ['', 'nope', 'a@b', 'a@b.c d', '@domain.com', 'name@', 'name@domain', 'two@@x.com', 'a@b..com']) {
      expect(normalizeEmail(bad), bad).toBeNull();
    }
  });

  it('rejects non-strings and absurd lengths', () => {
    expect(normalizeEmail(null)).toBeNull();
    expect(normalizeEmail(42 as any)).toBeNull();
    expect(normalizeEmail('a@' + 'x'.repeat(300) + '.com')).toBeNull();
  });
});
