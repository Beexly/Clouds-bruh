import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { RECOMMENDATION_MODULE } from '../../../modules/recommendation';

/**
 * GET /store/pricing?product_id= — ORACLE's STAGED dynamic-price recommendation.
 * Read-only: it never changes the catalog price (applying a change is a founder escalation).
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const productId = req.query.product_id as string;
  if (!productId) return res.status(400).json({ error: 'product_id is required' });
  try {
    const oracle: any = req.scope.resolve(RECOMMENDATION_MODULE);
    const rec = await oracle.dynamicPrice(productId);
    if (!rec) return res.status(404).json({ error: 'no price found for product' });
    res.json(rec);
  } catch (e: any) {
    res.status(500).json({ error: e.message?.slice(0, 200) });
  }
};
