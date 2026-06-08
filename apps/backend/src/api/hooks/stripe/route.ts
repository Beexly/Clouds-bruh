import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { recordWebhook, verifyStripeWebhook } from '../../../lib/lumera-db';

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const eventType = (req.body as any)?.type || 'stripe.webhook';
  // Stripe signs the RAW body. Use req.rawBody when the framework preserves it; fall back to the
  // re-serialized body (works when no secret is set / for local recording).
  const rawBody = (req as any).rawBody ? String((req as any).rawBody) : JSON.stringify(req.body ?? {});
  const verification = verifyStripeWebhook(rawBody, req.headers['stripe-signature'] as string | undefined);
  if (!verification.valid) return res.status(401).json({ error: verification.proof });
  const event = await recordWebhook('manual', eventType, req.body ?? {});
  res.status(202).json({ ...event, verification });
};
