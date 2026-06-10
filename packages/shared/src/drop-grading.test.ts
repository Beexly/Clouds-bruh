import { describe, it, expect } from 'vitest';
import { gradeDrop, DROP_GRADING } from './drop-grading';

describe('drop scale-or-kill grading (LATR)', () => {
  it('holds early — never grades inside the window', () => {
    expect(gradeDrop({ units_total: 20, units_remaining: 0, days_live: 3 }).grade).toBe('early');
  });

  it('scales winners with a 2.5× restock proposal', () => {
    const g = gradeDrop({ units_total: 20, units_remaining: 6, days_live: 7 }); // 70% sold
    expect(g.grade).toBe('scale');
    expect(g.restock_qty).toBe(35); // 14 sold × 2.5
  });

  it('enforces the restock minimum', () => {
    const g = gradeDrop({ units_total: 5, units_remaining: 2, days_live: 8 }); // 3 sold → 7.5 < min
    expect(g.grade).toBe('scale');
    expect(g.restock_qty).toBe(DROP_GRADING.restock_min);
  });

  it('kills dead stock at ≤20% sell-through', () => {
    expect(gradeDrop({ units_total: 20, units_remaining: 17, days_live: 7 }).grade).toBe('kill');
  });

  it('holds the middle band', () => {
    expect(gradeDrop({ units_total: 20, units_remaining: 12, days_live: 7 }).grade).toBe('hold'); // 40%
  });

  it('clamps nonsense inputs (remaining > total, zero allocation)', () => {
    expect(gradeDrop({ units_total: 10, units_remaining: 99, days_live: 9 }).grade).toBe('kill'); // 0% sold
    expect(gradeDrop({ units_total: 0, units_remaining: 0, days_live: 9 }).grade).toBe('kill');
  });
});
