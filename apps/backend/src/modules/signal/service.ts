import { MedusaService } from '@medusajs/framework/utils';
import { SignalEvent } from './models/event';
import type { SignalEvent as TEvent } from '@alterxiv/shared';
import Redis from 'ioredis';

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    _redis = new Redis(url, { lazyConnect: false, enableOfflineQueue: false, maxRetriesPerRequest: 1 });
    _redis.on('error', () => { /* suppress unhandled redis errors */ });
    return _redis;
  } catch {
    return null;
  }
}

class SignalService extends MedusaService({ SignalEvent }) {
  /** Ingest an event: persist to Postgres AND push to Redis stream for live MIND + ORACLE consumers. */
  async ingest(event: TEvent) {
    await this.createSignalEvents([{ ...event, ts: new Date(event.ts) } as any]);
    const redis = getRedis();
    if (redis) {
      // XADD with MAXLEN capped at 50k events so the stream stays bounded.
      await redis
        .xadd(
          'signal:events',
          'MAXLEN', '~', '50000',
          '*',
          'visitor_id', event.visitor_id,
          'session_id', event.session_id,
          'type', event.type,
          'entity_id', event.entity_id ?? '',
          'value', String(event.value ?? ''),
          'context', JSON.stringify(event.context),
          'ts', event.ts,
        )
        .catch(() => { /* non-fatal if redis unavailable */ });
    }
  }

  /** Recent events for a visitor — feeds profile recompute + recommendations. */
  async recentForVisitor(visitorId: string, limit = 200) {
    return this.listSignalEvents({ visitor_id: visitorId }, { take: limit, order: { ts: 'DESC' } });
  }
}

export default SignalService;
