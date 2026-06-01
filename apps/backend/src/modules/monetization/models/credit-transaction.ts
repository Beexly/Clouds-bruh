import { model } from '@medusajs/framework/utils';

/** Append-only Lumens ledger: grants, purchases, debits, credit-notes. */
export const CreditTransaction = model.define('credit_transaction', {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  kind: model.enum(['grant', 'purchase', 'debit', 'credit_note']),
  amount: model.number(),        // signed: +grant/purchase/credit_note, -debit
  balance_after: model.number(),
  reason: model.text().nullable(),
  ref: model.text().nullable(),  // order id / stripe ref
});
