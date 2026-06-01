import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { MONETIZATION_MODULE } from '../../../../modules/monetization';

/** GET ?customer_id= — what this customer can access (Patron gating). */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = req.query.customer_id as string;
  if (!customerId) return res.status(400).json({ error: 'customer_id is required' });
  const svc: any = req.scope.resolve(MONETIZATION_MODULE);
  res.json({ customer_id: customerId, ...(await svc.entitlementsFor(customerId)) });
};
