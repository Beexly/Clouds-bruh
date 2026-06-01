import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { RECOMMENDATION_MODULE } from '../../../modules/recommendation';

// GET /store/recommendations?visitor_id=&strategy=for_you&limit=12
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { visitor_id, strategy = 'for_you', limit = '12' } = req.query as Record<string, string>;
  const oracle = req.scope.resolve(RECOMMENDATION_MODULE) as any;
  const product_ids = await oracle.forVisitor(visitor_id, strategy, Number(limit));
  res.json({ strategy, product_ids });
}
