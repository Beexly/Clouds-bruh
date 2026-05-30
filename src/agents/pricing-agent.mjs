import { loadQueue } from '../queue/store.mjs';
import { MARGIN_FLOOR_PCT } from '../scoring/pricing-margin.mjs';
import { CandidateKind } from '../model/enums.mjs';

export const meta = { role: 'pricing' };

/** Pricing/margin agent: report product candidates sitting below the margin floor. */
export async function run(paths, ctx, opts = {}) {
  const items = await loadQueue(paths);
  const products = items.filter((i) => i.kind === CandidateKind.PRODUCT);
  const flagged = products.filter((i) => (i.costs?.marginPct || 0) < MARGIN_FLOOR_PCT);
  return {
    producedCandidateIds: [],
    notes: `${products.length} product candidate(s); ${flagged.length} below ${MARGIN_FLOOR_PCT}% margin`,
  };
}
