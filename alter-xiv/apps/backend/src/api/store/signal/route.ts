import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { SIGNAL_MODULE } from '../../../modules/signal';
import { PERSONALIZATION_MODULE } from '../../../modules/personalization';
import type { SignalEvent } from '@alterxiv/shared';

// POST /store/signal  — the storefront fires every interaction here.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const event = req.body as SignalEvent;
  const signal = req.scope.resolve(SIGNAL_MODULE) as any;
  const mind = req.scope.resolve(PERSONALIZATION_MODULE) as any;
  await signal.ingest(event);
  await mind.observe(event);          // real-time personalization
  res.status(202).json({ ok: true });
}
