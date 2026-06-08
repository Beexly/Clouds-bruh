import { afterEach, describe, expect, it } from 'vitest';
import {
  DEDUP_WINDOW_HOURS,
  isCartEligible,
  isWithinDedupWindow,
  maxAgeHours,
  minAgeHours,
} from './abandoned-cart';

const NOW = new Date('2026-06-08T12:00:00.000Z');
const HOUR_MS = 60 * 60 * 1000;
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * HOUR_MS).toISOString();

const savedMin = process.env.ABANDONED_CART_MIN_AGE_HOURS;
const savedMax = process.env.ABANDONED_CART_MAX_AGE_HOURS;

function base() {
  return {
    has_items: true,
    has_email: true,
    has_order: false,
    updated_at: hoursAgo(5), // comfortably inside the default 1h–72h window
    last_email_at: null as string | null,
  };
}

afterEach(() => {
  if (savedMin === undefined) delete process.env.ABANDONED_CART_MIN_AGE_HOURS;
  else process.env.ABANDONED_CART_MIN_AGE_HOURS = savedMin;
  if (savedMax === undefined) delete process.env.ABANDONED_CART_MAX_AGE_HOURS;
  else process.env.ABANDONED_CART_MAX_AGE_HOURS = savedMax;
});

describe('isCartEligible — recovery window', () => {
  it('is eligible inside the window', () => {
    expect(isCartEligible(base(), NOW)).toBe(true);
  });

  it('is NOT eligible when too new (updated < min age ago)', () => {
    expect(isCartEligible({ ...base(), updated_at: hoursAgo(0.5) }, NOW)).toBe(false);
  });

  it('is NOT eligible when too old (updated > max age ago)', () => {
    expect(isCartEligible({ ...base(), updated_at: hoursAgo(100) }, NOW)).toBe(false);
  });

  it('treats the window edges as inclusive', () => {
    expect(isCartEligible({ ...base(), updated_at: hoursAgo(minAgeHours()) }, NOW)).toBe(true);
    expect(isCartEligible({ ...base(), updated_at: hoursAgo(maxAgeHours()) }, NOW)).toBe(true);
  });
});

describe('isCartEligible — required fields', () => {
  it('is NOT eligible without items', () => {
    expect(isCartEligible({ ...base(), has_items: false }, NOW)).toBe(false);
  });

  it('is NOT eligible without an email', () => {
    expect(isCartEligible({ ...base(), has_email: false }, NOW)).toBe(false);
  });

  it('is NOT eligible once converted to an order', () => {
    expect(isCartEligible({ ...base(), has_order: true }, NOW)).toBe(false);
  });

  it('is NOT eligible when updated_at is missing or unparseable', () => {
    expect(isCartEligible({ ...base(), updated_at: null }, NOW)).toBe(false);
    expect(isCartEligible({ ...base(), updated_at: 'not-a-date' }, NOW)).toBe(false);
  });
});

describe('isCartEligible — dedup', () => {
  it('is NOT eligible when already emailed inside the dedup window', () => {
    expect(isCartEligible({ ...base(), last_email_at: hoursAgo(2) }, NOW)).toBe(false);
  });

  it('is eligible again once the dedup window has passed', () => {
    expect(
      isCartEligible({ ...base(), last_email_at: hoursAgo(DEDUP_WINDOW_HOURS + 1) }, NOW)
    ).toBe(true);
  });
});

describe('isWithinDedupWindow', () => {
  it('returns false when never emailed', () => {
    expect(isWithinDedupWindow(null, NOW)).toBe(false);
    expect(isWithinDedupWindow(undefined, NOW)).toBe(false);
  });

  it('returns false for an unparseable timestamp', () => {
    expect(isWithinDedupWindow('not-a-date', NOW)).toBe(false);
  });

  it('returns true just inside the window', () => {
    expect(isWithinDedupWindow(hoursAgo(DEDUP_WINDOW_HOURS - 0.1), NOW)).toBe(true);
  });

  it('returns false at/after the window boundary', () => {
    expect(isWithinDedupWindow(hoursAgo(DEDUP_WINDOW_HOURS), NOW)).toBe(false);
    expect(isWithinDedupWindow(hoursAgo(DEDUP_WINDOW_HOURS + 1), NOW)).toBe(false);
  });

  it('accepts a Date as well as a string', () => {
    expect(isWithinDedupWindow(new Date(NOW.getTime() - HOUR_MS), NOW)).toBe(true);
  });
});

describe('window env overrides', () => {
  it('respects ABANDONED_CART_MIN_AGE_HOURS / MAX_AGE_HOURS', () => {
    process.env.ABANDONED_CART_MIN_AGE_HOURS = '6';
    process.env.ABANDONED_CART_MAX_AGE_HOURS = '12';
    // 5h ago is now too new (min is 6h); 8h ago is in-window.
    expect(isCartEligible({ ...base(), updated_at: hoursAgo(5) }, NOW)).toBe(false);
    expect(isCartEligible({ ...base(), updated_at: hoursAgo(8) }, NOW)).toBe(true);
    // 13h ago now exceeds the tightened 12h max.
    expect(isCartEligible({ ...base(), updated_at: hoursAgo(13) }, NOW)).toBe(false);
  });

  it('falls back to defaults for invalid env values', () => {
    process.env.ABANDONED_CART_MIN_AGE_HOURS = 'abc';
    process.env.ABANDONED_CART_MAX_AGE_HOURS = '-5';
    expect(minAgeHours()).toBe(1);
    expect(maxAgeHours()).toBe(72);
  });
});
