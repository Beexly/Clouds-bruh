import { model } from '@medusajs/framework/utils';

export const VendorOrder = model.define('lumera_vendor_order', {
  id: model.id().primaryKey(),
  order_id: model.text().nullable(),
  vendor: model.text(),
  vendor_order_id: model.text().nullable(),
  status: model.text(),
  payload: model.json(),
});
