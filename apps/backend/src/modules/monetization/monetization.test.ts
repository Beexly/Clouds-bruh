import { describe, it, expect } from 'vitest';
import { LOYALTY_LADDER, resolveLoyaltyTier } from './loyalty';

describe('Luminance loyalty ladder', () => {
  it('uses the Lumera light names, ascending', () => {
    expect(LOYALTY_LADDER.map((t) => t.name)).toEqual(['Spark', 'Glow', 'Aurora', 'Zenith']);
    const at = LOYALTY_LADDER.map((t) => t.at);
    expect(at).toEqual([...at].sort((a, b) => a - b));
  });

  it('resolves current + next tier by lifetime Lumens', () => {
    expect(resolveLoyaltyTier(0)).toEqual({ current: 'Spark', next: 'Glow', credits_to_next: 2500 });
    expect(resolveLoyaltyTier(3000).current).toBe('Glow');
    expect(resolveLoyaltyTier(3000).next).toBe('Aurora');
  });

  it('caps at Zenith with no next tier', () => {
    const top = resolveLoyaltyTier(99999);
    expect(top.current).toBe('Zenith');
    expect(top.next).toBeNull();
    expect(top.credits_to_next).toBe(0);
  });
});
