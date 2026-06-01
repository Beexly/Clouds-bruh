import { model } from '@medusajs/framework/utils';

export const Drop = model.define('drop', {
  id: model.id().primaryKey(),
  name: model.text(),
  series: model.text(),
  chapter: model.enum(['stillness', 'armor', 'signal', 'altar', 'relentless']),
  status: model.enum(['scheduled', 'live', 'sold_out', 'archived']).default('scheduled'),
  starts_at: model.dateTime(),
  ends_at: model.dateTime(),
  units_total: model.number(),
  units_remaining: model.number(),
  product_ids: model.json(),
});
