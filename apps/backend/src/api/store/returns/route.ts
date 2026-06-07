import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { createReturnCase } from '../../../lib/lumera-db';

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as { order_id?: string; email?: string; reason?: string };
  if (!body.order_id && !body.email) {
    return res.status(400).json({ error: 'order_id or email is required' });
  }
  const returnCase = await createReturnCase({ ...body, payload: body });
  res.status(202).json({
    return_case: returnCase,
    message: 'Return request received. Shepherd will reconcile supplier policy, return window, and refund path.',
  });
};
