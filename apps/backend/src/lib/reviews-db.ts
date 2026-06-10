import pg from 'pg';
import crypto from 'node:crypto';

/**
 * Lumera customer reviews — own pg pool, parameterized SQL only.
 *
 * Self-contained (does not import lib/lumera-db.ts) so the reviews lane owns its own connection and
 * table lifecycle. The table is created lazily via ensureReviewTables() on first use. Reviews are
 * "published" by default; `verified` is a manual/automation flag (e.g. matched to a real order) and
 * defaults to false — a review is NOT trusted as verified just because an order_id is supplied.
 */

export type ReviewStatus = 'published' | 'hidden';

export interface ReviewInput {
  product_id: string;
  order_id?: string | null;
  email?: string | null;
  rating: number;
  title?: string | null;
  body: string;
  verified?: boolean;
}

export interface Review {
  id: string;
  product_id: string;
  order_id: string | null;
  email: string | null;
  rating: number;
  title: string | null;
  body: string;
  verified: boolean;
  status: ReviewStatus;
  created_at: string;
}

export interface ReviewStats {
  count: number;
  average: number;
}

let _pool: pg.Pool | null = null;

export function pool() {
  if (_pool) return _pool;
  _pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://alterxiv:alterxiv@localhost:5432/alterxiv',
  });
  return _pool;
}

export async function ensureReviewTables() {
  await pool().query(`
    CREATE TABLE IF NOT EXISTS lumera_review (
      id text primary key,
      product_id text not null,
      order_id text,
      email text,
      rating integer not null check (rating >= 1 and rating <= 5),
      title text,
      body text not null,
      verified boolean not null default false,
      status text not null default 'published',
      created_at timestamptz not null default now()
    );
    CREATE INDEX IF NOT EXISTS idx_lumera_review_product ON lumera_review (product_id, created_at DESC);
  `);
}

// ── Pure helpers (no DB — unit-testable) ───────────────────────────────────────

const MIN_BODY = 4;
const MAX_BODY = 5000;
const MAX_TITLE = 200;

/**
 * Validate review input independent of the DB so both the route and tests can reuse it. Returns the
 * normalized, safe-to-insert fields on success, or a human-readable error string. `verified` is
 * never trusted from the client; it is forced to false here.
 */
export function validateReviewInput(
  raw: Partial<ReviewInput> | null | undefined
):
  | { ok: true; value: ReviewInput & { product_id: string; rating: number; body: string } }
  | { ok: false; error: string } {
  const input = raw ?? {};

  const product_id = String(input.product_id ?? '').trim();
  if (!product_id) return { ok: false, error: 'product_id is required' };

  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: 'rating must be an integer between 1 and 5' };
  }

  const body = String(input.body ?? '').trim();
  if (body.length < MIN_BODY) return { ok: false, error: `body must be at least ${MIN_BODY} characters` };
  if (body.length > MAX_BODY) return { ok: false, error: `body must be at most ${MAX_BODY} characters` };

  const title = input.title != null ? String(input.title).trim().slice(0, MAX_TITLE) : null;
  const email = input.email != null ? String(input.email).trim().slice(0, 320) || null : null;
  const order_id = input.order_id != null ? String(input.order_id).trim() || null : null;

  return {
    ok: true,
    value: {
      product_id,
      rating,
      body,
      title: title || null,
      email,
      order_id,
      // `verified` is never trusted from the client; force false here. Automation/admin can flip it.
      verified: false,
    },
  };
}

/**
 * Compute review stats from a list of ratings. Pure so the math is unit-testable without a DB.
 * Average is rounded to one decimal; empty input yields {count:0, average:0}.
 */
export function computeReviewStats(ratings: Array<number | { rating: number }>): ReviewStats {
  const values = ratings
    .map((r) => (typeof r === 'number' ? r : Number(r?.rating)))
    .filter((n) => Number.isFinite(n));
  if (values.length === 0) return { count: 0, average: 0 };
  const sum = values.reduce((s, n) => s + n, 0);
  return { count: values.length, average: Math.round((sum / values.length) * 10) / 10 };
}

