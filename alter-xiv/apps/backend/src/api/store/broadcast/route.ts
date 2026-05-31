import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { RECOMMENDATION_MODULE } from '../../../modules/recommendation';
import { DROPS_MODULE } from '../../../modules/drops';

// GET /store/broadcast?visitor_id=  — personalized, bandit-ordered homepage.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { visitor_id = 'anonymous' } = req.query as Record<string, string>;
  const drops = req.scope.resolve(DROPS_MODULE) as any;
  const oracle = req.scope.resolve(RECOMMENDATION_MODULE) as any;

  const [live, forYou, trending, graphRec, completeTheSet] = await Promise.all([
    drops.listLive().catch(() => []),
    oracle.forVisitor(visitor_id, 'for_you', 8),
    oracle.forVisitor(visitor_id, 'trending_in_chapter', 8),
    oracle.forVisitor(visitor_id, 'graph_rec', 8),
    oracle.forVisitor(visitor_id, 'complete_the_set', 8),
  ]);

  // Only rank blocks that actually have content (an empty rail renders nothing).
  const blocks: Record<string, any[]> = {
    live_drops: live,
    for_you: forYou,
    trending_in_chapter: trending,
    graph_rec: graphRec,
    complete_the_set: completeTheSet,
  };
  const candidateBlocks = Object.entries(blocks)
    .filter(([, v]) => Array.isArray(v) && v.length > 0)
    .map(([k]) => k);
  const blockOrder = await oracle.rankBroadcastBlocks(visitor_id, candidateBlocks);

  res.json({ visitor_id, block_order: blockOrder, blocks });
}
