import { model } from '@medusajs/framework/utils';

/** A customer's active entitlement to a tier (the Autumn Entitlement, mirrored to a Stripe sub). */
export const Membership = model.define('membership', {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  tier_key: model.text(),
  status: model.enum(['active', 'past_due', 'canceled']).default('active'),
  stripe_subscription_id: model.text().nullable(),
  current_period_end: model.dateTime().nullable(),
});
