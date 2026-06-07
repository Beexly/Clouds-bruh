import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { processVendorWebhook, recordWebhook, verifyVendorWebhook } from '../../../../lib/lumera-db';

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const eventType = (req.headers['x-printify-event'] as string) || 'printify.webhook';
  const verification = verifyVendorWebhook('printify', req.body ?? {}, req.headers as any);
  if (!verification.valid) return res.status(401).json({ error: verification.proof });
  const event = await recordWebhook('printify', eventType, req.body ?? {});
  const processed = await processVendorWebhook('printify', req.body ?? {});
  res.status(202).json({ ...event, verification, processed });
};
