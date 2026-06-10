/**
 * CAN-SPAM compliance for Lumera's MARKETING emails (abandoned-cart, review-request, newsletter
 * campaigns). U.S. law requires every commercial email to carry (1) a working unsubscribe mechanism
 * and (2) a valid physical postal address. Transactional mail (order confirmation, shipment) is
 * exempt and intentionally does NOT get this footer.
 *
 * The unsubscribe link carries an HMAC-signed token of the recipient's address, so the unsubscribe
 * endpoint can verify the request and record suppression WITHOUT a database lookup or a login — a
 * one-click unsubscribe that can't be forged to suppress someone else's address.
 *
 * Pure + dependency-light (node:crypto only) so the token round-trip and footer are unit-tested.
 */
import crypto from 'node:crypto';

function secret(): string {
  // Dedicated secret if provided; fall back to the ops key; finally a dev-only constant so local/test
  // runs work. In production set UNSUBSCRIBE_SECRET (or COCKPIT_KEY) to a real random value.
  return process.env.UNSUBSCRIBE_SECRET || process.env.COCKPIT_KEY || 'lumera-dev-unsubscribe-secret';
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url').slice(0, 24);
}

/** Minimal email shape check, mirrors lib/newsletter.normalizeEmail's regex. */
function looksLikeEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

/** Local HTML escape (email-compliance is self-contained; mirrors lib/email.escapeHtml). */
function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Signed, URL-safe unsubscribe token for an address: `<base64url(email)>.<hmac>`. */
export function unsubscribeToken(email: string): string {
  const e = String(email ?? '').trim().toLowerCase();
  const payload = Buffer.from(e).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

/** Verify a token and return the email it authorizes, or null if missing/tampered/malformed. */
export function verifyUnsubscribeToken(token: unknown): string | null {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  // Constant-time compare; timingSafeEqual requires equal length, so length-check first.
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const email = Buffer.from(payload, 'base64url').toString('utf8').trim().toLowerCase();
    return looksLikeEmail(email) ? email : null;
  } catch {
    return null;
  }
}

/** The configured business postal address (CAN-SPAM requirement), or null when unset. */
export function postalAddress(): string | null {
  const a = process.env.COMPANY_POSTAL_ADDRESS?.trim();
  return a && a.length > 0 ? a : null;
}

/**
 * Whether a compliant MARKETING email may be sent. Requires a postal address; outside production we
 * allow sending with a placeholder footer so the lane is testable. In production, no address ⇒ do not
 * send (better to skip than to ship a non-compliant email).
 */
export function marketingAllowed(): boolean {
  if (postalAddress()) return true;
  return process.env.NODE_ENV !== 'production';
}

/** Base URL of the backend that hosts the unsubscribe route (the link target). */
function backendBase(): string {
  return (process.env.MEDUSA_BACKEND_URL || process.env.BACKEND_URL || 'https://lumeralabel.com').replace(/\/+$/, '');
}

/** Full one-click unsubscribe URL for an address. */
export function unsubscribeUrl(email: string): string {
  return `${backendBase()}/unsubscribe?token=${encodeURIComponent(unsubscribeToken(email))}`;
}

/**
 * The CAN-SPAM footer block, in the dark editorial palette, appended to marketing emails. Carries the
 * postal address (or a clearly-marked dev placeholder) and the one-click unsubscribe link.
 */
export function marketingFooter(opts: { email: string; reason?: string }): string {
  const addr = postalAddress() ?? 'Postal address pending — set COMPANY_POSTAL_ADDRESS';
  const reason =
    opts.reason ?? 'You’re receiving this because you joined The Broadcast or placed an order with Lumera.';
  const unsub = unsubscribeUrl(opts.email);
  return `
      <div style="margin:44px 0 0;padding-top:20px;border-top:1px solid #1c1c22;font-size:11px;line-height:1.7;color:#5C5C63;">
        <p style="margin:0 0 6px;">${esc(reason)}</p>
        <p style="margin:0 0 6px;">Lumera · ${esc(addr)}</p>
        <p style="margin:0;">
          <a href="${esc(unsub)}" style="color:#7A7A82;text-decoration:underline;">Unsubscribe</a>
          &mdash; you won’t receive marketing emails from us again.
        </p>
      </div>`;
}
