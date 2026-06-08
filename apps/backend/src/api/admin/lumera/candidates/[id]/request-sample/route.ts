import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { authorizeOps } from '../../../../../../lib/lumera-auth';
import { setCandidateStatus } from '../../../../../../lib/lumera-db';

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!authorizeOps(req, res)) return;
  const id = (req.params as any)?.id;
  const body = (req.body ?? {}) as { reason?: string };
  const candidate = await setCandidateStatus(id, 'needs_sample', 'request_sample', body.reason ?? 'Founder requested sample before launch.');
  res.json({ candidate, sample: { status: 'staged_for_founder_purchase_approval' } });
};
