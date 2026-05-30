import { loadQueue } from '../queue/store.mjs';
import { assessProductImagery, SHOT_TIERS, QUALITY_MIN } from '../imagery/quality.mjs';

export const meta = { role: 'imagery' };

/**
 * Imagery agent: report imagery readiness against the quality system (R4).
 * For each product candidate it reports pending approval, missing required
 * shots, and whether the average quality clears the bar — so the operator sees
 * exactly what's needed before a piece can feel premium. Never approves.
 */
export async function run(paths, ctx, opts = {}) {
  const items = await loadQueue(paths);
  const products = items.filter((i) => i.kind === 'product');
  const pending = items.filter((i) => (i.imagery || []).some((m) => !m.approved)).length;

  let missingShotsTotal = 0;
  let belowQuality = 0;
  for (const c of products) {
    const a = assessProductImagery(c.imagery || []);
    missingShotsTotal += a.missingShots.length;
    if (a.shotCount > 0 && a.averageScore < QUALITY_MIN) belowQuality++;
  }

  return {
    producedCandidateIds: [],
    notes:
      `${pending} candidate(s) await human approval; required shots: ${SHOT_TIERS.tier1.join('/')}; ` +
      `${missingShotsTotal} missing shot-slot(s); ${belowQuality} below quality bar (${QUALITY_MIN})`,
  };
}
