import { describe, expect, it } from 'vitest';
import { attachReview, evaluateCompliance, fixtureCandidates, scoreCandidate } from './index';

describe('Lumera curation gate', () => {
  it('blocks prohibited product categories and unknown recall risk', () => {
    const candidate = fixtureCandidates('manual')[1];
    const review = evaluateCompliance(candidate);
    expect(review.status).toBe('blocked');
    expect(review.blockers.some((b) => b.startsWith('recalled_risk'))).toBe(true);
  });

  it('marks safe POD apparel as needs_sample instead of auto-publishing', () => {
    const candidate = fixtureCandidates('printify')[2];
    const scored = attachReview(candidate);
    expect(scored.status).toBe('needs_sample');
    expect(scored.score?.needs_sample).toBe(true);
  });

  it('blocks candidates below margin floor', () => {
    const candidate = fixtureCandidates('printful')[0];
    const score = scoreCandidate({ ...candidate, cost_cents: 7000, retail_cents: 7900, compliance: evaluateCompliance(candidate) });
    expect(score.recommended_status).toBe('margin_blocked');
  });

  it('blocks candidates whose lead time exceeds the max shipping window', () => {
    const candidate = fixtureCandidates('printify')[0];
    const score = scoreCandidate(
      { ...candidate, lead_time_days: 18, compliance: evaluateCompliance(candidate) },
      0.2, // low margin floor so margin doesn't trip first
      12
    );
    expect(score.recommended_status).toBe('shipping_blocked');
  });

  it('blocks on unavailable stock and records a blocker', () => {
    const candidate = fixtureCandidates('printify')[0];
    const score = scoreCandidate({ ...candidate, stock: 0, compliance: evaluateCompliance(candidate) });
    expect(score.blockers).toContain('stock_unavailable');
    expect(score.recommended_status).toBe('supplier_blocked');
  });

  it('auto-reject floors are enforced (margin + shipping)', () => {
    const candidate = fixtureCandidates('printify')[0];
    const score = scoreCandidate({ ...candidate, cost_cents: 4800, retail_cents: 5000, lead_time_days: 40, compliance: evaluateCompliance(candidate) });
    expect(score.blockers).toContain('margin_below_auto_reject_floor');
    expect(score.blockers).toContain('shipping_above_auto_reject_days');
  });

  it('computes gross margin and margin_cents correctly', () => {
    const candidate = fixtureCandidates('printify')[0];
    const score = scoreCandidate({ ...candidate, cost_cents: 2000, retail_cents: 5000, compliance: evaluateCompliance(candidate) });
    expect(score.gross_margin).toBeCloseTo(0.6, 4);
    expect(score.margin_cents).toBe(3000);
  });
});
