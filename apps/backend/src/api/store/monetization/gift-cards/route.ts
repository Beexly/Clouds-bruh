import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { MONETIZATION_MODULE } from '../../../../modules/monetization';
import { mintingBlocked } from '../../../../lib/security';

/** POST { amount, purchaser_id?, message? } to issue; or { code, customer_id, redeem:true } to redeem. */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body as any) ?? {};
  const svc: any = req.scope.resolve(MONETIZATION_MODULE);
  try {
    if (body.redeem) {
      if (!body.code || !body.customer_id) return res.status(400).json({ error: 'code and customer_id required to redeem' });
      const result = await svc.redeemGiftCard(body.code, body.customer_id);
      return res.json({ redeemed: true, ...result });
    }
    if (!body.amount || body.amount <= 0) return res.status(400).json({ error: 'positive amount required to issue' });
    // Issuing a gift card MINTS store value — it must be payment-bound. Fail closed in real-money mode
    // (production + a live Stripe key) unless explicitly allowed for controlled testing; dev/test (no
    // live key) is permitted so local + CI flows work. Binding to a captured payment is the follow-up.
    if (mintingBlocked()) {
      return res.status(403).json({ error: 'gift-card issuance must be payment-bound in production' });
    }
    const gc = await svc.issueGiftCard(Math.round(body.amount), body.purchaser_id, body.message);
    res.json({ issued: true, code: gc.code, balance: gc.balance });
  } catch (e: any) {
    res.status(400).json({ error: e.message?.slice(0, 200) });
  }
};
