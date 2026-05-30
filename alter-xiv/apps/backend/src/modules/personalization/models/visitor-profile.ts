import { model } from '@medusajs/framework/utils';

export const VisitorProfile = model.define('visitor_profile', {
  id: model.id().primaryKey(),
  visitor_id: model.text().unique(),
  customer_id: model.text().nullable(),
  segment: model.enum(['new_seeker', 'armor_devotee', 'high_intent', 'lapsed', 'patron']).default('new_seeker'),
  // embedding stored as pgvector column via migration (model.json placeholder here).
  embedding: model.json().nullable(),
  affinity: model.json(), // { chapter:{}, category:{}, price_band:{}, aesthetic:{} }
  last_seen: model.dateTime(),
  ltv_estimate: model.number().nullable(),
});
