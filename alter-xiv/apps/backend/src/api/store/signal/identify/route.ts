import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { PERSONALIZATION_MODULE } from '../../../../modules/personalization';

// POST /store/signal/identify — merge anonymous visitor → identified customer on login/checkout.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { visitor_id, customer_id } = req.body as { visitor_id?: string; customer_id?: string };
  if (!visitor_id || !customer_id) {
    return res.status(400).json({ error: 'visitor_id and customer_id required' });
  }
  const mind = req.scope.resolve(PERSONALIZATION_MODULE) as any;
  await mind.identify(visitor_id, customer_id);
  res.status(200).json({ ok: true });
}
