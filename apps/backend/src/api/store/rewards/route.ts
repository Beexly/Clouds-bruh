import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { MONETIZATION_MODULE } from '../../../modules/monetization';

/** GET ?customer_id= (or visitor_id) — Luminance state: balance, tier, next blessing. */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const id = (req.query.customer_id as string) || (req.query.visitor_id as string);
  if (!id) return res.status(400).json({ error: 'customer_id or visitor_id is required' });
  const svc: any = req.scope.resolve(MONETIZATION_MODULE);
  res.json(await svc.rewardsSummary(id));
};
