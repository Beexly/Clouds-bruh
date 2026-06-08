import { describe, it, expect } from 'vitest';
import { validateReviewInput, computeReviewStats } from './reviews-db';

describe('validateReviewInput', () => {
  const base = { product_id: 'prod_1', rating: 5, body: 'Excellent piece, well made.' };

  it('accepts a valid review and normalizes optional fields', () => {
    const out = validateReviewInput({ ...base, title: '  Lovely  ', email: ' a@b.co ', order_id: ' ord_9 ' });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.value.product_id).toBe('prod_1');
      expect(out.value.rating).toBe(5);
      expect(out.value.title).toBe('Lovely');
      expect(out.value.email).toBe('a@b.co');
      expect(out.value.order_id).toBe('ord_9');
      // verified is never trusted from the client
      expect(out.value.verified).toBe(false);
    }
  });

  it('forces verified=false even if the client sends verified=true', () => {
    const out = validateReviewInput({ ...base, verified: true });
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.value.verified).toBe(false);
  });

  it('requires product_id', () => {
    const out = validateReviewInput({ ...base, product_id: '   ' });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toMatch(/product_id/);
  });

  it('requires a body of at least 4 characters', () => {
    expect(validateReviewInput({ ...base, body: 'ok' }).ok).toBe(false);
    expect(validateReviewInput({ ...base, body: '   ' }).ok).toBe(false);
  });

  it('rejects an overly long body', () => {
    const out = validateReviewInput({ ...base, body: 'x'.repeat(5001) });
    expect(out.ok).toBe(false);
  });

  it('rejects ratings below 1', () => {
    expect(validateReviewInput({ ...base, rating: 0 }).ok).toBe(false);
    expect(validateReviewInput({ ...base, rating: -3 }).ok).toBe(false);
  });

  it('rejects ratings above 5', () => {
    expect(validateReviewInput({ ...base, rating: 6 }).ok).toBe(false);
    expect(validateReviewInput({ ...base, rating: 99 }).ok).toBe(false);
  });

  it('rejects non-integer ratings', () => {
    expect(validateReviewInput({ ...base, rating: 4.5 }).ok).toBe(false);
    expect(validateReviewInput({ ...base, rating: NaN }).ok).toBe(false);
    expect(validateReviewInput({ ...base, rating: 'five' as unknown as number }).ok).toBe(false);
  });

  it('accepts the rating boundaries 1 and 5', () => {
    expect(validateReviewInput({ ...base, rating: 1 }).ok).toBe(true);
    expect(validateReviewInput({ ...base, rating: 5 }).ok).toBe(true);
  });

  it('handles null/undefined input safely', () => {
    expect(validateReviewInput(null).ok).toBe(false);
    expect(validateReviewInput(undefined).ok).toBe(false);
  });
});

describe('computeReviewStats', () => {
  it('returns zeroes for empty input', () => {
    expect(computeReviewStats([])).toEqual({ count: 0, average: 0 });
  });

  it('averages numeric ratings, rounded to one decimal', () => {
    expect(computeReviewStats([5, 4, 3])).toEqual({ count: 3, average: 4 });
    expect(computeReviewStats([5, 4])).toEqual({ count: 2, average: 4.5 });
    expect(computeReviewStats([5, 4, 4])).toEqual({ count: 3, average: 4.3 }); // 13/3 = 4.333 → 4.3
  });

  it('accepts row-shaped {rating} objects', () => {
    expect(computeReviewStats([{ rating: 5 }, { rating: 1 }])).toEqual({ count: 2, average: 3 });
  });

  it('ignores non-finite ratings', () => {
    expect(computeReviewStats([5, NaN as unknown as number, 3])).toEqual({ count: 2, average: 4 });
  });

  it('handles a single review', () => {
    expect(computeReviewStats([4])).toEqual({ count: 1, average: 4 });
  });
});
