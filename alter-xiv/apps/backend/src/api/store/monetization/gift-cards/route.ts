import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { MONETIZATION_MODULE } from '../../../../modules/monetization';

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
    const gc = await svc.issueGiftCard(Math.round(body.amount), body.purchaser_id, body.message);
    res.json({ issued: true, code: gc.code, balance: gc.balance });
  } catch (e: any) {
    res.status(400).json({ error: e.message?.slice(0, 200) });
  }
};
