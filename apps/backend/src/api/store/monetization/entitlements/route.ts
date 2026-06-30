import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { MONETIZATION_MODULE } from '../../../../modules/monetization';

/**
 * GET — what the AUTHENTICATED customer can access (Patron gating).
 * Bound to req.auth_context (Bearer/session) so membership/entitlement state can't be read for an
 * arbitrary ?customer_id=. The /store/monetization/entitlements route is authenticated via
 * api/middlewares.ts.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = (req as any).auth_context?.actor_id as string | undefined;
  if (!customerId) return res.status(401).json({ error: 'authentication required' });
  const svc: any = req.scope.resolve(MONETIZATION_MODULE);
  res.json({ customer_id: customerId, ...(await svc.entitlementsFor(customerId)) });
};
