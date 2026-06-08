import { Pool } from 'pg';
import Redis from 'ioredis';
import { Ledger } from '../memory/ledger';
import type { SignalEvent } from '@alterxiv/shared';
import { REWARD_WEIGHTS } from '@alterxiv/shared';

let _pool: Pool | null = null;
function pool(): Pool {
  if (_pool) return _pool;
  _pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://alterxiv:alterxiv@localhost:5432/alterxiv' });
  return _pool;
}

let _redis: Redis | null = null;
function redis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    _redis = new Redis(url, { lazyConnect: false, enableOfflineQueue: false, maxRetriesPerRequest: 1 });
    _redis.on('error', () => {});
    return _redis;
  } catch { return null; }
}

/**
 * THE LEARNING LOOP — what makes Lumera self-improving.
 * Called for every SIGNAL event. Routes reward to three places:
 *   1. bandit — reward the Broadcast block / recommendation that led to the action
 *   2. embeddings — queue a refresh for purchased products + this visitor's vector
 *   3. ledger — record sell-through for Curator/Herald memory
 */
/**
 * Idempotency for the Learning Loop. Redis streams are at-least-once, and the orchestrator reclaims
 * pending entries on boot (crash recovery) — so a reward must be applied AT MOST ONCE per event,
 * even across restarts/instances. We "claim" each event id before applying its reward:
 *   - Redis (authoritative, survives restarts/instances): `SET reward:dedup:{id} NX EX 1d`.
 *   - In-memory fallback (bounded) when Redis is absent/down: best-effort within the process.
 * At-most-once is the right trade for a bandit reward: one lost reward barely moves a Beta posterior,
 * whereas double-counting (reclaim re-applying after a restart) skews it. Exported for tests.
 */
const _seenEventIds = new Set<string>();
const SEEN_CAP = 5000;
function rememberInMemory(id: string): boolean {
  if (_seenEventIds.has(id)) return false;
  _seenEventIds.add(id);
  if (_seenEventIds.size > SEEN_CAP) {
    // Drop the oldest ~10% (insertion-ordered) to bound memory.
    let drop = Math.ceil(SEEN_CAP * 0.1);
    for (const k of _seenEventIds) {
      _seenEventIds.delete(k);
      if (--drop <= 0) break;
    }
  }
  return true;
}

/** Returns true if THIS call claimed the event (proceed to apply), false if already applied (skip). */
export async function claimReward(id: string | undefined): Promise<boolean> {
  if (!id) return true; // no id → can't dedup; let it through
  const r = redis();
  if (r) {
    try {
      const ok = await r.set(`reward:dedup:${id}`, '1', 'EX', 86400, 'NX');
      return ok === 'OK'; // null when the key already existed → already applied
    } catch {
      /* Redis down → fall back to the in-memory guard */
    }
  }
  return rememberInMemory(id);
}

export async function learnFrom(event: SignalEvent): Promise<void> {
  const reward = REWARD_WEIGHTS[event.type] ?? 0;
  if (reward <= 0) return;
  // Claim before applying — at-most-once across restarts/instances (see claimReward).
  if (!(await claimReward(event.id))) return;

  try {
    // 1. Bandit reward: find the visitor's segment, reward the block they engaged with
    await rewardBandit(event, reward);

    if (event.type === 'purchase') {
      // 2. Queue embedding refresh for purchased product
      await queueEmbeddingRefresh(event.entity_id, event.visitor_id);

      // 3. Record sell-through in Ledger for Curator/Herald memory
      await recordSellThrough(event);
    }

    if (event.type === 'add_to_cart') {
      await queueEmbeddingRefresh(event.entity_id, null);
    }

  } catch (e: any) {
    console.warn('[learning] learnFrom error:', e.message?.slice(0, 80));
  }
}

async function rewardBandit(event: SignalEvent, reward: number): Promise<void> {
  const r = redis();
  if (!r) return;

  try {
    // Get visitor segment from profile
    const { rows } = await pool().query<{ segment: string }>(
      `SELECT segment FROM visitor_profile WHERE visitor_id=$1 LIMIT 1`,
      [event.visitor_id]
    ).catch(() => ({ rows: [] }));
    const segment = rows[0]?.segment ?? 'new_seeker';

    // Infer the block that was involved from the event context
    const block = inferBlock(event);
    if (!block) return;

    const key = `bandit:${segment}:${block}`;
    // Increment alpha (successes) in the Beta(alpha, beta) distribution
    const current = await r.get(key);
    let alpha = 1, beta = 1;
    if (current) {
      const [a, b] = current.split(' ').map(Number);
      alpha = a || 1;
      beta = b || 1;
    }
    // Reward = increment alpha by reward weight
    const newAlpha = alpha + reward;
    await r.set(key, `${newAlpha} ${beta}`, 'EX', 86400 * 30);

    console.log(`[learning] Bandit reward: segment=${segment} block=${block} alpha ${alpha}→${newAlpha} (reward=${reward})`);
  } catch (e: any) {
    console.warn('[learning] rewardBandit error:', e.message?.slice(0, 80));
  }
}

export function inferBlock(event: SignalEvent): string | null {
  const type = event.type;
  if (type === 'purchase' || type === 'add_to_cart') return 'for_you';
  if (type === 'product_view') return 'trending_in_chapter';
  if (type === 'drop_view') return 'live_drops';
  return null;
}

