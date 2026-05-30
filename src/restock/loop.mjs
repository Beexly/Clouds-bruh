import { loadCatalog } from '../catalog/store.mjs';
import { createRestockSignal } from '../model/restock-signal.mjs';
import { createCandidate } from '../model/review-queue-item.mjs';
import { enqueueCandidate } from '../queue/store.mjs';
import { CandidateKind, Lifecycle } from '../model/enums.mjs';
import { writeJson } from '../lib/jsonfile.mjs';
import { now } from '../lib/clock.mjs';

/** Scan published products for variants at/below their restock threshold. */
export async function scanForRestock(paths) {
  const catalog = await loadCatalog(paths);
  const signals = [];
  for (const p of catalog.products || []) {
    if (p.lifecycle !== Lifecycle.PUBLISHED) continue;
    for (const v of p.variants || []) {
      const onHand = v.inventory?.onHand || 0;
      const reserved = v.inventory?.reserved || 0;
      const threshold = v.inventory?.restockThreshold || 5;
      if (onHand - reserved <= threshold) {
        signals.push(
          createRestockSignal({ productId: p.id, variantId: v.id, sku: v.sku, onHand, reserved, threshold })
        );
      }
    }
  }
  await writeJson(paths.restockSignals, { signals, updatedAt: now() });
  return signals;
}

/** Turn restock signals into human-gated restock candidates in the queue. */
export async function proposeRestocks(paths, signals, opts = {}) {
  const produced = [];
  for (const sig of signals) {
    const candidate = createCandidate({
      kind: CandidateKind.RESTOCK,
      title: `Restock — ${sig.sku} (${sig.severity})`,
      summary: `Inventory ${sig.onHand} vs threshold ${sig.threshold}. Recommend ordering ${sig.recommendedQty}.`,
      proposedBy: { agent: 'restock', runId: opts.runId || 'manual' },
      payload: {
        restock: { productId: sig.productId, variantId: sig.variantId, qty: sig.recommendedQty, reason: sig.severity },
      },
      gate: { passed: false, blockers: ['Restock requires human approval'] },
    });
    const res = await enqueueCandidate(paths, candidate);
    if (res.created) produced.push(candidate.id);
  }
  return produced;
}
