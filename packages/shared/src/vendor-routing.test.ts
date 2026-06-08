import { describe, it, expect } from 'vitest';
import { rankVendorOptions, selectFulfillmentVendor, type VendorOption } from './index';

const opt = (o: Partial<VendorOption> & { vendor: VendorOption['vendor'] }): VendorOption => ({
  cost_cents: 2000,
  lead_time_days: 7,
  reliability: 80,
  connected: true,
  ...o,
});

describe('vendor routing intelligence', () => {
  it('chooses the higher-margin vendor when reliability + speed are comparable', () => {
    const res = rankVendorOptions(
      [opt({ vendor: 'cj', cost_cents: 1500 }), opt({ vendor: 'printify', cost_cents: 2500 })],
      { retailCents: 5000 }
    );
    expect(res.chosen).toBe('cj'); // cheaper cost → higher margin
    expect(res.ranked[0].gross_margin).toBeGreaterThan(res.ranked[1].gross_margin);
  });

  it('fails over away from the highest-margin vendor when it is far slower / less reliable', () => {
    const res = rankVendorOptions(
      [
        opt({ vendor: 'cj', cost_cents: 1000, lead_time_days: 30, reliability: 45 }), // best margin, worst service
        opt({ vendor: 'printify', cost_cents: 2200, lead_time_days: 4, reliability: 92 }),
      ],
      { retailCents: 5000 }
    );
    expect(res.chosen).toBe('printify');
    expect(res.failover).toBe(true);
  });

  it('only ranks connected vendors by default', () => {
    const res = rankVendorOptions([
      opt({ vendor: 'cj', connected: false }),
      opt({ vendor: 'manual', connected: true }),
    ]);
    expect(res.ranked.map((r) => r.vendor)).toEqual(['manual']);
    expect(res.chosen).toBe('manual');
  });

  it('returns no choice when nothing is connected', () => {
    const res = rankVendorOptions([opt({ vendor: 'cj', connected: false })]);
    expect(res.chosen).toBeNull();
  });

  it('selectFulfillmentVendor honours a connected preference', () => {
    expect(selectFulfillmentVendor({ preferred: 'cj', connected: ['cj', 'printify'] })).toBe('cj');
  });

  it('selectFulfillmentVendor fails over to the best connected vendor when preference is down', () => {
    expect(selectFulfillmentVendor({ preferred: 'cj', connected: ['printify', 'manual'] })).toBe('printify');
  });

  it('selectFulfillmentVendor defaults to manual when nothing is connected', () => {
    expect(selectFulfillmentVendor({ preferred: 'cj', connected: [] })).toBe('cj');
    expect(selectFulfillmentVendor({ connected: [] })).toBe('manual');
  });
});
