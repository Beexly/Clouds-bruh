import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { recordWebhook, verifyVendorWebhook } from '../../../lib/lumera-db';

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const eventType = (req.body as any)?.type || 'stripe.webhook';
  const verification = verifyVendorWebhook('stripe', req.body ?? {}, req.headers as any);
  if (!verification.valid) return res.status(401).json({ error: verification.proof });
  const event = await recordWebhook('manual', eventType, req.body ?? {});
  res.status(202).json({ ...event, verification });
};
