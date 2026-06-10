/**
 * Newsletter capture — the top-of-funnel front door to the email list. We OWN the list (a tiny
 * idempotent table, created on first use like the Ledger) and ALSO notify the ESP (Klaviyo) so the
 * email-first growth engine (Herald campaigns, Loyalist journeys) has an audience of non-buyers, not
 * just customers. Pure email validation here is unit-tested; the DB write is best-effort.
 */

import { pool } from './lumera-db';

/**
 * Conservative, dependency-free email normalize+validate. Good enough to gate capture (the ESP does
 * real deliverability verification). Returns the trimmed, lower-cased address, or null if invalid.
 */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const e = raw.trim().toLowerCase();
  if (e.length < 5 || e.length > 254) return null;
  // exactly one @, non-empty local part, a domain with a dot and a 2+ char TLD, no whitespace.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return null;
  if (e.includes('..')) return null;
  return e;
}

let _ensured: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  if (_ensured) return _ensured;
  // CREATE for fresh DBs; ALTER ADD COLUMN IF NOT EXISTS so pre-existing tables gain unsubscribed_at
  // (the CAN-SPAM suppression marker) without a separate migration. Multi-statement, no params.
  _ensured = pool()
    .query(`
      CREATE TABLE IF NOT EXISTS lumera_newsletter_subscriber (
        email text primary key,
        source text,
        created_at timestamptz not null default now(),
        unsubscribed_at timestamptz
      );
      ALTER TABLE lumera_newsletter_subscriber ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz;
    `)
    .then(() => undefined)
    .catch((e: any) => {
      _ensured = null; // don't cache a failure — retry next call
      throw e;
    });
  return _ensured;
}

/**
 * Persist a subscriber (idempotent — re-subscribing is a no-op, never an error). Best-effort:
 * returns false on any DB error so the capture UX is never blocked by a storage blip.
 */
export async function saveSubscriber(email: string, source = 'storefront'): Promise<boolean> {
  try {
    await ensureTable();
    // Re-subscribing clears any prior unsubscribe (an explicit opt-in overrides a past opt-out).
    await pool().query(
      `INSERT INTO lumera_newsletter_subscriber (email, source) VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET unsubscribed_at = NULL`,
      [email, (source || 'storefront').slice(0, 40)]
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Record a CAN-SPAM unsubscribe (idempotent; upserts the row if we never saw the address). Best-effort
 * — returns false on an invalid address or any DB error so the unsubscribe handler still confirms to
 * the user (the ESP also maintains its own suppression list).
 */
export async function recordUnsubscribe(email: string): Promise<boolean> {
  const e = normalizeEmail(email);
  if (!e) return false;
  try {
    await ensureTable();
    await pool().query(
      `INSERT INTO lumera_newsletter_subscriber (email, source, unsubscribed_at)
       VALUES ($1, 'unsubscribe', now())
       ON CONFLICT (email) DO UPDATE SET unsubscribed_at = now()`,
      [e]
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Whether an address has opted out of marketing. Best-effort: on a DB error we return false (don't
 * hard-block the whole marketing lane on a storage blip) — the per-recipient send path and the ESP
 * provide additional suppression layers.
 */
export async function isSuppressed(email: string): Promise<boolean> {
  const e = normalizeEmail(email);
  if (!e) return false;
  try {
    await ensureTable();
    const { rows } = await pool().query(
      `SELECT 1 FROM lumera_newsletter_subscriber WHERE email = $1 AND unsubscribed_at IS NOT NULL LIMIT 1`,
      [e]
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}
