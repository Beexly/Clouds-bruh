import { clamp } from '../lib/num.mjs';

/** Supplier reliability/speed/capability score, 0–100. */
export function supplierScore(supplier = {}) {
  let s = clamp(supplier.reliability || 0, 0, 100) * 0.5; // up to 50
  const lead = supplier.leadTimeDays ?? 30;
  s += clamp(25 * (1 - (lead - 7) / (45 - 7)), 0, 25); // faster lead time → up to 25
  s += clamp((supplier.capabilities?.length || 0) * 5, 0, 15); // capability breadth → up to 15
  if (supplier.status === 'active') s += 10;
  return clamp(Math.round(s), 0, 100);
}