/**
 * Whether a review must be tied to a verified purchase to be published. Default: required in
 * production (a store's AggregateRating must not be fed by reviews from people who never bought —
 * an FTC fake-review exposure and a trust hole). Overridable via REVIEWS_REQUIRE_VERIFIED_PURCHASE.
 */
export function reviewsRequireVerifiedPurchase(): boolean {
  const flag = process.env.REVIEWS_REQUIRE_VERIFIED_PURCHASE;
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return process.env.NODE_ENV === 'production';
}

/**
 * PURE policy decision: given the verified-purchase requirement and whether this purchase was
 * verified, decide whether to accept the review and what its `verified` flag should be. Unit-tested.
 */
export function decideReviewAcceptance(opts: {
  requireVerified: boolean;
  purchaseVerified: boolean;
}): { accept: boolean; verified: boolean; error?: string } {
  if (opts.requireVerified && !opts.purchaseVerified) {
    return {
      accept: false,
      verified: false,
      error:
        'We only publish reviews from verified purchases. Include the order number and the email on the order so we can confirm it.',
    };
  }
  return { accept: true, verified: opts.purchaseVerified };
}

/**
 * Confirm the address actually bought the product on the referenced order. Matches by email +
 * product_id and either the internal order id or the display number. Best-effort (→ false on any
 * error) so a storage blip can't crash the review path. Real-DB behavior is proven on CI verify:api.
 */
export async function verifyReviewPurchase(
  email: string | null | undefined,
  orderRef: string | null | undefined,
  productId: string
): Promise<boolean> {
  const e = String(email ?? '').trim().toLowerCase();
  const ref = String(orderRef ?? '').trim().replace(/^#/, '');
  if (!e || !ref || !productId) return false;
  try {
    const { rows } = await pool().query(
      `SELECT 1
         FROM "order" o
         JOIN order_item oi ON oi.order_id = o.id AND oi.deleted_at IS NULL
         JOIN order_line_item li ON li.id = oi.item_id AND li.deleted_at IS NULL
        WHERE o.deleted_at IS NULL
          AND lower(o.email) = $1
          AND li.product_id = $2
          AND (o.id = $3 OR CAST(o.display_id AS text) = $3)
        LIMIT 1`,
      [e, productId, ref]
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

// ── DB operations (parameterized SQL only) ─────────────────────────────────────

export async function createReview(input: ReviewInput): Promise<Review> {
  await ensureReviewTables();
  const id = `rev_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  const result = await pool().query(
    `INSERT INTO lumera_review (id, product_id, order_id, email, rating, title, body, verified, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id, product_id, order_id, email, rating, title, body, verified, status, created_at`,
    [
      id,
      input.product_id,
      input.order_id ?? null,
      input.email ?? null,
      input.rating,
      input.title ?? null,
      input.body,
      input.verified ?? false,
      'published',
    ]
  );
  return rowToReview(result.rows[0]);
}

export async function listReviews(productId: string): Promise<Review[]> {
  await ensureReviewTables();
  const result = await pool().query(
    `SELECT id, product_id, order_id, email, rating, title, body, verified, status, created_at
       FROM lumera_review
      WHERE product_id = $1 AND status = 'published'
      ORDER BY created_at DESC
      LIMIT 200`,
    [productId]
  );
  return result.rows.map(rowToReview);
}

export async function productReviewStats(productId: string): Promise<ReviewStats> {
  await ensureReviewTables();
  const result = await pool().query(
    `SELECT count(*)::int AS count, COALESCE(avg(rating), 0)::float AS average
       FROM lumera_review
      WHERE product_id = $1 AND status = 'published'`,
    [productId]
  );
  const row = result.rows[0] ?? { count: 0, average: 0 };
  return {
    count: Number(row.count ?? 0),
    average: Math.round(Number(row.average ?? 0) * 10) / 10,
  };
}

function rowToReview(row: any): Review {
  return {
    id: String(row.id),
    product_id: String(row.product_id),
    order_id: row.order_id != null ? String(row.order_id) : null,
    email: row.email != null ? String(row.email) : null,
    rating: Number(row.rating),
    title: row.title != null ? String(row.title) : null,
    body: String(row.body),
    verified: Boolean(row.verified),
    status: (row.status as ReviewStatus) ?? 'published',
    created_at:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at ?? new Date().toISOString()),
  };
}
