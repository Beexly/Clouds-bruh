import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { authorizeOps } from '../../../../../lib/lumera-auth';
import { persistVendorConnections, seedCurationCandidates } from '../../../../../lib/lumera-db';

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!authorizeOps(req, res)) return;
  const body = (req.body ?? {}) as { force?: boolean };
  const connections = await persistVendorConnections();
  const candidates = await seedCurationCandidates(Boolean(body.force));
  res.json({
    generated_at: new Date().toISOString(),
    source: connections.some((c) => c.connected && c.id !== 'radar') ? 'configured_vendor_seed' : 'safe_fixture_seed',
    connections,
    candidates,
  });
};
