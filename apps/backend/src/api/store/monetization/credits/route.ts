import type { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework';
import { MONETIZATION_MODULE } from '../../../../modules/monetization';

/** POST { amount, ref? } — purchase Lumens for the AUTHENTICATED customer (test mode). */
export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const customer_id = req.auth_context?.actor_id;
  const { amount, ref } = (req.body as any) ?? {};
  if (!customer_id) return res.status(401).json({ error: 'authentication required' });
  if (!amount || amount <= 0) return res.status(400).json({ error: 'positive amount is required' });
  try {
    const svc: any = req.scope.resolve(MONETIZATION_MODULE);
    const balance = await svc.purchaseCredits(customer_id, Math.round(amount), ref);
    res.json({ customer_id, purchased: Math.round(amount), balance, test_mode: !process.env.STRIPE_API_KEY });
  } catch (e: any) {
    res.status(400).json({ error: e.message?.slice(0, 200) });
  }
};
