import type { VendorId } from './curation';
import { grossMargin } from './curation';

/**
 * Vendor routing intelligence — when a product can be fulfilled by more than one supplier,
 * pick the best by margin, lead time, reliability, and health, with a deterministic priority
 * tie-break and graceful failover to whatever is actually connected.
 *
 * Pure + deterministic (no I/O) so it is fully unit-testable and safe to call anywhere.
 */

/** Default fulfilment preference when scores tie (faster + cleaner-API vendors first). */
export const VENDOR_FULFILLMENT_PRIORITY: VendorId[] = [
  'printify',
  'printful',
  'cj',
  'spocket',
  'syncee',
  'manual',
  'radar',
];

export interface VendorOption {
  vendor: VendorId;
  /** Supplier cost for the item, in cents. */
  cost_cents: number;
  lead_time_days: number;
  /** 0-100 supplier reliability. */
  reliability: number;
  /** Whether the vendor currently has credentials / is reachable. */
  connected: boolean;
}

export interface RankedVendorOption extends VendorOption {
  score: number;
  gross_margin: number;
  reasons: string[];
}

export interface RankVendorsResult {
  chosen: VendorId | null;
  ranked: RankedVendorOption[];
  /** True when the chosen vendor is not the highest-margin one because of health/lead-time. */
  failover: boolean;
}

export interface RankVendorsOptions {
  /** Retail price (cents) to compute margin against; if omitted, margin is weighted 0. */
  retailCents?: number;
  maxShippingDays?: number;
  /** Only rank connected vendors (failover). Default true. */
  requireConnected?: boolean;
  priority?: VendorId[];
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
}

/**
 * Rank vendor options for a single product and choose the best.
 * Weighting: margin 45% · reliability 30% · shipping speed 25% (margin weight folds into
 * reliability/speed when no retail price is supplied).
 */
export function rankVendorOptions(options: VendorOption[], opts: RankVendorsOptions = {}): RankVendorsResult {
  const retailCents = opts.retailCents;
  const maxDays = opts.maxShippingDays ?? 12;
  const requireConnected = opts.requireConnected ?? true;
  const priority = opts.priority ?? VENDOR_FULFILLMENT_PRIORITY;
  const priorityOf = (v: VendorId) => {
    const i = priority.indexOf(v);
    return i === -1 ? priority.length : i;
  };

  const pool = (requireConnected ? options.filter((o) => o.connected) : options).slice();
  if (pool.length === 0) return { chosen: null, ranked: [], failover: false };

  const haveMargin = typeof retailCents === 'number' && retailCents > 0;
  const marginWeight = haveMargin ? 0.45 : 0;
  const reliabilityWeight = haveMargin ? 0.3 : 0.55;
  const speedWeight = 0.25;

  const ranked: RankedVendorOption[] = pool
    .map((o) => {
      const margin = haveMargin ? grossMargin(o.cost_cents, retailCents!) : 0;
      const marginPart = clamp(margin / 0.6, 0, 1) * 100 * marginWeight; // 60% margin ≈ full marks
      const reliabilityPart = clamp(o.reliability, 0, 100) * reliabilityWeight;
      const speedPart = clamp(((maxDays + 4 - o.lead_time_days) / (maxDays + 4)) * 100, 0, 100) * speedWeight;
      const score = Math.round(marginPart + reliabilityPart + speedPart);
      const reasons: string[] = [];
      if (haveMargin) reasons.push(`${Math.round(margin * 100)}% margin`);
      reasons.push(`${o.reliability}/100 reliability`, `${o.lead_time_days}d lead time`);
      if (!o.connected) reasons.push('not connected');
      return { ...o, score, gross_margin: Number(margin.toFixed(4)), reasons };
    })
    .sort((a, b) => b.score - a.score || priorityOf(a.vendor) - priorityOf(b.vendor));

  const chosen = ranked[0]?.vendor ?? null;
  // Failover = the highest-margin connected option was NOT chosen (health/speed overrode raw margin).
  // Deterministic tie-break so equal margins don't produce a false-positive failover flag.
  const byMargin = haveMargin
    ? [...ranked].sort(
        (a, b) => b.gross_margin - a.gross_margin || b.score - a.score || priorityOf(a.vendor) - priorityOf(b.vendor)
      )
    : ranked;
  const failover = Boolean(chosen && byMargin[0] && byMargin[0].vendor !== chosen);

  return { chosen, ranked, failover };
}

/**
 * Pick a fulfilment vendor for an item: honour an explicit preference when it is connected,
 * otherwise fail over to the best connected vendor (else the safe `manual` default).
 */
export function selectFulfillmentVendor(input: {
  preferred?: VendorId | null;
  connected: VendorId[];
  priority?: VendorId[];
}): VendorId {
  const priority = input.priority ?? VENDOR_FULFILLMENT_PRIORITY;
  const connected = new Set(input.connected);
  if (input.preferred && connected.has(input.preferred)) return input.preferred;
  for (const v of priority) {
    if (v !== 'radar' && connected.has(v)) return v;
  }
  // Nothing connected to fail over to → the always-safe manual intake (never an unconnected vendor).
  return 'manual';
}
