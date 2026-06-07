import { model } from '@medusajs/framework/utils';

export const ReturnCase = model.define('lumera_return_case', {
  id: model.id().primaryKey(),
  order_id: model.text().nullable(),
  email: model.text().nullable(),
  status: model.text().default('submitted'),
  reason: model.text().nullable(),
  payload: model.json(),
});
