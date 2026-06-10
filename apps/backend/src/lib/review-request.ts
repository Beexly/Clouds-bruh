/**
 * Post-purchase review request — pure eligibility logic + a read-only finder.
 *
 * Review velocity gates conversion (products with ~26-50 reviews convert markedly better than
 * zero-review listings), so we ask ONCE, on-brand, after the customer has had the piece in hand.
 * Mirrors the abandoned-cart module: everything testable without a DB is a PURE function here; the
 * DB read is best-effort and returns [] on any error so the scheduled job can never throw or touch
 * the order path.
 *
 * Dedup is PERMANENT, not a window: once we ask an order for a review, we never ask again. We stamp
 * `order.metadata.review_request_at` and the predicate refuses any order already stamped — no new
 * table, no migration.
 */

import { pool } from './lumera-db';

/**
 * Days after the reference moment (delivery when known, else order placement) before we ask.
 * Default 7. NOTE: when the finder keys off order creation, set this comfortably above your typical
 * shipping time (MAX_SHIPPING_DAYS) so the ask never lands before the piece does.
 */
export function delayDays(): number {
  const v = Number(process.env.REVIEW_REQUEST_DELAY_DAYS);
  return Number.isFinite(v) && v > 0 ? v : 7;
}

/** Days after which it's too late to bother asking. Default 45. */
export function maxDays(): number {
  const v = Number(process.env.REVIEW_REQUEST_MAX_DAYS);
  return Number.isFinite(v) && v > 0 ? v : 45;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReviewEligibilityInput {
  has_email: boolean;
  has_items: boolean;
  /** The clock we measure from: delivery timestamp when known, otherwise order placement. */
  reference_at: Date | string | null | undefined;
  /** When we already asked this order for a review, if ever (permanent dedup). */
  last_request_at?: Date | string | null;
}

function toTime(v: Date | string | null | undefined): number | null {
  if (v == null) return null;
  const t = v instanceof Date ? v.getTime() : new Date(v).getTime();
  return Number.isFinite(t) ? t : null;
}

/**
 * PURE eligibility predicate — unit-tested without a DB. An order is eligible for a review request iff:
 *   - it has an email and at least one item, and
 *   - we have NOT already asked it (permanent dedup), and
 *   - its reference moment sits inside the window [delayDays, maxDays] relative to `now`.
 */
export function isReviewEligible(input: ReviewEligibilityInput, now: Date = new Date()): boolean {
  if (!input.has_email || !input.has_items) return false;
  if (toTime(input.last_request_at) != null) return false; // asked once → never again

  const ref = toTime(input.reference_at);
  if (ref == null) return false;

  const ageMs = now.getTime() - ref;
  if (ageMs < delayDays() * DAY_MS) return false; // give them time to receive + live with it
  if (ageMs > maxDays() * DAY_MS) return false; // too late to matter

  return true;
}

export interface ReviewableOrder {
  id: string;
  email: string;
  display_id: string;
  currency_code: string;
  reference_at: string;
  last_request_at: string | null;
  items: Array<{ title: string }>;
}

/**
 * Read-only finder for orders due a review request. Best-effort: returns [] on any DB error or when
 * the expected Medusa order tables are absent (fixture-safe). Keys off `order.created_at` (the
 * reliable column) within a loose window; the PURE predicate above is the authority on final
 * eligibility. Already-stamped orders are excluded in SQL as a first-pass filter.
 */
export async function findReviewableOrders(now: Date = new Date()): Promise<ReviewableOrder[]> {
  const windowStart = new Date(now.getTime() - maxDays() * DAY_MS).toISOString();
  const windowEnd = new Date(now.getTime() - delayDays() * DAY_MS).toISOString();

  const sql = `
    SELECT
      o.id,
      o.email,
      o.display_id,
      o.currency_code,
      o.created_at AS reference_at,
      (o.metadata ->> 'review_request_at') AS last_request_at,
      COALESCE(
        json_agg(json_build_object('title', li.title)) FILTER (WHERE li.id IS NOT NULL),
        '[]'
      ) AS items
    FROM "order" o
    JOIN order_item oi ON oi.order_id = o.id AND oi.deleted_at IS NULL
    JOIN order_line_item li ON li.id = oi.item_id AND li.deleted_at IS NULL
    WHERE o.deleted_at IS NULL
      AND o.email IS NOT NULL AND o.email <> ''
      AND o.created_at >= $1
      AND o.created_at <= $2
      AND (o.metadata ->> 'review_request_at') IS NULL
    GROUP BY o.id
    LIMIT 500
  `;

  const result = await pool()
    .query(sql, [windowStart, windowEnd])
    .catch(() => ({ rows: [] as any[] }));

  return (result.rows as any[]).map((r) => ({
    id: String(r.id),
    email: String(r.email),
    display_id: String(r.display_id ?? r.id),
    currency_code: String(r.currency_code || 'usd'),
    reference_at: r.reference_at instanceof Date ? r.reference_at.toISOString() : String(r.reference_at),
    last_request_at: r.last_request_at ? String(r.last_request_at) : null,
    items: Array.isArray(r.items) ? r.items.map((i: any) => ({ title: String(i.title ?? 'Item') })) : [],
  }));
}

/**
 * Best-effort permanent dedup stamp. Writes `metadata.review_request_at = now` onto the order,
 * merging into existing jsonb metadata. Never throws.
 */
export async function stampReviewRequest(orderId: string, now: Date = new Date()): Promise<void> {
  const sql = `
    UPDATE "order"
    SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('review_request_at', $2::text)
    WHERE id = $1
  `;
  await pool()
    .query(sql, [orderId, now.toISOString()])
    .catch(() => undefined);
}
