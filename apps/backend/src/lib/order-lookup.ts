/**
 * Guest order lookup — "where's my order?" for shoppers who checked out without an account.
 * Read-only and anti-enumeration: requires BOTH the order number AND the matching email, and returns
 * a uniform "not matched" message either way (never reveals which was wrong). Pure validation here is
 * unit-tested; the DB read is best-effort/fixture-safe (→ not found on any error). We intentionally
 * return only safe, non-sensitive fields (number, date, item titles/qty) — no address, no totals.
 */

import { pool } from './lumera-db';
import { normalizeEmail } from './newsletter';

export type LookupInput = { ok: true; orderNo: number; email: string } | { ok: false; error: string };

/** PURE: validate + normalize a lookup request. order_no may carry a leading '#'. */
export function validateLookup(body: any): LookupInput {
  const raw =
    typeof body?.order_no === 'number'
      ? String(body.order_no)
      : typeof body?.order_no === 'string'
        ? body.order_no.trim().replace(/^#/, '')
        : '';
  const email = normalizeEmail(body?.email);
  if (!/^\d{1,12}$/.test(raw)) return { ok: false, error: 'A valid order number is required.' };
  if (!email) return { ok: false, error: 'A valid email is required.' };
  return { ok: true, orderNo: Number(raw), email };
}

export interface GuestOrder {
  found: boolean;
  order_no?: string;
  placed_at?: string;
  items?: Array<{ title: string; quantity: number }>;
}

/** Match an order by display_id + email (case-insensitive). Best-effort → { found:false } on error. */
export async function findGuestOrder(orderNo: number, email: string): Promise<GuestOrder> {
  try {
    const { rows } = await pool()
      .query(
        `SELECT o.id, o.display_id, o.created_at,
                COALESCE(
                  json_agg(json_build_object('title', li.title, 'quantity', oi.quantity))
                    FILTER (WHERE li.id IS NOT NULL),
                  '[]'
                ) AS items
           FROM "order" o
           LEFT JOIN order_item oi ON oi.order_id = o.id AND oi.deleted_at IS NULL
           LEFT JOIN order_line_item li ON li.id = oi.item_id AND li.deleted_at IS NULL
          WHERE o.deleted_at IS NULL
            AND o.display_id = $1
            AND lower(o.email) = $2
          GROUP BY o.id
          LIMIT 1`,
        [orderNo, email]
      )
      .catch(() => ({ rows: [] as any[] }));

    if (!rows.length) return { found: false };
    const r = rows[0] as any;
    return {
      found: true,
      order_no: String(r.display_id ?? orderNo),
      placed_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      items: Array.isArray(r.items)
        ? r.items.map((i: any) => ({ title: String(i.title ?? 'Item'), quantity: Number(i.quantity ?? 1) }))
        : [],
    };
  } catch {
    return { found: false };
  }
}
