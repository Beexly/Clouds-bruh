import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { MONETIZATION_MODULE } from '../../../../modules/monetization';

/** GET ?customer_id= — Lumens balance + recent ledger. */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = req.query.customer_id as string;
  if (!customerId) return res.status(400).json({ error: 'customer_id is required' });
  const svc: any = req.scope.resolve(MONETIZATION_MODULE);
  const wallet = await svc.walletFor(customerId);
  const transactions = await svc.listCreditTransactions(
    { customer_id: customerId },
    { order: { created_at: 'DESC' }, take: 20 }
  );
  res.json({ customer_id: customerId, balance: wallet.balance, transactions });
};
