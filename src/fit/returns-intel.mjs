import { loadOrders } from '../orders/store.mjs';
import { FIT, RETURN_REASONS } from './model.mjs';

/**
 * Returns intelligence (R-CX, docs/research/10). The defensible asset: code each
 * return reason, learn how a garment runs from real return signals, and feed
 * bad-fit/quality suppliers back into supplier scoring. Computed from the
 * append-only order log; PROPOSES fit-profile flips and supplier penalties —
 * never auto-mutates. Honest by construction: only real returns drive it.
 *
 * Each order.returns[] record may carry { reason, productId, supplierId, qty }.
 */

const SIZE_REASONS = new Set(['too_small', 'too_large']);

/** Aggregate return signals per product and per supplier from realized orders. */
export async function computeReturnsIntel(paths, opts = {}) {
  const orders = await loadOrders(paths);
  const product = {}; // productId -> counters
  const supplier = {}; // supplierId -> counters

  const bump = (bucket, key, field, n = 1) => {
    if (!key) return;
    bucket[key] = bucket[key] || { units: 0, sizeReturns: 0, tooSmall: 0, tooLarge: 0, quality: 0, total: 0 };
    bucket[key][field] += n;
  };

  for (const o of orders) {
    if (['cancelled'].includes(o.status)) continue;
    for (const i of o.items || []) {
      bump(product, i.productId, 'units', i.qty || 1);
    }
    for (const r of o.returns || []) {
      const reason = RETURN_REASONS.includes(r.reason) ? r.reason : 'other';
      const pid = r.productId;
      const sid = r.supplierId;
      bump(product, pid, 'total');
      bump(supplier, sid, 'total');
      bump(supplier, sid, 'units', 0);
      if (SIZE_REASONS.has(reason)) {
        bump(product, pid, 'sizeReturns');
        bump(supplier, sid, 'sizeReturns');
        bump(product, pid, reason === 'too_small' ? 'tooSmall' : 'tooLarge');
      }
      if (reason === 'quality_defect') {
        bump(product, pid, 'quality');
        bump(supplier, sid, 'quality');
      }
    }
  }

  const rate = (n, d) => (d > 0 ? n / d : 0);
  const products = Object.entries(product).map(([id, c]) => ({
    productId: id,
    units: c.units,
    sizeReturnRate: rate(c.sizeReturns, c.units),
    qualityReturnRate: rate(c.quality, c.units),
    skew: c.tooSmall === c.tooLarge ? 'balanced' : c.tooSmall > c.tooLarge ? 'runs_small' : 'runs_large',
    tooSmall: c.tooSmall,
    tooLarge: c.tooLarge,
  }));
  const suppliers = Object.entries(supplier).map(([id, c]) => ({
    supplierId: id,
    sizeReturns: c.sizeReturns,
    qualityReturns: c.quality,
    total: c.total,
  }));
  return { products, suppliers };
}

/**
 * Propose fit-profile flips for products whose real size-return rate exceeds a
 * threshold with a directional skew. Returns proposals (human-gated); does not
 * mutate the catalog. A proposal carries basis:'returns_signal'.
 */
export function proposeFitFlips(intel, opts = {}) {
  const threshold = opts.threshold ?? 0.15; // 15% size-return rate
  const minUnits = opts.minUnits ?? 5;
  return (intel.products || [])
    .filter((p) => p.units >= minUnits && p.sizeReturnRate >= threshold && p.skew !== 'balanced')
    .map((p) => ({
      productId: p.productId,
      fit: p.skew === 'runs_small' ? FIT.SMALL : FIT.LARGE, // skew toward too-small returns means it runs small
      basis: 'returns_signal',
      confidence: p.units >= 20 ? 'high' : 'med',
      evidence: { units: p.units, sizeReturnRate: Number(p.sizeReturnRate.toFixed(3)), tooSmall: p.tooSmall, tooLarge: p.tooLarge },
    }));
}

/** A 0..1 penalty per supplier for fit/quality returns — feeds supplier-score. */
export function supplierReturnPenalty(intel, supplierId, opts = {}) {
  const s = (intel.suppliers || []).find((x) => x.supplierId === supplierId);
  if (!s || !s.total) return 0;
  const sizeWeight = opts.sizeWeight ?? 0.06; // per size-return
  const qualWeight = opts.qualWeight ?? 0.1; // per quality-return (worse)
  const penalty = sizeWeight * s.sizeReturns + qualWeight * s.qualityReturns;
  return Math.max(0, Math.min(1, penalty));
}
