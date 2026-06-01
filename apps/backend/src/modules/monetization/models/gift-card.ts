import { model } from '@medusajs/framework/utils';

/** Lumera gift card (a sealed offering). Redeems into the recipient's credit wallet. */
export const GiftCard = model.define('gift_card', {
  id: model.id().primaryKey(),
  code: model.text().unique(),
  initial_balance: model.number(),
  balance: model.number(),
  status: model.enum(['active', 'redeemed', 'void']).default('active'),
  purchaser_id: model.text().nullable(),
  message: model.text().nullable(),
});
