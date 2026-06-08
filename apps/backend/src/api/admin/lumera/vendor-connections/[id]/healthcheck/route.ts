import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { authorizeOps } from '../../../../../../lib/lumera-auth';
import { persistVendorConnections } from '../../../../../../lib/lumera-db';

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!authorizeOps(req, res)) return;
  const id = (req.params as any)?.id;
  const connections = await persistVendorConnections();
  const connection = connections.find((c) => c.id === id);
  if (!connection) return res.status(404).json({ error: `Unknown vendor connection ${id}` });
  res.json({ connection });
};
