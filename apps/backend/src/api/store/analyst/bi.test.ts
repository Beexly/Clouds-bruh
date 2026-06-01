import { describe, it, expect } from 'vitest';
import { matchQuery, buildInsight, buildChart, QUERIES } from './bi';

describe('matchQuery', () => {
  it('chapter/margin query matches pricing query', () => {
    const result = matchQuery('which chapter has the best margin');
    expect(result.description).toBe('Pricing by chapter (margin proxy)');
  });

  it('conversion funnel query matches correctly', () => {
    const result = matchQuery('show me the conversion funnel');
    expect(result.description).toBe('Conversion funnel (last 7 days)');
  });

  it('visitor segment query matches correctly', () => {
    const result = matchQuery('visitor segment distribution');
    expect(result.description).toBe('Visitor segment distribution');
  });

  it('drop sell-through query matches correctly', () => {
    const result = matchQuery('drop sell-through units inventory');
    expect(result.description).toBe('Drop sell-through');
  });

  it('product trending query matches correctly', () => {
    const result = matchQuery('top products trending viewed');
    expect(result.description).toBe('Top products by engagement');
  });

  it('audit findings query matches correctly', () => {
    const result = matchQuery('recent audit findings health');
    expect(result.description).toBe('Recent audit findings');
  });

  it('returns a query even for unrecognized input (fallback to first)', () => {
    const result = matchQuery('random unrelated question');
    expect(result.sql).toBeTruthy();
  });

  it('all queries have non-empty SQL', () => {
    for (const q of QUERIES) {
      expect(q.sql.trim().length).toBeGreaterThan(10);
    }
  });

  it('all SQL queries use read-safe patterns (no INSERT/UPDATE/DELETE)', () => {
    for (const q of QUERIES) {
      const upper = q.sql.toUpperCase();
      expect(upper).not.toMatch(/\bINSERT\b/);
      expect(upper).not.toMatch(/\bUPDATE\b/);
      expect(upper).not.toMatch(/\bDELETE\b/);
      expect(upper).not.toMatch(/\bDROP TABLE\b/);
      expect(upper).not.toMatch(/\bTRUNCATE\b/);
    }
  });
});

describe('buildInsight', () => {
  it('margin insight names the best chapter', () => {
    const rows = [{ chapter: 'armor', avg_price_usd: '149.00', products: '9' }];
    const result = buildInsight('chapter margin', rows, ['chapter', 'avg_price_usd', 'products']);
    expect(result).toContain('armor');
    expect(result).toContain('149.00');
  });

  it('conversion insight calculates rate', () => {
    const rows = [
      { type: 'product_view', unique_visitors: 100 },
      { type: 'purchase', unique_visitors: 5 },
    ];
    const result = buildInsight('conversion funnel', rows, ['type', 'unique_visitors']);
    expect(result).toContain('5.0%');
  });

  it('segment insight shows largest segment', () => {
    const rows = [{ segment: 'armor_devotee', pct: '60.0', count: '6' }];
    const result = buildInsight('segment audience', rows, ['segment', 'pct', 'count']);
    expect(result).toContain('armor_devotee');
  });

  it('returns "No data available." for empty rows', () => {
    expect(buildInsight('anything', [], [])).toBe('No data available.');
  });

  it('conversion with zero views returns no purchases message', () => {
    const rows: any[] = [];
    const result = buildInsight('conversion funnel', rows, []);
    expect(result).toBe('No data available.');
  });
});

describe('buildChart', () => {
  it('returns bar chart when numeric columns present', () => {
    const rows = [{ chapter: 'armor', avg_price_usd: '149.00', products: '9' }];
    const chart = buildChart(['chapter', 'avg_price_usd', 'products'], rows);
    expect(chart.type).toBe('bar');
    expect(chart.x).toBe('chapter');
    expect(chart.y).toContain('avg_price_usd');
  });

  it('returns table chart for text-only columns', () => {
    const rows = [{ segment: 'armor_devotee', status: 'active' }];
    const chart = buildChart(['segment', 'status'], rows);
    expect(chart.type).toBe('table');
  });

  it('caps data at 10 rows', () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({ chapter: `ch${i}`, count: String(i) }));
    const chart = buildChart(['chapter', 'count'], rows);
    expect(chart.data.length).toBeLessThanOrEqual(10);
  });
});

describe('predictive BI (MindsDB-style)', () => {
  it('matchQuery routes "forecast demand" to the demand forecast', () => {
    expect(matchQuery('forecast demand next week').description).toMatch(/Demand forecast/);
  });
  it('matchQuery routes "when will it sell out" to sell-out projection', () => {
    expect(matchQuery('when will the drop sell out velocity').description).toMatch(/Sell-out projection/);
  });
  it('matchQuery routes "churn" to churn risk', () => {
    expect(matchQuery('churn retention risk lapsed').description).toMatch(/Churn risk/);
  });
  it('demand forecast insight projects next-week from wk/wk momentum', () => {
    const rows = [{ chapter: 'altar', this_week: 27, prev_week: 9 }];
    const out = buildInsight('forecast demand by chapter', rows, ['chapter', 'this_week', 'prev_week']);
    expect(out).toContain('altar');
    expect(out).toMatch(/next-week demand/);
  });
  it('sell-out insight projects days to zero from velocity', () => {
    const rows = [{ name: 'IRON GATE', units_total: 144, units_remaining: 100, days_live: 4 }];
    const out = buildInsight('when will it sell out', rows, ['name', 'units_total', 'units_remaining', 'days_live']);
    expect(out).toMatch(/units\/day/);
    expect(out).toMatch(/sell-out in/);
  });
  it('churn insight reports lapsed percentage', () => {
    const rows = [{ active: 30, lapsed: 10, segment_lapsed: 8, total: 40 }];
    const out = buildInsight('churn risk', rows, ['active', 'lapsed', 'segment_lapsed', 'total']);
    expect(out).toContain('25.0% lapsed');
  });
  it('predictive insight takes precedence over the chapter keyword', () => {
    const rows = [{ chapter: 'armor', this_week: 5, prev_week: 5 }];
    const out = buildInsight('demand forecast by chapter', rows, ['chapter', 'this_week', 'prev_week']);
    expect(out).toMatch(/wk\/wk/); // not the margin "Best:" branch
  });
});
