import { model } from '@medusajs/framework/utils';

export const VendorWebhookEvent = model.define('lumera_vendor_webhook_event', {
  id: model.id().primaryKey(),
  vendor: model.text(),
  event_type: model.text(),
  payload: model.json(),
  received_at: model.dateTime(),
  processed_at: model.dateTime().nullable(),
});
