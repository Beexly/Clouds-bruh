/**
 * Abandoned-cart recovery — pure eligibility logic + a read-only finder.
 *
 * The scheduled job (src/jobs/abandoned-cart.ts) is the only consumer. Everything that can be
 * tested without a DB lives here as a PURE function: the recovery-window predicate and the dedup
 * window. The DB read is a single best-effort query that no-ops cleanly (returns []) on any error
 * so the scheduled job can never throw or interfere with order placement.
 *
 * Dedup approach (simplest safe option): we stamp the cart's own `metadata.last_abandoned_email_at`
 * (ISO string) after a send attempt. No new table, no migration. The finder reads that field back
 * out of the cart's jsonb metadata and the predicate refuses to re-send inside the dedup window.
 * Worst case (a metadata write race) is a single duplicate, never a flood.
 */

import { pool } from './lumera-db';

/** Hours a cart must be idle before it's "abandoned" (recovery window opens). */
export function minAgeHours(): number {
  const v = Number(process.env.ABANDONED_CART_MIN_AGE_HOURS);
  return Number.isFinite(v) && v > 0 ? v : 1;
}

/** Hours after which a cart is too stale to bother recovering (recovery window closes). */
export function maxAgeHours(): number {
  const v = Number(process.env.ABANDONED_CART_MAX_AGE_HOURS);
  return Number.isFinite(v) && v > 0 ? v : 72;
}

/** Minimum gap between recovery emails to the same cart. Fixed at 24h — a guardrail, not tunable. */
export const DEDUP_WINDOW_HOURS = 24;

const HOUR_MS = 60 * 60 * 1000;

export interface EligibilityInput {
  has_items: boolean;
  has_email: boolean;
  has_order: boolean;
  /** Cart's last update — Date or ISO/parseable string. */
  updated_at: Date | string | null | undefined;
  /** When we last sent a recovery email for this cart, if ever. */
  last_email_at?: Date | string | null;
}

function toTime(v: Date | string | null | undefined): number | null {
  if (v == null) return null;
  const t = v instanceof Date ? v.getTime() : new Date(v).getTime();
  return Number.isFinite(t) ? t : null;
}

/**
 * PURE dedup check: have we emailed this cart within DEDUP_WINDOW_HOURS of `now`?
 * No prior email (null/unparseable) is never within the window.
 */
export function isWithinDedupWindow(
  last_email_at: Date | string | null | undefined,
  now: Date = new Date()
): boolean {
  const last = toTime(last_email_at);
  if (last == null) return false;
  return now.getTime() - last < DEDUP_WINDOW_HOURS * HOUR_MS;
}

/**
 * PURE eligibility predicate — the heart of the job, unit-tested without a DB.
 * A cart is eligible to receive a recovery email iff:
 *   - it has at least one line item, and
 *   - it has an email, and
 *   - it has NOT converted to an order, and
 *   - its last update sits inside the recovery window [minAge, maxAge] relative to `now`, and
 *   - we have not already emailed it inside the dedup window.
 */
export function isCartEligible(input: EligibilityInput, now: Date = new Date()): boolean {
  if (!input.has_items || !input.has_email || input.has_order) return false;

  const updated = toTime(input.updated_at);
  if (updated == null) return false;

  const ageMs = now.getTime() - updated;
  if (ageMs < minAgeHours() * HOUR_MS) return false; // too new — still active
  if (ageMs > maxAgeHours() * HOUR_MS) return false; // too old — cold lead

  if (isWithinDedupWindow(input.last_email_at, now)) return false;

  return true;
}

export interface AbandonedCart {
  id: string;
  email: string;
  currency_code: string;
  updated_at: string;
  last_email_at: string | null;
  items: Array<{ title: string; quantity: number; unit_price: number }>;
}

/**
 * Read-only finder for candidate abandoned carts. Best-effort: returns [] on any DB error or when
 * the expected Medusa cart tables are absent (fixture-safe). Pulls a generous superset (carts with
 * items + email + no completed order, updated within the max window); the PURE predicate above is
 * the authority on final eligibility, so the SQL window is intentionally loose.
 */
export async function findAbandonedCarts(now: Date = new Date()): Promise<AbandonedCart[]> {
  const windowStart = new Date(now.getTime() - maxAgeHours() * HOUR_MS).toISOString();
  const windowEnd = new Date(now.getTime() - minAgeHours() * HOUR_MS).toISOString();

  // order_cart links a cart to its completed order; LEFT JOIN + NULL filter excludes converted carts.
  // cart_line_item carries title/quantity/unit_price (integer cents). Aggregated to one row per cart.
  const sql = `
    SELECT
      c.id,
      c.email,
      c.currency_code,
      c.updated_at,
      (c.metadata ->> 'last_abandoned_email_at') AS last_email_at,
      COALESCE(
        json_agg(
          json_build_object('title', li.title, 'quantity', li.quantity, 'unit_price', li.unit_price)
        ) FILTER (WHERE li.id IS NOT NULL),
        '[]'
      ) AS items
    FROM cart c
    JOIN cart_line_item li ON li.cart_id = c.id AND li.deleted_at IS NULL
    LEFT JOIN order_cart oc ON oc.cart_id = c.id AND oc.deleted_at IS NULL
    WHERE c.deleted_at IS NULL
      AND c.completed_at IS NULL
      AND c.email IS NOT NULL AND c.email <> ''
      AND oc.id IS NULL
      AND c.updated_at >= $1
      AND c.updated_at <= $2
    GROUP BY c.id
    LIMIT 500
  `;

  const result = await pool()
    .query(sql, [windowStart, windowEnd])
    .catch(() => ({ rows: [] as any[] }));

  return (result.rows as any[]).map((r) => ({
    id: String(r.id),
    email: String(r.email),
    currency_code: String(r.currency_code || 'usd'),
    updated_at: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
    last_email_at: r.last_email_at ? String(r.last_email_at) : null,
    items: Array.isArray(r.items)
      ? r.items.map((i: any) => ({
          title: String(i.title ?? 'Item'),
          quantity: Number(i.quantity ?? 1),
          unit_price: Number(i.unit_price ?? 0),
        }))
      : [],
  }));
}

/**
 * Best-effort dedup stamp. Writes `metadata.last_abandoned_email_at = now` onto the cart, merging
 * into existing jsonb metadata. Never throws — a failed stamp just means we might retry next hour.
 */
export async function stampAbandonedEmail(cartId: string, now: Date = new Date()): Promise<void> {
  const sql = `
    UPDATE cart
    SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('last_abandoned_email_at', $2::text)
    WHERE id = $1
  `;
  await pool()
    .query(sql, [cartId, now.toISOString()])
    .catch(() => undefined);
}
