import { describe, it, expect } from 'vitest';
import { vendorSelect } from './vendor-select';

describe('vendor_select tool', () => {
  it('ranks connected vendors and chooses the best', async () => {
    const out: any = await vendorSelect.run({
      options: [
        { vendor: 'cj', cost_cents: 1500, lead_time_days: 6, reliability: 80, connected: true },
        { vendor: 'printify', cost_cents: 2500, lead_time_days: 5, reliability: 85, connected: true },
        { vendor: 'syncee', cost_cents: 1800, lead_time_days: 20, reliability: 50, connected: false },
      ],
      retail_cents: 5000,
    });
    expect(out.chosen).toBeTruthy();
    // syncee is not connected → excluded from ranking
    expect(out.ranked.map((r: any) => r.vendor)).not.toContain('syncee');
    expect(out.ranked.length).toBe(2);
  });

  it('returns no choice when nothing is connected', async () => {
    const out: any = await vendorSelect.run({
      options: [{ vendor: 'cj', cost_cents: 1500, lead_time_days: 6, reliability: 80, connected: false }],
    });
    expect(out.chosen).toBeNull();
  });
});
