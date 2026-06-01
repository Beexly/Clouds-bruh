import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { RECOMMENDATION_MODULE } from '../../../../modules/recommendation';

// POST /store/recommendations/attribute — close the rec loop: click or convert.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { rec_id, kind, visitor_id, block } = req.body as {
    rec_id?: string;
    kind?: 'click' | 'convert';
    visitor_id?: string;
    block?: string;
  };
  if (!kind || !['click', 'convert'].includes(kind)) {
    return res.status(400).json({ error: 'kind must be click or convert' });
  }
  const oracle = req.scope.resolve(RECOMMENDATION_MODULE) as any;
  if (rec_id) {
    await oracle.attribute(rec_id, kind).catch(() => {});
  }
  if (visitor_id && block && kind === 'convert') {
    await oracle.reward(visitor_id, block, 1).catch(() => {});
  }
  res.json({ ok: true });
}
