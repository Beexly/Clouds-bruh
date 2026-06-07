import Redis from 'ioredis';
import cron from 'node-cron';
import { AGENTS } from '../agents';
import { runAgent } from './run-agent';
import { runIntrospection } from '../introspection';
import { learnFrom } from '../learning/loop';
import type { SignalEvent } from '@alterxiv/shared';

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

          // Learning Loop: apply reward for every SIGNAL event with known reward weight
          learnFrom({
            id: msgId,
            visitor_id: obj.visitor_id ?? '',
            session_id: obj.session_id ?? '',
            type: type as SignalEvent['type'],
            entity_id: obj.entity_id,
            value: obj.value ? parseFloat(obj.value) : undefined,
            context: { chapter: obj.chapter as any },
            ts: obj.ts ?? new Date().toISOString(),
          }).catch(() => {});

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

async function consumeAgentJobs() {
  const STREAM = 'lumera:agent-jobs';
  const GROUP = 'congregation-jobs';
  await redisReader.xgroup('CREATE', STREAM, GROUP, '$', 'MKSTREAM').catch(() => {});

  while (true) {
    try {
      const results = await redisReader.xreadgroup(
        'GROUP', GROUP, 'job-orchestrator',
        'COUNT', '5', 'BLOCK', '2000',
        'STREAMS', STREAM, '>'
      ) as any;
      if (!results) continue;
      for (const [, entries] of results) {
        for (const [msgId, fields] of entries) {
          const obj: Record<string, string> = {};
          for (let i = 0; i < fields.length; i += 2) obj[fields[i]] = fields[i + 1];
          const payload = safeJson(obj.payload);
          const agentName = String(payload.type ?? '').replace(/^agent:/, '');
          if (AGENTS[agentName]) {
            runAgent(agentName, payload.trigger ?? 'event', payload)
              .catch((e: Error) => console.error(`[orchestrator] job ${agentName} error:`, e.message?.slice(0, 80)));
          } else {
            console.warn(`[orchestrator] unknown job agent: ${agentName || '(missing)'}`);
          }
          await redisReader.xack(STREAM, GROUP, msgId).catch(() => {});
        }
      }
    } catch (e: any) {
      if (!e.message?.includes('NOGROUP')) {
        console.warn('[orchestrator] job stream read error:', e.message?.slice(0, 60));
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }
}

function safeJson(raw?: string) {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
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

  // 2b. Nightly consolidation: embedding refresh + bandit analysis at 2am (via cron)
  cron.schedule('0 2 * * *', () => {
    const { nightlyConsolidation } = require('../learning/loop');
    nightlyConsolidation().catch(console.error);
    console.log('[orchestrator] Nightly consolidation triggered');
  });

  // 2c. OPERATOR daily loop at 5am — the manager delegates to + validates the CONGREGATION
  // and routes only escalations to the founder. This is what makes it a company of one.
  cron.schedule('0 5 * * *', () => {
    const { runDailyLoop } = require('../operator');
    runDailyLoop().catch(console.error);
    console.log('[orchestrator] OPERATOR daily loop triggered');
  });

  // 3. Start Redis stream consumer in background
  consumeRedisStream().catch((e: Error) => {
    console.error('[orchestrator] Stream consumer error:', e.message);
  });
  consumeAgentJobs().catch((e: Error) => {
    console.error('[orchestrator] Job consumer error:', e.message);
  });

  console.log('[orchestrator] Lumera CONGREGATION online.');
  console.log('[orchestrator] Agents:', Object.keys(AGENTS).join(', '));
  console.log('[orchestrator] Watching signal:events stream for event-driven agents.');
  console.log('[orchestrator] Watching lumera:agent-jobs stream for backend-scheduled work.');
}

boot().catch((e) => { console.error(e); process.exit(1); });
