import Redis from 'ioredis';
import cron from 'node-cron';
import { AGENTS } from '../agents';
import { runAgent } from './run-agent';
import { runIntrospection } from '../introspection';
import { learnFrom } from '../learning/loop';
import type { SignalEvent } from '@lumera/shared';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const redisReader = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Map event type prefixes to agent names that subscribe to them
function agentsForEvent(type: string): string[] {
  return Object.values(AGENTS)
    .filter((def) => def.events?.some((e) => type.startsWith(e) || e === '*'))
    .map((def) => def.name);
}

function fieldsToObj(fields: string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) obj[fields[i]] = fields[i + 1];
  return obj;
}

async function handleSignalEntry(msgId: string, fields: string[]): Promise<void> {
  const obj = fieldsToObj(fields);
  const type = obj.type ?? 'unknown';
  for (const agentName of agentsForEvent(type)) {
    runAgent(agentName, 'event', { event_type: type, ...obj })
      .catch((e: Error) => console.error(`[orchestrator] ${agentName} error:`, e.message?.slice(0, 80)));
  }
  // Learning Loop reward — deduped by event id inside learnFrom, so reprocessing is safe.
  await learnFrom({
    id: msgId,
    visitor_id: obj.visitor_id ?? '',
    session_id: obj.session_id ?? '',
    type: type as SignalEvent['type'],
    entity_id: obj.entity_id,
    value: Number.isFinite(parseFloat(obj.value)) ? parseFloat(obj.value) : undefined,
    context: { chapter: obj.chapter as any },
    ts: obj.ts ?? new Date().toISOString(),
  }).catch(() => {});
}

/**
 * Crash recovery: reclaim pending-but-unacked entries (delivered to this consumer before a previous
 * crash) and reprocess them. Fully guarded — if XAUTOCLAIM is unsupported or errors it's a silent
 * no-op and the normal loop proceeds. Safe to reprocess because reward application is deduped.
 */
async function reclaimPending(
  stream: string,
  group: string,
  consumer: string,
  handle: (id: string, fields: string[]) => Promise<void>
): Promise<void> {
  try {
    let cursor = '0-0';
    for (let pass = 0; pass < 20; pass++) {
      const res: any = await (redisReader as any)
        .xautoclaim(stream, group, consumer, 60_000, cursor, 'COUNT', 50)
        .catch(() => null);
      if (!res) return;
      const entries = (res[1] ?? []) as Array<[string, string[]]>;
      if (entries.length) console.log(`[orchestrator] reclaiming ${entries.length} pending entr(y/ies) on ${stream}`);
      for (const [msgId, fields] of entries) {
        try {
          await handle(msgId, fields);
        } catch {
          /* handler self-logs */
        }
        await redisReader.xack(stream, group, msgId).catch(() => {});
      }
      const next = res[0];
      if (!next || next === '0-0') break;
      cursor = next;
    }
  } catch (e: any) {
    console.warn(`[orchestrator] reclaim skipped (${stream}):`, e.message?.slice(0, 60));
  }
}

async function consumeRedisStream() {
  const STREAM = 'signal:events';
  const GROUP = 'congregation';
  await redisReader.xgroup('CREATE', STREAM, GROUP, '$', 'MKSTREAM').catch(() => {});
  await reclaimPending(STREAM, GROUP, 'orchestrator', handleSignalEntry);

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
          await handleSignalEntry(msgId, fields);
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

async function handleJobEntry(msgId: string, fields: string[]): Promise<void> {
  const obj = fieldsToObj(fields);
  const payload = safeJson(obj.payload);
  // Founder approval decisions from the Cockpit: execute the approved gated action (or record the
  // rejection) — this closes the human-in-the-loop circuit. Runs even without an Anthropic key.
  if (payload.type === 'approval') {
    const { executeApprovedAction } = await import('./run-agent');
    const { Ledger } = await import('../memory/ledger');
    if (payload.decision === 'approve') {
      executeApprovedAction(payload).catch((e: Error) =>
        console.error('[orchestrator] approval execution error:', e.message?.slice(0, 80)));
    } else if (payload.run_id) {
      Ledger.outcome(payload.run_id, 'rejected_by_founder').catch(() => {});
    }
    return;
  }
  const agentName = String(payload.type ?? '').replace(/^agent:/, '');
  if (AGENTS[agentName]) {
    runAgent(agentName, payload.trigger ?? 'event', payload)
      .catch((e: Error) => console.error(`[orchestrator] job ${agentName} error:`, e.message?.slice(0, 80)));
  } else {
    console.warn(`[orchestrator] unknown job agent: ${agentName || '(missing)'}`);
  }
}

async function consumeAgentJobs() {
  const STREAM = 'lumera:agent-jobs';
  const GROUP = 'congregation-jobs';
  await redisReader.xgroup('CREATE', STREAM, GROUP, '$', 'MKSTREAM').catch(() => {});
  await reclaimPending(STREAM, GROUP, 'job-orchestrator', handleJobEntry);

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
          await handleJobEntry(msgId, fields);
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
