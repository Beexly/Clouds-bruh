import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { validateLookup, findGuestOrder } from '../../../lib/order-lookup';

/**
 * POST /store/order-lookup — guest "track my order". Requires order_no + email (both), returns only
 * safe, non-sensitive fields, and gives a uniform not-found message so the endpoint can't be used to
 * enumerate which orders/emails exist. Read-only; never throws (best-effort lookup).
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const v = validateLookup(req.body ?? {});
  if (!v.ok) return res.status(400).json({ error: v.error });

  const order = await findGuestOrder(v.orderNo, v.email);
  if (!order.found) {
    return res.json({
      found: false,
      message: 'We couldn’t match that order number and email. Double-check both and try again.',
    });
  }
  return res.json({
    found: true,
    order_no: order.order_no,
    placed_at: order.placed_at,
    items: order.items,
    message: 'Found it. You’ll get a shipping email with tracking the moment it leaves the supplier.',
  });
};
