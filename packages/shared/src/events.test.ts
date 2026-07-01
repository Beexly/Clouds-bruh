import { describe, it, expect } from 'vitest';
import {
  REWARD_WEIGHTS, EVENT_TYPES, CHAPTERS, PRICE_BANDS, priceBand,
  CHAPTER_AESTHETIC, productAesthetic, CURRENCY_BAND_SCALE,
} from './events';

describe('REWARD_WEIGHTS', () => {
  it('purchase has the highest reward', () => {
    const weights = Object.values(REWARD_WEIGHTS).filter(v => v !== undefined) as number[];
    expect(REWARD_WEIGHTS.purchase).toBe(Math.max(...weights));
  });

  it('add_to_cart reward is greater than product_view', () => {
    expect(REWARD_WEIGHTS.add_to_cart!).toBeGreaterThan(REWARD_WEIGHTS.product_view!);
  });

  it('all reward weights are positive', () => {
    for (const [, v] of Object.entries(REWARD_WEIGHTS)) {
      if (v !== undefined) expect(v).toBeGreaterThan(0);
    }
  });
});

describe('EVENT_TYPES', () => {
  it('contains core commerce events', () => {
    expect(EVENT_TYPES).toContain('product_view');
    expect(EVENT_TYPES).toContain('add_to_cart');
    expect(EVENT_TYPES).toContain('purchase');
    expect(EVENT_TYPES).toContain('checkout_step');
  });

  it('contains recommendation events', () => {
    expect(EVENT_TYPES).toContain('recommendation_click');
    expect(EVENT_TYPES).toContain('recommendation_impression');
  });
});

describe('CHAPTERS', () => {
  it('has exactly 5 chapters', () => {
    expect(CHAPTERS).toHaveLength(5);
  });

  it('includes armor and stillness', () => {
    expect(CHAPTERS).toContain('armor');
    expect(CHAPTERS).toContain('stillness');
  });
});

describe('priceBand', () => {
  it('classifies each tier at and around its boundaries', () => {
    expect(priceBand(0)).toBe('entry');
    expect(priceBand(49.99)).toBe('entry');
    expect(priceBand(50)).toBe('core');
    expect(priceBand(149.99)).toBe('core');
    expect(priceBand(150)).toBe('premium');
    expect(priceBand(399.99)).toBe('premium');
    expect(priceBand(400)).toBe('luxury');
    expect(priceBand(5000)).toBe('luxury');
  });

  it('treats non-finite/negative input as entry (safe default)', () => {
    expect(priceBand(NaN)).toBe('entry');
    expect(priceBand(-10)).toBe('entry');
  });

  it('only ever returns a declared band', () => {
    for (const p of [0, 50, 150, 400, 12345]) expect(PRICE_BANDS).toContain(priceBand(p));
  });

  it('defaults to USD scale and is case-insensitive on currency', () => {
    expect(priceBand(200)).toBe(priceBand(200, 'usd'));
    expect(priceBand(200, 'USD')).toBe('premium');
    expect(priceBand(200, 'unknown-code')).toBe('premium'); // unknown → scale 1 (USD-like)
  });

  it('is currency-aware: JPY amounts normalize to USD-equivalent tiers', () => {
    // ¥60,000 / 150 ≈ $400 → luxury; ¥6,000 ≈ $40 → entry
    expect(priceBand(60000, 'jpy')).toBe('luxury');
    expect(priceBand(6000, 'jpy')).toBe('entry');
    expect(CURRENCY_BAND_SCALE.jpy).toBeGreaterThan(1);
  });

  it('CAD (weaker than USD) bands below the equivalent USD number', () => {
    // $400 CAD ≈ $285 USD → premium, not luxury
    expect(priceBand(400, 'cad')).toBe('premium');
  });
});

describe('productAesthetic', () => {
  it('maps every chapter to a non-empty aesthetic identity', () => {
    for (const c of CHAPTERS) {
      expect(CHAPTER_AESTHETIC[c]).toBeTruthy();
      expect(productAesthetic(c)).toBe(CHAPTER_AESTHETIC[c]);
    }
  });

  it('prefers an explicit tag (lower-cased, trimmed) over the chapter default', () => {
    expect(productAesthetic('armor', '  Brutalist ')).toBe('brutalist');
  });

  it('returns undefined for unknown chapter and no explicit tag', () => {
    expect(productAesthetic('not-a-chapter')).toBeUndefined();
    expect(productAesthetic(undefined, null)).toBeUndefined();
  });
});
