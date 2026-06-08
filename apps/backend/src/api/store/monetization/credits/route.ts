import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { MONETIZATION_MODULE } from '../../../../modules/monetization';
import { mintingBlocked } from '../../../../lib/security';

/** POST { customer_id, amount, ref? } — purchase Lumens (test mode). */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { customer_id, amount, ref } = (req.body as any) ?? {};
  if (!customer_id || !amount || amount <= 0) {
    return res.status(400).json({ error: 'customer_id and positive amount are required' });
  }
  // Crediting Lumens MINTS store value — must be payment-bound; fail closed in real-money mode.
  if (mintingBlocked()) {
    return res.status(403).json({ error: 'credit purchase must be payment-bound in production' });
  }
  try {
    const svc: any = req.scope.resolve(MONETIZATION_MODULE);
    const balance = await svc.purchaseCredits(customer_id, Math.round(amount), ref);
    res.json({ customer_id, purchased: Math.round(amount), balance, test_mode: !process.env.STRIPE_API_KEY });
  } catch (e: any) {
    res.status(400).json({ error: e.message?.slice(0, 200) });
  }
};
