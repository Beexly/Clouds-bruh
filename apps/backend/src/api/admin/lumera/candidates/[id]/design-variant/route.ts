import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { authorizeOps } from '../../../../../../lib/lumera-auth';
import { ensureLumeraTables, getCandidate, pool } from '../../../../../../lib/lumera-db';

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!authorizeOps(req, res)) return;
  const id = (req.params as any)?.id;
  const candidate = await getCandidate(id);
  if (!candidate) return res.status(404).json({ error: `Candidate ${id} not found` });
  const body = (req.body ?? {}) as { prompt?: string; notes?: string };
  await ensureLumeraTables();
  const designId = `des_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const payload = {
    source_candidate_id: id,
    title: `${candidate.title} - Founder Variant`,
    prompt: body.prompt ?? `Create a Lumera house-label variant of ${candidate.title}.`,
    notes: body.notes ?? '',
    preferred_vendors: ['printify', 'printful'],
    candidate,
    ai_generated_media_label_required: true,
  };
  await pool().query(
    `INSERT INTO lumera_product_design (id, title, status, payload) VALUES ($1,$2,'draft',$3)`,
    [designId, payload.title, JSON.stringify(payload)]
  );
  res.json({ design: { id: designId, status: 'draft', payload } });
};
