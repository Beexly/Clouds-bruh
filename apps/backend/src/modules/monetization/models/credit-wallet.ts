import { model } from '@medusajs/framework/utils';

/** Flexprice pattern: a per-customer Lumens wallet. Balance is in credits (1 credit = 1¢). */
export const CreditWallet = model.define('credit_wallet', {
  id: model.id().primaryKey(),
  customer_id: model.text().unique(),
  balance: model.number().default(0),
});
