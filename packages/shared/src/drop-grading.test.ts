import { describe, it, expect } from 'vitest';
import { gradeDrop, DROP_GRADING, planDropActions } from './drop-grading';

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

describe('planDropActions (LATR → founder-approval proposals)', () => {
  const drops = [
    { id: 'd_scale', name: 'Winner', units_total: 20, units_remaining: 4, days_live: 8 }, // 80% → scale
    { id: 'd_kill', name: 'Dead', units_total: 20, units_remaining: 18, days_live: 8 }, // 10% → kill
    { id: 'd_hold', name: 'Middle', units_total: 20, units_remaining: 11, days_live: 8 }, // 45% → hold
    { id: 'd_early', name: 'Fresh', units_total: 20, units_remaining: 2, days_live: 2 }, // window not reached
  ];

  it('emits only scale + kill proposals (hold/early produce nothing)', () => {
    const p = planDropActions(drops);
    expect(p.map((x) => x.drop_id).sort()).toEqual(['d_kill', 'd_scale']);
  });

  it('maps each proposal to the correct agent + gated action', () => {
    const byId = Object.fromEntries(planDropActions(drops).map((p) => [p.drop_id, p]));
    expect(byId.d_scale).toMatchObject({ agent: 'forecaster', tool: 'trigger_reorder' });
    expect((byId.d_scale.input as any).qty).toBeGreaterThan(0);
    expect(byId.d_kill).toMatchObject({ agent: 'warden', tool: 'delist_product', input: { drop_id: 'd_kill' } });
  });

  it('ranks restocks (revenue) before kills (capital)', () => {
    expect(planDropActions(drops)[0].grade).toBe('scale');
  });
});
