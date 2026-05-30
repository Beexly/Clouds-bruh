import { MedusaService } from '@medusajs/framework/utils';
import { SignalEvent } from './models/event';
import type { SignalEvent as TEvent } from '@alterxiv/shared';

class SignalService extends MedusaService({ SignalEvent }) {
  /**
   * Ingest an event: persist to Postgres AND push to a Redis stream for live consumers
   * (MIND updates affinity, ORACLE updates bandit reward). Fire-and-fast.
   */
  async ingest(event: TEvent) {
    await this.createSignalEvents([{ ...event, ts: new Date(event.ts) } as any]);
    // TODO: XADD to redis stream `signal:events` so MIND + ORACLE react in real time.
  }
  /** Recent events for a visitor — feeds profile recompute + recommendations. */
  async recentForVisitor(visitorId: string, limit = 200) {
    return this.listSignalEvents({ visitor_id: visitorId }, { take: limit, order: { ts: 'DESC' } });
  }
}
export default SignalService;
