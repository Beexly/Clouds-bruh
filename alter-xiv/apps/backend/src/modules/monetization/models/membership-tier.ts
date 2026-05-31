import { model } from '@medusajs/framework/utils';

/**
 * Autumn pattern: a tier is a Feature bundle priced on Stripe.
 * `entitlements` is the Feature set this tier grants (early_access, patron_pricing, …).
 * `stripe_price_id` is the Stripe mirror (test mode); null until mirrored.
 */
export const MembershipTier = model.define('membership_tier', {
  id: model.id().primaryKey(),
  key: model.text().unique(),            // 'patron' | 'disciple' | ...
  name: model.text(),
  description: model.text().nullable(),
  price_cents: model.number(),           // monthly price in cents (USD)
  interval: model.enum(['month', 'year']).default('month'),
  entitlements: model.json(),            // string[] of feature keys
  stripe_price_id: model.text().nullable(),
  active: model.boolean().default(true),
});
