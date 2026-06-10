import type { MedusaContainer } from '@medusajs/framework';
import {
  findReviewableOrders,
  isReviewEligible,
  stampReviewRequest,
} from '../lib/review-request';
import { renderReviewRequest, sendEmail, trackKlaviyoEvent } from '../lib/email';
import { marketingAllowed } from '../lib/email-compliance';
import { isSuppressed } from '../lib/newsletter';

/**
 * Post-purchase review request — daily scheduled job.
 *
 * Finds orders with an email + items whose reference moment sits inside the request window and that
 * have never been asked, then sends a single on-brand review request (Resend, mock-until-keyed) and
 * fires a Klaviyo "Review Requested" event. Permanent dedup via order.metadata.review_request_at.
 *
 * Safety (identical posture to abandoned-cart):
 *   - Gated behind REVIEW_REQUEST_ENABLED=true (default OFF) — never sends unexpectedly.
 *   - No-ops when DATABASE_URL is absent (fixture-safe).
 *   - Every step is wrapped so a failure can never throw out of the scheduled job; the finder is
 *     read-only and the stamp is best-effort. Never interferes with order placement.
 */
export default async function reviewRequest(_container: MedusaContainer) {
  if (process.env.REVIEW_REQUEST_ENABLED !== 'true') {
    console.log('[review-request] disabled (set REVIEW_REQUEST_ENABLED=true to enable); skipping.');
    return;
  }
  if (!process.env.DATABASE_URL) {
    console.warn('[review-request] DATABASE_URL not set; skipping.');
    return;
  }
  // CAN-SPAM: the review request is a marketing email — require a postal address (in production).
  if (!marketingAllowed()) {
    console.warn('[review-request] COMPANY_POSTAL_ADDRESS not set in production; skipping (CAN-SPAM).');
    return;
  }

  const now = new Date();
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const orders = await findReviewableOrders(now);

    for (const order of orders) {
      try {
        const eligible = isReviewEligible(
          {
            has_email: Boolean(order.email),
            has_items: order.items.length > 0,
            reference_at: order.reference_at,
            last_request_at: order.last_request_at,
          },
          now
        );
        if (!eligible) {
          skipped++;
          continue;
        }

        // Honor unsubscribes (CAN-SPAM): never email an address that opted out.
        if (await isSuppressed(order.email)) {
          skipped++;
          continue;
        }

        const email = renderReviewRequest({
          email: order.email,
          display_id: order.display_id,
          items: order.items,
        });

        const result = await sendEmail(email);

        // Stamp dedup regardless of provider keying: a mock-until-keyed no-op still counts as
        // "asked this order" so we never loop on the same order while unkeyed.
        await stampReviewRequest(order.id, now);

        await trackKlaviyoEvent('Review Requested', order.email, {
          order_id: order.id,
          display_id: order.display_id,
          item_count: order.items.length,
        }).catch(() => undefined);

        if (result.sent) sent++;
        else skipped++; // unkeyed/mock — counted as handled, not a failure
      } catch (e: any) {
        failed++;
        console.warn('[review-request] order failed:', e?.message?.slice(0, 80));
      }
    }
  } catch (e: any) {
    console.warn('[review-request] run failed:', e?.message?.slice(0, 80));
  }

  console.log(`[review-request] done — sent=${sent} skipped=${skipped} failed=${failed}`);
}

// Daily at 10:00 — late enough that morning deliveries from prior days are settled.
export const config = { name: 'review-request', schedule: '0 10 * * *' };
