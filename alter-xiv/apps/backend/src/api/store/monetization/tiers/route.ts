import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { MONETIZATION_MODULE } from '../../../../modules/monetization';

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(MONETIZATION_MODULE);
  const tiers = await svc.listMembershipTiers({ active: true });
  res.json({ tiers });
};
