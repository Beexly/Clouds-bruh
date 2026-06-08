import { model } from '@medusajs/framework/utils';

export const VendorConnection = model.define('lumera_vendor_connection', {
  id: model.id().primaryKey(),
  label: model.text(),
  mode: model.enum(['live', 'sandbox', 'fixture', 'missing_credentials', 'blocked']).default('missing_credentials'),
  connected: model.boolean().default(false),
  can_publish: model.boolean().default(false),
  can_submit_orders: model.boolean().default(false),
  last_checked_at: model.dateTime(),
  missing_env: model.json(),
  message: model.text(),
});
