import type { MedusaContainer } from '@medusajs/framework';
import {
  findAbandonedCarts,
  isCartEligible,
  stampAbandonedEmail,
} from '../lib/abandoned-cart';
import { renderAbandonedCart, sendEmail, trackKlaviyoEvent } from '../lib/email';
import { marketingAllowed } from '../lib/email-compliance';
import { isSuppressed } from '../lib/newsletter';

/**
 * Abandoned-cart recovery — hourly scheduled job.
 *
 * Finds carts with items + an email + no completed order that have gone idle inside the recovery
 * window, then sends a single on-brand recovery email (Resend, mock-until-keyed) and fires a
 * Klaviyo "Abandoned Cart" event. Dedup is handled by stamping cart.metadata.last_abandoned_email_at
 * and refusing to re-send inside a 24h window (see lib/abandoned-cart.ts).
 *
 * Safety:
 *   - Gated behind ABANDONED_CART_ENABLED=true (default OFF) — never sends unexpectedly.
 *   - No-ops when DATABASE_URL is absent (fixture-safe).
 *   - Every step is wrapped so a failure can never throw out of the scheduled job and never
 *     interferes with order placement (the finder is read-only; the stamp is best-effort).
 */
export default async function abandonedCart(_container: MedusaContainer) {
  if (process.env.ABANDONED_CART_ENABLED !== 'true') {
    console.log('[abandoned-cart] disabled (set ABANDONED_CART_ENABLED=true to enable); skipping.');
    return;
  }
  if (!process.env.DATABASE_URL) {
    console.warn('[abandoned-cart] DATABASE_URL not set; skipping.');
    return;
  }
  // CAN-SPAM: never send a marketing email without a postal address (in production). Skip the run.
  if (!marketingAllowed()) {
    console.warn('[abandoned-cart] COMPANY_POSTAL_ADDRESS not set in production; skipping (CAN-SPAM).');
    return;
  }

  const now = new Date();
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const carts = await findAbandonedCarts(now);

    for (const cart of carts) {
      try {
        const eligible = isCartEligible(
          {
            has_items: cart.items.length > 0,
            has_email: Boolean(cart.email),
            has_order: false, // finder already excludes converted carts
            updated_at: cart.updated_at,
            last_email_at: cart.last_email_at,
          },
          now
        );
        if (!eligible) {
          skipped++;
          continue;
        }

        // Honor unsubscribes (CAN-SPAM): never email an address that opted out.
        if (await isSuppressed(cart.email)) {
          skipped++;
          continue;
        }

        const email = renderAbandonedCart({
          email: cart.email,
          currency_code: cart.currency_code,
          items: cart.items,
        });

        const result = await sendEmail(email);

        // Stamp dedup regardless of provider keying: a mock-until-keyed no-op still counts as
        // "attempted this cart" so we don't loop on the same cart every hour while unkeyed.
        await stampAbandonedEmail(cart.id, now);

        await trackKlaviyoEvent('Abandoned Cart', cart.email, {
          cart_id: cart.id,
          currency: cart.currency_code,
          item_count: cart.items.length,
          value_cents: cart.items.reduce((s, i) => s + i.unit_price * i.quantity, 0),
        }).catch(() => undefined);

        if (result.sent) sent++;
        else skipped++; // unkeyed/mock — counted as handled, not a failure
      } catch (e: any) {
        failed++;
        console.warn(`[abandoned-cart] cart ${cart.id} failed: ${(e?.message ?? 'unknown').slice(0, 120)}`);
      }
    }

    console.log(`[abandoned-cart] processed ${carts.length} candidate(s): sent=${sent} skipped=${skipped} failed=${failed}`);
  } catch (e: any) {
    // Belt-and-suspenders: the job must never throw.
    console.warn(`[abandoned-cart] run failed: ${(e?.message ?? 'unknown').slice(0, 120)}`);
  }
}

export const config = { name: 'abandoned-cart', schedule: '0 * * * *' }; // hourly
