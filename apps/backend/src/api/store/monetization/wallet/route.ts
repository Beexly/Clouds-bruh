import type { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework';
import { MONETIZATION_MODULE } from '../../../../modules/monetization';

/** GET — Lumens balance + recent ledger for the AUTHENTICATED customer. */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const customerId = req.auth_context?.actor_id;
  if (!customerId) return res.status(401).json({ error: 'authentication required' });
  const svc: any = req.scope.resolve(MONETIZATION_MODULE);
  const wallet = await svc.walletFor(customerId);
  const transactions = await svc.listCreditTransactions(
    { customer_id: customerId },
    { order: { created_at: 'DESC' }, take: 20 }
  );
  res.json({ customer_id: customerId, balance: wallet.balance, transactions });
};
