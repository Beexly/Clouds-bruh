import { model } from '@medusajs/framework/utils';

export const ApprovalRequest = model.define('lumera_approval_request', {
  id: model.id().primaryKey(),
  candidate_id: model.text(),
  action: model.text(),
  status: model.text(),
  reason: model.text().nullable(),
  payload: model.json(),
});
