import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { authorizeOps } from '../../../../lib/lumera-auth';
import { persistVendorConnections } from '../../../../lib/lumera-db';

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!authorizeOps(req, res)) return;
  const connections = await persistVendorConnections();
  res.json({ generated_at: new Date().toISOString(), connections });
};
