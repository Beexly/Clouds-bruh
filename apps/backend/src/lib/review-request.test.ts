import { describe, it, expect, afterEach } from 'vitest';
import { isReviewEligible, delayDays, maxDays } from './review-request';
import { renderReviewRequest } from './email';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-06-10T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY).toISOString();

afterEach(() => {
  delete process.env.REVIEW_REQUEST_DELAY_DAYS;
  delete process.env.REVIEW_REQUEST_MAX_DAYS;
});

describe('review-request eligibility (pure)', () => {
  const base = { has_email: true, has_items: true, reference_at: daysAgo(10), last_request_at: null };

  it('is eligible inside the window, once', () => {
    expect(isReviewEligible(base, NOW)).toBe(true);
  });

  it('requires an email and at least one item', () => {
    expect(isReviewEligible({ ...base, has_email: false }, NOW)).toBe(false);
    expect(isReviewEligible({ ...base, has_items: false }, NOW)).toBe(false);
  });

  it('never asks twice (permanent dedup)', () => {
    expect(isReviewEligible({ ...base, last_request_at: daysAgo(1) }, NOW)).toBe(false);
  });

  it('waits out the delay and gives up after the max window', () => {
    expect(isReviewEligible({ ...base, reference_at: daysAgo(2) }, NOW)).toBe(false); // < 7d default
    expect(isReviewEligible({ ...base, reference_at: daysAgo(60) }, NOW)).toBe(false); // > 45d default
  });

  it('honors env tuning of the window', () => {
    process.env.REVIEW_REQUEST_DELAY_DAYS = '14';
    expect(delayDays()).toBe(14);
    expect(isReviewEligible({ ...base, reference_at: daysAgo(10) }, NOW)).toBe(false); // now inside delay
    process.env.REVIEW_REQUEST_MAX_DAYS = '90';
    expect(maxDays()).toBe(90);
    expect(isReviewEligible({ ...base, reference_at: daysAgo(60) }, NOW)).toBe(true);
  });

  it('rejects an unparseable reference date', () => {
    expect(isReviewEligible({ ...base, reference_at: 'not-a-date' }, NOW)).toBe(false);
    expect(isReviewEligible({ ...base, reference_at: null }, NOW)).toBe(false);
  });
});

describe('review-request render (no fake-review pressure)', () => {
  it('renders to the customer with an honest, un-bribed ask', () => {
    const out = renderReviewRequest({ email: 'patron@buyer.test', display_id: 42, items: [{ title: 'Eclipse Hoodie' }] });
    expect(out.to).toBe('patron@buyer.test');
    expect(out.subject).toContain('42');
    expect(out.html).toContain('Eclipse Hoodie');
    // brand voice + explicitly no incentive / no star-pressure
    expect(out.html.toLowerCase()).toContain('honest');
    expect(out.html).not.toMatch(/\b(discount|coupon|% off|free gift|reward for)\b/i);
  });

  it('carries the CAN-SPAM footer (it is a marketing email)', () => {
    const out = renderReviewRequest({ email: 'patron@buyer.test', display_id: 42, items: [{ title: 'Eclipse Hoodie' }] });
    expect(out.html.toLowerCase()).toContain('unsubscribe');
    expect(out.html).toContain('/unsubscribe?token=');
  });
});
