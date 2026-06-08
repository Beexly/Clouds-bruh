import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { processVendorWebhook, recordWebhook, verifyVendorWebhook } from '../../../../lib/lumera-db';

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const eventType = (req.body as any)?.type || 'printful.webhook';
  const verification = verifyVendorWebhook('printful', req.body ?? {}, req.headers as any);
  if (!verification.valid) return res.status(401).json({ error: verification.proof });
  const event = await recordWebhook('printful', eventType, req.body ?? {});
  const processed = await processVendorWebhook('printful', req.body ?? {});
  res.status(202).json({ ...event, verification, processed });
};
