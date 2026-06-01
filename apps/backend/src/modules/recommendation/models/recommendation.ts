import { model } from '@medusajs/framework/utils';

export const Recommendation = model.define('recommendation', {
  id: model.id().primaryKey(),
  visitor_id: model.text().index(),
  strategy: model.enum(['for_you', 'because_you_viewed', 'complete_the_set', 'trending_in_chapter', 'graph_rec']),
  product_ids: model.json(),
  score: model.number(),
  served_at: model.dateTime(),
  clicked: model.boolean().default(false),
  converted: model.boolean().default(false),
});
