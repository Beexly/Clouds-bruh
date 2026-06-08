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
});
