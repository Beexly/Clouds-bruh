import { Lifecycle, Visibility, StockState } from '../model/enums.mjs';
import { evaluateLaunchGates } from '../scoring/launch-gate.mjs';
import { loadCatalog, saveCatalog } from './store.mjs';
import { makeEvent, appendEvent } from './events.mjs';
import { actorLabel } from '../lib/actor.mjs';
import { now } from '../lib/clock.mjs';

/**
 * Publish a product — the ONLY path that flips a product live. Refuses unless
 * every required launch gate passes (including human approval). Optionally
 * stocks the product (the operator confirms real inventory at go-live).
 */
export async function publishProduct(paths, productId, actor, ctx = {}) {
  const catalog = await loadCatalog(paths);
  const product = catalog.products.find((p) => p.id === productId);
  if (!product) throw new Error('Product not found: ' + productId);

  const gate = evaluateLaunchGates(product, {
    humanApproved: ctx.humanApproved === true || !!product.approvedAt,
  });
  if (!gate.passed) {
    throw new Error('Publish blocked — launch gates failed: ' + gate.blockers.join(', '));
  }

  // Optionally seed real inventory confirmed by the operator at approval time.
  if (Number.isFinite(ctx.stock) && ctx.stock > 0) {
    for (const v of product.variants || []) {
      v.inventory = v.inventory || { onHand: 0, reserved: 0, restockThreshold: 5 };
      v.inventory.onHand = ctx.stock;
      v.stockState = StockState.IN;
    }
  }

  product.lifecycle = Lifecycle.PUBLISHED;
  product.visibility = Visibility.VISIBLE;
  const available = (product.variants || []).some(
    (v) => (v.inventory?.onHand || 0) - (v.inventory?.reserved || 0) > 0
  );
  product.stockState = available ? StockState.IN : StockState.OUT;
  product.updatedAt = now();

  await saveCatalog(paths, catalog);
  await appendEvent(
    paths,
    makeEvent('product.published', { productId, stockState: product.stockState }, actorLabel(actor))
  );
  return product;
}
