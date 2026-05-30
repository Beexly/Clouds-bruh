import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { RECOMMENDATION_MODULE } from '../../../modules/recommendation';
import { DROPS_MODULE } from '../../../modules/drops';

// GET /store/broadcast?visitor_id=  — personalized, dynamically-ordered home.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { visitor_id } = req.query as Record<string, string>;
  const drops = req.scope.resolve(DROPS_MODULE) as any;
  const oracle = req.scope.resolve(RECOMMENDATION_MODULE) as any;
  const live = await drops.listLive();
  const candidateBlocks = ['live_drops', 'for_you', 'trending_armor', 'complete_the_set', 'new_in_signal'];
  const order = await oracle.rankBroadcastBlocks(visitor_id, candidateBlocks); // bandit-ranked
  res.json({ drops: live, block_order: order });
}
