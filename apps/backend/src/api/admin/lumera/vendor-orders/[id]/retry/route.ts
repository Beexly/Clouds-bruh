import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { authorizeOps } from '../../../../../../lib/lumera-auth';
import { ensureLumeraTables, pool } from '../../../../../../lib/lumera-db';

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!authorizeOps(req, res)) return;
  const id = (req.params as any)?.id;
  await ensureLumeraTables();
  const result = await pool().query(
    `UPDATE lumera_vendor_order
        SET status='retry_staged', updated_at=now(),
            payload = payload || jsonb_build_object('retry_requested_at', now())
      WHERE id=$1
      RETURNING *`,
    [id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: `Vendor order ${id} not found` });
  res.json({ vendor_order: result.rows[0], status: 'retry_staged_for_quartermaster' });
};
