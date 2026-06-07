import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { authorizeOps } from '../../../../../../lib/lumera-auth';
import { setCandidateStatus, upsertCandidate } from '../../../../../../lib/lumera-db';
import { publishCandidateToMedusa } from '../../../../../../lib/lumera-publish';

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!authorizeOps(req, res)) return;
  const id = (req.params as any)?.id;
  const body = (req.body ?? {}) as { publish?: boolean; reason?: string };
  const candidate = await setCandidateStatus(id, 'approved', 'approve', body.reason);
  const shouldPublish = body.publish !== false && process.env.AUTO_PUBLISH_APPROVED !== 'false';
  if (!shouldPublish) return res.json({ candidate, publish: { ok: true, status: 'drafted', message: 'Candidate approved as draft.' } });

  const publish = await publishCandidateToMedusa(candidate, true);
  if (publish.ok) {
    const published = await upsertCandidate({ ...candidate, status: 'published', updated_at: new Date().toISOString() });
    return res.json({ candidate: published, publish });
  }
  res.status(202).json({ candidate, publish });
};
