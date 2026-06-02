import type { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework';
import { MONETIZATION_MODULE } from '../../../../modules/monetization';

/** POST { tier_key } — subscribe the AUTHENTICATED customer to a membership tier (Stripe test mode / local). */
export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const customer_id = req.auth_context?.actor_id;
  const { tier_key } = (req.body as any) ?? {};
  if (!customer_id) return res.status(401).json({ error: 'authentication required' });
  if (!tier_key) return res.status(400).json({ error: 'tier_key is required' });
  try {
    const svc: any = req.scope.resolve(MONETIZATION_MODULE);
    const entitlements = await svc.subscribe(customer_id, tier_key);
    res.json({ customer_id, ...entitlements, test_mode: !process.env.STRIPE_API_KEY });
  } catch (e: any) {
    res.status(400).json({ error: e.message?.slice(0, 200) });
  }
};
