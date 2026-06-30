import { authenticate, defineMiddlewares } from '@medusajs/framework/http';
import { rateLimit } from '../lib/security';

/**
 * Lumera HTTP middlewares.
 * - Per-IP rate limiting on public store + ops APIs (DoS / brute-force / LLM-cost control).
 *   Auto-disabled under test and tunable via RATE_LIMIT_* so CI/dev are never throttled.
 * - Customer authentication on money/membership-sensitive reads (wallet + entitlements) so they are
 *   bound to the logged-in customer and can't be read for an arbitrary ?customer_id= (IDOR).
 * - preserveRawBody on the Stripe webhook so signature verification can hash the exact bytes
 *   Stripe signed (verifyStripeWebhook needs the raw body, not re-serialized JSON).
 */
export default defineMiddlewares({
  routes: [
    {
      matcher: '/store/*',
      middlewares: [rateLimit()],
    },
    {
      // Lumens wallet (balance + full credit ledger) — authenticated customer only.
      matcher: '/store/monetization/wallet',
      method: ['GET'],
      middlewares: [authenticate('customer', ['bearer', 'session'])],
    },
    {
      // Membership entitlements (Patron gating) — authenticated customer only.
      matcher: '/store/monetization/entitlements',
      method: ['GET'],
      middlewares: [authenticate('customer', ['bearer', 'session'])],
    },
    {
      matcher: '/admin/lumera/*',
      middlewares: [rateLimit({ max: Number(process.env.RATE_LIMIT_OPS_MAX ?? 120) })],
    },
    {
      matcher: '/hooks/stripe',
      bodyParser: { preserveRawBody: true },
    },
    {
      // Vendor webhooks are HMAC-signed over the raw bytes; preserve them for correct verification.
      matcher: '/hooks/vendor/*',
      bodyParser: { preserveRawBody: true },
    },
  ],
});
