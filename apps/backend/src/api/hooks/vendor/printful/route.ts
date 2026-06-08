import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { processVendorWebhook, recordWebhook, verifyVendorWebhook } from '../../../../lib/lumera-db';

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const eventType = (req.body as any)?.type || 'printful.webhook';
    const rawBody = (req as any).rawBody ? String((req as any).rawBody) : undefined;
    const verification = verifyVendorWebhook('printful', req.body ?? {}, req.headers as any, rawBody);
    if (!verification.valid) return res.status(401).json({ error: verification.proof });
    const event = await recordWebhook('printful', eventType, req.body ?? {});
    const processed = await processVendorWebhook('printful', req.body ?? {});
    res.status(202).json({ ...event, verification, processed });
  } catch (e: any) {
    res.status(500).json({ error: 'webhook_processing_failed', detail: e?.message?.slice(0, 120) });
  }
};
