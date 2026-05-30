import { loadQueue } from '../queue/store.mjs';

export const meta = { role: 'imagery' };

/** Imagery agent: report candidates whose imagery still awaits human approval. */
export async function run(paths, ctx, opts = {}) {
  const items = await loadQueue(paths);
  const pending = items.filter((i) => (i.imagery || []).some((m) => !m.approved)).length;
  return {
    producedCandidateIds: [],
    notes: `${pending} candidate(s) with imagery pending human approval`,
  };
}
