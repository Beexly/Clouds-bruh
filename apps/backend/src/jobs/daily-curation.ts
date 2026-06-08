import type { MedusaContainer } from '@medusajs/framework';
import Redis from 'ioredis';

/**
 * Scheduled trigger for the Curator agent (runs in the intelligence app).
 * Backend just enqueues the run; the agent does the work and writes drafts for approval.
 */
export default async function dailyCuration(container: MedusaContainer) {
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
  } finally {
    await redis.quit().catch(() => {});
  }
}
export const config = { name: 'daily-curation', schedule: '0 6 * * *' }; // 6am daily
