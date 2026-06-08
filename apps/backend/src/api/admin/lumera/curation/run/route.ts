import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { authorizeOps } from '../../../../../lib/lumera-auth';
import {
  persistVendorConnections,
  seedCurationCandidates,
  discoverAndIngestRadar,
  radarConfigured,
  listCandidates,
} from '../../../../../lib/lumera-db';

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!authorizeOps(req, res)) return;
  const body = (req.body ?? {}) as { force?: boolean; queries?: string[] };
  const connections = await persistVendorConnections();

  // Seed the safe fixture board first (idempotent), then layer on live radar discovery
  // (AliExpress/Alibaba/Shein) when scraping credentials are present.
  await seedCurationCandidates(Boolean(body.force));
  const radar = await discoverAndIngestRadar(body.queries).catch(() => ({ source: 'error' as const, ingested: 0, candidates: [] }));
  const candidates = await listCandidates();

  const hasVendor = connections.some((c) => c.connected && c.id !== 'radar');
  res.json({
    generated_at: new Date().toISOString(),
    source: radarConfigured() ? `radar:${radar.source}` : hasVendor ? 'configured_vendor_seed' : 'safe_fixture_seed',
    radar: { configured: radarConfigured(), source: radar.source, ingested: radar.ingested },
    connections,
    candidates,
  });
};
