import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { authorizeOps } from '../../../../../../lib/lumera-auth';
import { setCandidateStatus } from '../../../../../../lib/lumera-db';

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!authorizeOps(req, res)) return;
  const id = (req.params as any)?.id;
  const body = (req.body ?? {}) as { reason?: string };
  const candidate = await setCandidateStatus(id, 'rejected', 'reject', body.reason);
  res.json({ candidate });
};
