import type { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework';
import { MONETIZATION_MODULE } from '../../../../modules/monetization';

/**
 * POST — gift cards for the AUTHENTICATED customer.
 *   issue:  { amount, message? }       → purchaser = the authed customer
 *   redeem: { code, redeem: true }     → redeems to the authed customer
 */
export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const customer_id = req.auth_context?.actor_id;
  if (!customer_id) return res.status(401).json({ error: 'authentication required' });
  const body = (req.body as any) ?? {};
  const svc: any = req.scope.resolve(MONETIZATION_MODULE);
  try {
    if (body.redeem) {
      if (!body.code) return res.status(400).json({ error: 'code is required to redeem' });
      const result = await svc.redeemGiftCard(body.code, customer_id);
      return res.json({ redeemed: true, ...result });
    }
    if (!body.amount || body.amount <= 0) return res.status(400).json({ error: 'positive amount required to issue' });
    const gc = await svc.issueGiftCard(Math.round(body.amount), customer_id, body.message);
    res.json({ issued: true, code: gc.code, balance: gc.balance });
  } catch (e: any) {
    res.status(400).json({ error: e.message?.slice(0, 200) });
  }
};
