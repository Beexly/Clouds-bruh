import { proposeTrends } from '../trends/propose.mjs';

export const meta = { role: 'trends' };

/**
 * Trends agent: detect on-trend motifs and propose them as TREND candidates into
 * the human-review queue. Proposes opportunities only — never creates products,
 * never approves. A human decides whether to source each motif.
 */
export async function run(paths, ctx, opts = {}) {
  const { producedCandidateIds, ranked } = await proposeTrends(paths, {
    ...opts,
    seed: opts.seed ?? ctx.seed,
  });
  return {
    producedCandidateIds,
    notes: `detected ${ranked.length} on-brand trend(s); queued ${producedCandidateIds.length} opportunity candidate(s)`,
  };
}
