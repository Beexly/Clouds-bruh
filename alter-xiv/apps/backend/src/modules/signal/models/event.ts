import { model } from '@medusajs/framework/utils';

export const SignalEvent = model.define('signal_event', {
  id: model.id().primaryKey(),
  visitor_id: model.text().index(),
  session_id: model.text(),
  type: model.text().index(),
  entity_id: model.text().nullable(),
  value: model.text().nullable(),
  context: model.json(),
  ts: model.dateTime(),
});
