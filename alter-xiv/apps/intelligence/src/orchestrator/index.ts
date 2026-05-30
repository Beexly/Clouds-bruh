import Redis from 'ioredis';
import cron from 'node-cron';
import { AGENTS } from '../agents';
import { runAgent } from './run-agent';
import { runIntrospection } from '../introspection';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const redisReader = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Map event type prefixes to agent names that subscribe to them
function agentsForEvent(type: string): string[] {
  return Object.values(AGENTS)
    .filter((def) => def.events?.some((e) => type.startsWith(e) || e === '*'))
    .map((def) => def.name);
}

async function consumeRedisStream() {
  let lastId = '$'; // only new events from boot
  const STREAM = 'signal:events';
  const GROUP = 'congregation';
  // Create consumer group (idempotent)
  await redisReader.xgroup('CREATE', STREAM, GROUP, '$', 'MKSTREAM').catch(() => {});

  while (true) {
    try {
      const results = await redisReader.xreadgroup(
        'GROUP', GROUP, 'orchestrator',
        'COUNT', '10', 'BLOCK', '2000',
        'STREAMS', STREAM, '>'
      ) as any;
      if (!results) continue;
      for (const [, entries] of results) {
        for (const [msgId, fields] of entries) {
          const obj: Record<string, string> = {};
          for (let i = 0; i < fields.length; i += 2) obj[fields[i]] = fields[i + 1];
          const type = obj.type ?? 'unknown';
          const subscribedAgents = agentsForEvent(type);
          for (const agentName of subscribedAgents) {
            runAgent(agentName, 'event', { event_type: type, ...obj })
              .catch((e: Error) => console.error(`[orchestrator] ${agentName} error:`, e.message?.slice(0, 80)));
          }
          await redisReader.xack(STREAM, GROUP, msgId).catch(() => {});
        }
      }
    } catch (e: any) {
      if (!e.message?.includes('NOGROUP')) {
        console.warn('[orchestrator] stream read error:', e.message?.slice(0, 60));
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }
}

async function boot() {
  // 1. Register cron-scheduled agents
  for (const def of Object.values(AGENTS)) {
    if (def.schedule) {
      if (!cron.validate(def.schedule)) {
        console.warn(`[orchestrator] Invalid cron for ${def.name}: ${def.schedule}`);
        continue;
      }
      cron.schedule(def.schedule, () => {
        console.log(`[orchestrator] cron trigger → ${def.name}`);
        runAgent(def.name, 'cron', {})
          .catch((e: Error) => console.error(`[orchestrator] ${def.name} cron error:`, e.message?.slice(0, 80)));
      });
      console.log(`[orchestrator] ${def.name} scheduled: ${def.schedule}`);
    }
  }

  // 2. Introspection on 30-minute cadence
  setInterval(() => runIntrospection().catch(console.error), 1000 * 60 * 30);

  // 3. Start Redis stream consumer in background
  consumeRedisStream().catch((e: Error) => {
    console.error('[orchestrator] Stream consumer error:', e.message);
  });

  console.log('[orchestrator] Alter XIV CONGREGATION online.');
  console.log('[orchestrator] Agents:', Object.keys(AGENTS).join(', '));
  console.log('[orchestrator] Watching signal:events stream for event-driven agents.');
}

boot().catch((e) => { console.error(e); process.exit(1); });
