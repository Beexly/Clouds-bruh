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

// GET /store/signal?visitor_id=:id  — retrieve current visitor profile (for debug + storefront personalization).
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const visitorId = req.query.visitor_id as string;
  if (!visitorId) return res.status(400).json({ error: 'visitor_id required' });
  const mind = req.scope.resolve(PERSONALIZATION_MODULE) as any;
  const profiles = await mind.listVisitorProfiles({ visitor_id: visitorId }, { take: 1 }).catch(() => []);
  const profile = profiles[0] ?? null;
  res.json({ profile });
}
