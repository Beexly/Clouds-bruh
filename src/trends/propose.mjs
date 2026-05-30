import { createCandidate } from '../model/review-queue-item.mjs';
import { CandidateKind } from '../model/enums.mjs';
import { enqueueCandidate } from '../queue/store.mjs';
import { detectTrends } from './detect.mjs';

/**
 * Emit explainable TREND candidates into the human-review queue. The trends
 * agent proposes opportunities (motifs/attributes) — it does NOT create
 * products. A human reads the opportunity and decides whether to source it.
 * Always appended as an `agent` actor; gate stays blocked (it is informational).
 */
export async function proposeTrends(paths, opts = {}) {
  const { ranked } = detectTrends(opts.terms, opts);
  const top = ranked.slice(0, opts.count ?? 10);
  const produced = [];
  for (const t of top) {
    const candidate = createCandidate({
      kind: CandidateKind.TREND,
      title: `Trend — ${t.term} (${t.trajectory})`,
      summary:
        `On-trend opportunity: "${t.term}". Score ${(t.score * 100).toFixed(0)}/100, ` +
        `${t.trajectory}, confidence ${(t.confidence * 100).toFixed(0)}%. ` +
        `Consider sourcing an on-brand piece around this motif.`,
      proposedBy: { agent: 'trends', runId: opts.runId || 'manual' },
      payload: {
        trend: {
          term: t.term,
          score: Number(t.score.toFixed(4)),
          trajectory: t.trajectory,
          confidence: Number(t.confidence.toFixed(4)),
          fit: Number(t.fit.toFixed(4)),
          category: t.category,
          tags: t.tags,
          components: t.subs,
        },
      },
      gate: { passed: false, blockers: ['Trend opportunity — a human decides whether to source it'] },
    });
    const res = await enqueueCandidate(paths, candidate);
    if (res.created) produced.push(candidate.id);
  }
  return { producedCandidateIds: produced, ranked: top };
}
