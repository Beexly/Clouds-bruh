import { MedusaService } from '@medusajs/framework/utils';
import { VendorConnection } from './models/vendor-connection';
import { ProductCandidate } from './models/product-candidate';
import { ApprovalRequest } from './models/approval-request';
import { VendorOrder } from './models/vendor-order';
import { VendorWebhookEvent } from './models/webhook-event';
import { ReturnCase } from './models/return-case';
import { ProductDesign } from './models/product-design';

class LumeraService extends MedusaService({
  VendorConnection,
  ProductCandidate,
  ApprovalRequest,
  VendorOrder,
  VendorWebhookEvent,
  ReturnCase,
  ProductDesign,
}) {
  async listBoardCandidates(status?: string) {
    return this.listProductCandidates(status ? { status } : {}, {
      order: { updated_at: 'DESC' },
      take: 100,
    } as any);
  }

  async recordApproval(candidateId: string, action: string, status: string, reason?: string, payload: Record<string, unknown> = {}) {
    return this.createApprovalRequests({
      id: `apr_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      candidate_id: candidateId,
      action,
      status,
      reason: reason ?? null,
      payload,
    } as any);
  }
}

export default LumeraService;
