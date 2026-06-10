import { describe, it, expect } from 'vitest';
import { shippingLadder } from './shipping-ladder';

describe('free-shipping AOV ladder', () => {
  it('is disabled (renders nothing) when the threshold is unset, zero, or junk', () => {
    expect(shippingLadder(5000, undefined).enabled).toBe(false);
    expect(shippingLadder(5000, '0').enabled).toBe(false);
    expect(shippingLadder(5000, 'not-a-number').enabled).toBe(false);
  });

  it('reports remaining and progress below the threshold', () => {
    const s = shippingLadder(3200, '50');
    expect(s.enabled).toBe(true);
    expect(s.remainingCents).toBe(1800);
    expect(s.progress).toBeCloseTo(0.64);
    expect(s.message).toBe('$18.00 away from free shipping.');
  });

  it('unlocks at and beyond the threshold, capping progress at 1', () => {
    expect(shippingLadder(5000, '50').message).toBe('Free shipping unlocked.');
    const over = shippingLadder(9900, '50');
    expect(over.remainingCents).toBe(0);
    expect(over.progress).toBe(1);
  });

  it('treats an empty cart sanely', () => {
    const s = shippingLadder(0, '50');
    expect(s.remainingCents).toBe(5000);
    expect(s.progress).toBe(0);
  });
});
