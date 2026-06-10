import { describe, it, expect, afterEach } from 'vitest';
import {
  unsubscribeToken,
  verifyUnsubscribeToken,
  postalAddress,
  marketingAllowed,
  marketingFooter,
  unsubscribeUrl,
} from './email-compliance';

const OLD = { ...process.env };
afterEach(() => {
  process.env.COMPANY_POSTAL_ADDRESS = OLD.COMPANY_POSTAL_ADDRESS;
  process.env.NODE_ENV = OLD.NODE_ENV;
  process.env.MEDUSA_BACKEND_URL = OLD.MEDUSA_BACKEND_URL;
  if (OLD.COMPANY_POSTAL_ADDRESS === undefined) delete process.env.COMPANY_POSTAL_ADDRESS;
  if (OLD.MEDUSA_BACKEND_URL === undefined) delete process.env.MEDUSA_BACKEND_URL;
});

describe('unsubscribe token (signed, no DB needed to verify)', () => {
  it('round-trips an address case-insensitively', () => {
    const t = unsubscribeToken('Patron@Lumera.Example');
    expect(verifyUnsubscribeToken(t)).toBe('patron@lumera.example');
  });

  it('rejects a tampered signature', () => {
    const t = unsubscribeToken('a@b.com');
    const tampered = t.slice(0, -1) + (t.endsWith('x') ? 'y' : 'x');
    expect(verifyUnsubscribeToken(tampered)).toBeNull();
  });

  it('rejects a swapped payload (cannot forge to suppress another address)', () => {
    const sig = unsubscribeToken('victim@lumera.example').split('.')[1];
    const forgedPayload = Buffer.from('attacker@evil.test').toString('base64url');
    expect(verifyUnsubscribeToken(`${forgedPayload}.${sig}`)).toBeNull();
  });

  it('rejects malformed/empty tokens', () => {
    expect(verifyUnsubscribeToken('')).toBeNull();
    expect(verifyUnsubscribeToken('nodot')).toBeNull();
    expect(verifyUnsubscribeToken(null)).toBeNull();
    expect(verifyUnsubscribeToken(undefined)).toBeNull();
  });
});

describe('postal address + marketing gate (CAN-SPAM)', () => {
  it('reports the configured postal address, else null', () => {
    delete process.env.COMPANY_POSTAL_ADDRESS;
    expect(postalAddress()).toBeNull();
    process.env.COMPANY_POSTAL_ADDRESS = '123 Broadcast Way, Austin, TX 78701';
    expect(postalAddress()).toBe('123 Broadcast Way, Austin, TX 78701');
  });

  it('blocks marketing in production without a postal address; allows it in dev/test', () => {
    delete process.env.COMPANY_POSTAL_ADDRESS;
    process.env.NODE_ENV = 'production';
    expect(marketingAllowed()).toBe(false);
    process.env.NODE_ENV = 'test';
    expect(marketingAllowed()).toBe(true);
    process.env.NODE_ENV = 'production';
    process.env.COMPANY_POSTAL_ADDRESS = '123 Broadcast Way, Austin, TX 78701';
    expect(marketingAllowed()).toBe(true);
  });
});

describe('marketing footer', () => {
  it('includes the postal address and a working unsubscribe link for the recipient', () => {
    process.env.COMPANY_POSTAL_ADDRESS = '123 Broadcast Way, Austin, TX 78701';
    process.env.MEDUSA_BACKEND_URL = 'https://api.lumeralabel.com';
    const html = marketingFooter({ email: 'patron@lumera.example' });
    expect(html).toContain('123 Broadcast Way, Austin, TX 78701');
    expect(html.toLowerCase()).toContain('unsubscribe');
    const url = unsubscribeUrl('patron@lumera.example');
    expect(url).toContain('https://api.lumeralabel.com/unsubscribe?token=');
    expect(html).toContain('/unsubscribe?token=');
    // The link must verify back to the same address.
    const token = decodeURIComponent(url.split('token=')[1]);
    expect(verifyUnsubscribeToken(token)).toBe('patron@lumera.example');
  });

  it('shows a clearly-marked placeholder when no address is configured (dev only)', () => {
    delete process.env.COMPANY_POSTAL_ADDRESS;
    const html = marketingFooter({ email: 'a@b.com' });
    expect(html).toContain('COMPANY_POSTAL_ADDRESS');
  });
});
