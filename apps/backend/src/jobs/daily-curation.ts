import type { MedusaContainer } from '@medusajs/framework';
import Redis from 'ioredis';
import {
  persistVendorConnections,
  seedCurationCandidates,
  discoverAndIngestRadar,
  listCandidates,
} from '../lib/lumera-db';

/**
 * Daily curation — the "research department presents top items" cadence (6am).
 *
 * Two tiers so the founder's board is fresh every morning regardless of which services are up:
 *
 * 1. DETERMINISTIC (runs right here in the backend, no LLM, no extra service): refresh vendor
 *    connections, seed the board idempotently, and layer on live radar discovery
 *    (AliExpress/Alibaba/Shein) when scraping creds are present — the same pipeline as
 *    POST /admin/lumera/curation/run. Candidates land scored + Warden-screened (margin floor,
 *    shipping ceiling, compliance states) for the cockpit's approve/sample/reject flow.
 *
 * 2. AGENT (LLM taste layer): enqueue the Curator run for the intelligence orchestrator. A no-op
 *    until that service is deployed + keyed — the deterministic tier above does not depend on it.
 *
 * Everything is best-effort: a failure in either tier logs and never throws out of the job.
 */
export default async function dailyCuration(container: MedusaContainer) {
  // Tier 1 — deterministic board refresh (works today, agents asleep or not).
  if (process.env.DATABASE_URL) {
    try {
      await persistVendorConnections();
      await seedCurationCandidates(false);
      const radar = await discoverAndIngestRadar().catch(() => ({ source: 'error' as const, ingested: 0, candidates: [] }));
      const candidates = await listCandidates();
      const fresh = candidates.filter((c) => c.status === 'ready_for_review').length;
      console.log(
        `[daily-curation] board refreshed: ${candidates.length} candidate(s), ${fresh} ready for review` +
          ` (radar: ${radar.source}, +${radar.ingested})`
      );
    } catch (e: any) {
      console.warn('[daily-curation] deterministic refresh failed:', e?.message?.slice(0, 120));
    }
  } else {
    console.warn('[daily-curation] DATABASE_URL not set; skipping board refresh.');
  }

  // Tier 2 — enqueue the Curator agent run (consumed by the intelligence orchestrator when deployed).
  const redisUrl = process.env.REDIS_URL;
  const job = {
    id: `job_curator_${Date.now()}`,
    type: 'agent:curator',
    trigger: 'cron',
    requested_at: new Date().toISOString(),
    source: 'medusa:daily-curation',
  };

  if (!redisUrl) {
    console.warn('[daily-curation] REDIS_URL is not set; curator job staged only in process logs.', job);
    return;
  }

  const redis = new Redis(redisUrl, { lazyConnect: true });
  try {
    await redis.connect();
    await redis.xadd('lumera:agent-jobs', '*', 'payload', JSON.stringify(job));
    console.log(`[daily-curation] enqueued ${job.id}`);
  } catch (e: any) {
    console.warn('[daily-curation] curator enqueue failed:', e?.message?.slice(0, 120));
  } finally {
    await redis.quit().catch(() => {});
  }
}
export const config = { name: 'daily-curation', schedule: '0 6 * * *' }; // 6am daily
