import { defineMiddlewares } from '@medusajs/framework/http';
import { rateLimit } from '../lib/security';

/**
 * Lumera HTTP middlewares.
 * - Per-IP rate limiting on public store + ops APIs (DoS / brute-force / LLM-cost control).
 *   Auto-disabled under test and tunable via RATE_LIMIT_* so CI/dev are never throttled.
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
      matcher: '/admin/lumera/*',
      middlewares: [rateLimit({ max: Number(process.env.RATE_LIMIT_OPS_MAX ?? 120) })],
    },
    {
      matcher: '/hooks/stripe',
      bodyParser: { preserveRawBody: true },
    },
  ],
});
