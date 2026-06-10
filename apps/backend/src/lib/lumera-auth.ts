import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';

/**
 * Gate for Lumera's internal ops surfaces (cockpit, approvals, analyst BI).
 *
 * - A COCKPIT_KEY is configured → require an exact `x-cockpit-key` header match (header-only; never
 *   accept the key via query string — it leaks into access logs, proxies, browser history).
 * - No key configured → fail CLOSED in production, and also whenever COCKPIT_REQUIRE_KEY=true. Set
 *   that flag on any internet-reachable non-production deploy (staging/preview) so an unkeyed ops API
 *   is never exposed there. Open only on genuine local/dev where neither condition holds.
 */
export function authorizeOps(req: MedusaRequest, res: MedusaResponse): boolean {
  const required = process.env.COCKPIT_KEY;
  const provided = req.headers['x-cockpit-key'] as string;
  if (required && provided !== required) {
    res.status(401).json({ error: 'unauthorized' });
    return false;
  }
  const mustHaveKey = process.env.NODE_ENV === 'production' || process.env.COCKPIT_REQUIRE_KEY === 'true';
  if (!required && mustHaveKey) {
    res.status(401).json({ error: 'unauthorized - set COCKPIT_KEY to expose Lumera ops APIs' });
    return false;
  }
  return true;
}
