import { model } from '@medusajs/framework/utils';

export const ProductDesign = model.define('lumera_product_design', {
  id: model.id().primaryKey(),
  title: model.text(),
  status: model.text().default('draft'),
  payload: model.json(),
});
