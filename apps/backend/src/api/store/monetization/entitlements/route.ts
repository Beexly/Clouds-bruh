import type { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework';
import { MONETIZATION_MODULE } from '../../../../modules/monetization';

/** GET — what the AUTHENTICATED customer can access (Patron gating). */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const customerId = req.auth_context?.actor_id;
  if (!customerId) return res.status(401).json({ error: 'authentication required' });
  const svc: any = req.scope.resolve(MONETIZATION_MODULE);
  res.json({ customer_id: customerId, ...(await svc.entitlementsFor(customerId)) });
};