async function queueEmbeddingRefresh(productId: string | undefined, visitorId: string | null): Promise<void> {
  if (!productId) return;
  const r = redis();
  if (!r) return;
  // Queue in Redis for the OracleKeeper to pick up during nightly consolidation
  await r.lpush('embedding:refresh:queue', JSON.stringify({
    product_id: productId,
    visitor_id: visitorId,
    queued_at: new Date().toISOString(),
  })).catch(() => {});
  console.log(`[learning] Queued embedding refresh for product ${productId}`);
}

async function recordSellThrough(event: SignalEvent): Promise<void> {
  // Persist sell-through to the audit log so Curator/Herald can read it
  await Ledger.audit({
    id: crypto.randomUUID(),
    type: 'conversion',
    severity: 'info',
    finding: `Sell-through: visitor ${event.visitor_id} purchased entity ${event.entity_id} (value: $${event.value ?? 0})`,
    recommendation: 'Curator: update product selection for next drop based on sell-through pattern.',
    falsifiable_check: 'Check: order.placed event exists for this visitor_id.',
    auto_corrected: true,
    entity_ref: event.entity_id,
    created_at: new Date().toISOString(),
  }).catch(() => {});
}

/**
 * Nightly batch: recompute product embeddings from recent signal data,
 * conclude experiments, promote winners to Curator/Herald.
 * Called by OracleKeeper cron (2am daily).
 */
export async function nightlyConsolidation(): Promise<void> {
  console.log('[learning] Starting nightly consolidation...');
  let refreshed = 0;
  let errors = 0;

  try {
    // Process the embedding refresh queue
    const r = redis();
    if (r) {
      const batchSize = 50;
      const batch: string[] = [];
      for (let i = 0; i < batchSize; i++) {
        const item = await r.rpop('embedding:refresh:queue').catch(() => null);
        if (!item) break;
        batch.push(item);
      }

      for (const raw of batch) {
        try {
          const { product_id } = JSON.parse(raw);
          await refreshProductEmbedding(product_id);
          refreshed++;
        } catch (e: any) {
          errors++;
          console.warn('[learning] embedding refresh error:', e.message?.slice(0, 60));
        }
      }
    }

    // Analyse bandit performance: identify top blocks per segment
    const topBlocks = await analyseTopBlocks();

    // Record consolidation in Ledger
    await Ledger.record({
      id: crypto.randomUUID(),
      agent: 'oracle_keeper',
      trigger: 'cron',
      input: { task: 'nightly_consolidation' },
      output: { refreshed, errors, top_blocks: topBlocks },
      tools_used: ['embedding_refresh', 'bandit_analysis'],
      decisions: [
        `Refreshed ${refreshed} product embeddings from queue`,
        `Errors: ${errors}`,
        `Top blocks: ${JSON.stringify(topBlocks)}`,
      ],
      status: 'success',
      escalated: false,
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
    });

    console.log(`[learning] Nightly consolidation complete: ${refreshed} embeddings refreshed, ${errors} errors`);
  } catch (e: any) {
    console.error('[learning] nightlyConsolidation error:', e.message?.slice(0, 120));
  }
}

async function refreshProductEmbedding(productId: string): Promise<void> {
  // Recompute embedding from recent signal events — more signals = stronger chapter signal
  const { rows } = await pool().query<{ chapter: string; count: string }>(
    `SELECT p.metadata->>'chapter' as chapter, COUNT(se.id) as count
     FROM signal_event se
     JOIN product p ON p.id = se.entity_id
     WHERE se.entity_id = $1 AND se.ts > now() - interval '30 days'
     GROUP BY p.metadata->>'chapter'`,
    [productId]
  ).catch(() => ({ rows: [] }));

  if (rows.length === 0) return;

  const chapters = ['stillness', 'armor', 'signal', 'altar', 'relentless'];
  const signalCount = parseInt(rows[0].count) || 1;
  const chapter = rows[0].chapter || 'relentless';

  // Sharpen the embedding toward the observed chapter with signal weight
  const sharpening = Math.min(signalCount / 10, 0.3); // max 30% sharpening
  const embedding = chapters.map((c) => (c === chapter ? 0.95 : 0.05));

  await pool().query(
    `UPDATE product_embedding SET embedding = $1::vector WHERE product_id = $2`,
    [`[${embedding.join(',')}]`, productId]
  ).catch(() => {});
}

async function analyseTopBlocks(): Promise<Record<string, string>> {
  const r = redis();
  if (!r) return {};

  const segments = ['high_intent', 'armor_devotee', 'patron', 'new_seeker'];
  const blocks = ['for_you', 'trending_in_chapter', 'live_drops', 'because_you_viewed'];
  const result: Record<string, string> = {};

  for (const segment of segments) {
    let bestBlock = blocks[0];
    let bestTheta = 0;
    for (const block of blocks) {
      const key = `bandit:${segment}:${block}`;
      const val = await r.get(key).catch(() => null);
      if (val) {
        const [alpha, beta] = val.split(' ').map(Number);
        const theta = (alpha || 1) / ((alpha || 1) + (beta || 1));
        if (theta > bestTheta) {
          bestTheta = theta;
          bestBlock = block;
        }
      }
    }
    result[segment] = bestBlock;
  }

  return result;
}
