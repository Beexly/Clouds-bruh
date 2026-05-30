import { describe, it, expect } from 'vitest';
import { REWARD_WEIGHTS, EVENT_TYPES, CHAPTERS } from './events';

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
