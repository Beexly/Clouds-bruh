import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { shippingPromise } from '../../../lib/lumera-db';

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as { items?: Array<{ lead_time_days?: number }>; max_days?: number };
  const itemMax = Math.max(...(body.items ?? []).map((item) => Number(item.lead_time_days ?? 0)), 0);
  const maxDays = Number(body.max_days ?? (itemMax || Number(process.env.MAX_SHIPPING_DAYS ?? 12)));
  res.json({ promise: shippingPromise(maxDays) });
};
