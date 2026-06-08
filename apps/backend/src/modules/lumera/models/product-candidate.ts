import { model } from '@medusajs/framework/utils';

export const ProductCandidate = model.define('lumera_product_candidate', {
  id: model.id().primaryKey(),
  vendor: model.text(),
  supplier_id: model.text(),
  supplier_name: model.text(),
  title: model.text(),
  handle: model.text().unique(),
  status: model.text(),
  score: model.number().default(0),
  gross_margin: model.number().default(0),
  lead_time_days: model.number().default(0),
  stock: model.number().default(0),
  payload: model.json(),
});
