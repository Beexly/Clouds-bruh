import { loadQueue } from '../queue/store.mjs';
import { getProductByCandidate, upsertProduct } from '../catalog/store.mjs';
import { createProduct } from '../model/product.mjs';
import { QueueStatus } from '../model/enums.mjs';

export const meta = { role: 'catalog' };

/**
 * Catalog agent: reconciler that ensures every APPROVED candidate has a
 * materialized draft product (still hidden/out-of-stock). Idempotent — normally
 * a no-op because review-actions materializes on approval.
 */
export async function run(paths, ctx, opts = {}) {
  const items = await loadQueue(paths);
  let created = 0;
  for (const c of items) {
    if (c.status !== QueueStatus.APPROVED) continue;
    const existing = await getProductByCandidate(paths, c.id);
    if (existing) continue;
    const spec = c.payload?.product || {};
    const product = createProduct({
      ...spec,
      media: (c.imagery || []).map((m) => ({ ...m, approved: true })),
      origin: { source: 'agent', candidateId: c.id, agent: c.proposedBy?.agent },
    });
    await upsertProduct(paths, product);
    created++;
  }
  return { producedCandidateIds: [], notes: `materialized ${created} approved candidate(s)` };
}
