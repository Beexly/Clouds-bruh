import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { MONETIZATION_MODULE } from '../../../../modules/monetization';
import { mintingBlocked } from '../../../../lib/security';

/** POST { customer_id, tier_key } — subscribe to a membership tier (Stripe test mode / local). */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { customer_id, tier_key } = (req.body as any) ?? {};
  if (!customer_id || !tier_key) {
    return res.status(400).json({ error: 'customer_id and tier_key are required' });
  }
  // Granting paid Patron/Disciple entitlements MINTS value (member pricing, free shipping, monthly
  // credits) — it must be payment-bound. Fail closed in real-money mode (production + a live Stripe
  // key); dev/test (no live key) stays open so local + CI flows work. Mirrors gift-card issuance.
  if (mintingBlocked()) {
    return res.status(403).json({ error: 'membership subscription must be payment-bound in production' });
  }
  try {
    const svc: any = req.scope.resolve(MONETIZATION_MODULE);
    const entitlements = await svc.subscribe(customer_id, tier_key);
    res.json({ customer_id, ...entitlements, test_mode: !process.env.STRIPE_API_KEY });
  } catch (e: any) {
    res.status(400).json({ error: e.message?.slice(0, 200) });
  }
};
