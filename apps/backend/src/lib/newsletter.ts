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
  _ensured = pool()
    .query(`
      CREATE TABLE IF NOT EXISTS lumera_newsletter_subscriber (
        email text primary key,
        source text,
        created_at timestamptz not null default now()
      );
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
    await pool().query(
      `INSERT INTO lumera_newsletter_subscriber (email, source) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING`,
      [email, (source || 'storefront').slice(0, 40)]
    );
    return true;
  } catch {
    return false;
  }
}
