import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { MONETIZATION_MODULE } from '../../../../modules/monetization';

/**
 * GET — Lumens balance + recent ledger for the AUTHENTICATED customer.
 * Bound to req.auth_context (Bearer/session) so a caller can only read their own wallet — never an
 * arbitrary ?customer_id= (which previously exposed any customer's balance + full ledger). The
 * /store/monetization/wallet route is authenticated via api/middlewares.ts.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = (req as any).auth_context?.actor_id as string | undefined;
  if (!customerId) return res.status(401).json({ error: 'authentication required' });
  const svc: any = req.scope.resolve(MONETIZATION_MODULE);
  const wallet = await svc.walletFor(customerId);
  const transactions = await svc.listCreditTransactions(
    { customer_id: customerId },
    { order: { created_at: 'DESC' }, take: 20 }
  );
  res.json({ customer_id: customerId, balance: wallet.balance, transactions });
};
