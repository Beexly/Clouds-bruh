import Redis from 'ioredis';
import { AGENTS } from '../agents';
import { runAgent } from './run-agent';
import { runIntrospection } from '../introspection';

/**
 * Orchestrator boot. Wires:
 *  - scheduled agents (def.schedule) via cron
 *  - event-driven agents (def.events) via the Redis `signal:events` + Medusa event streams
 *  - INTROSPECTION on its own cadence
 * Keep it boring and observable; every run lands in the Ledger.
 */
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function boot() {
  // 1. schedule cron agents
  for (const def of Object.values(AGENTS)) {
    if (def.schedule) {
      // TODO: register cron (node-cron) → runAgent(def.name, 'cron', {})
    }
  }
  // 2. consume events → route to subscribing agents
  // TODO: XREAD `signal:events` and Medusa event bus; for each, runAgent for any def whose def.events matches.
  // 3. introspection cadence
  setInterval(() => runIntrospection().catch(console.error), 1000 * 60 * 30); // every 30m
  console.log('[orchestrator] Alter XIV intelligence online. Agents:', Object.keys(AGENTS).join(', '));
}
boot().catch((e) => { console.error(e); process.exit(1); });
