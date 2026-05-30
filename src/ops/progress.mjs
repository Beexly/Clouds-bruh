import { loadCatalog } from '../catalog/store.mjs';
import { loadQueue } from '../queue/store.mjs';
import { createLane, ledgerFrom } from '../model/progress-lane.mjs';
import { Lifecycle } from '../model/enums.mjs';

const CATALOG_GOAL = 12; // launch-sized catalog target

/** Compute the progress ledger (lane % + overall %) from live catalog + queue. */
export async function computeLedger(paths) {
  const catalog = await loadCatalog(paths);
  const queue = await loadQueue(paths);
  const products = catalog.products || [];
  const published = products.filter((p) => p.lifecycle === Lifecycle.PUBLISHED).length;
  const withMedia = products.filter((p) => (p.media || []).some((m) => m.approved)).length;
  const reviewed = queue.filter((q) => ['approved', 'published', 'rejected'].includes(q.status)).length;

  const lanes = [
    createLane('sourcing', 'Sourcing', CATALOG_GOAL, Math.min(queue.length, CATALOG_GOAL)),
    createLane('review', 'Review Queue', Math.max(queue.length, 1), reviewed),
    createLane('catalog', 'Catalog', CATALOG_GOAL, Math.min(products.length, CATALOG_GOAL)),
    createLane('imagery', 'Imagery', CATALOG_GOAL, Math.min(withMedia, CATALOG_GOAL)),
    createLane('launch', 'Launch', CATALOG_GOAL, Math.min(published, CATALOG_GOAL)),
  ];
  return ledgerFrom(lanes);
}
