import { clamp } from '../lib/num.mjs';

/**
 * 0–100 readiness score from completeness. Strictly monotonic: adding copy,
 * specs, variants, approved media, a supplier, or valid pricing only raises it.
 * Reaches 100 when fully complete.
 */
export function productReadiness(product = {}) {
  let s = 0;
  if (product.title) s += 8;
  if ((product.description || '').length >= 40) s += 12;
  if ((product.bulletBenefits || []).length >= 3) s += 12;
  if ((product.emotionalHooks || []).length >= 1) s += 8;
  if (Object.keys(product.specs || {}).length >= 2) s += 12;
  if ((product.variants || []).length >= 1) s += 12;
  const approvedMedia = (product.media || []).filter((m) => m.approved).length;
  if (approvedMedia >= 1) s += 10;
  if (approvedMedia >= 3) s += 8;
  if (product.supplierId) s += 10;
  const pr = product.pricing || {};
  if ((pr.listMinor || 0) > 0 && (pr.listMinor || 0) >= (pr.floorMinor || 0)) s += 8;
  return clamp(Math.round(s), 0, 100);
}
