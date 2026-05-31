import { MedusaService } from '@medusajs/framework/utils';
import { Recommendation } from './models/recommendation';
import type { RecStrategy } from '@alterxiv/shared';
import pg from 'pg';
import Redis from 'ioredis';
import { graphRecForVisitor } from './strategies/graph-rec';

// Dimension order: [stillness, armor, signal, altar, relentless]
const CHAPTER_VEC: Record<string, number[]> = {
  stillness:  [0.95, 0.05, 0.05, 0.05, 0.05],
  armor:      [0.05, 0.95, 0.05, 0.05, 0.05],
  signal:     [0.05, 0.05, 0.95, 0.05, 0.05],
  altar:      [0.05, 0.05, 0.05, 0.95, 0.05],
  relentless: [0.05, 0.05, 0.05, 0.05, 0.95],
};
const DEFAULT_VEC = [0.2, 0.2, 0.2, 0.2, 0.2];

let _pool: pg.Pool | null = null;
function getPool(): pg.Pool {
  if (_pool) return _pool;
  _pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  return _pool;
}

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    _redis = new Redis(url, { lazyConnect: false, enableOfflineQueue: false, maxRetriesPerRequest: 1 });
    _redis.on('error', () => {});
    return _redis;
  } catch { return null; }
}

class RecommendationService extends MedusaService({ Recommendation }) {
  /**
   * Personalized product recs via pgvector cosine similarity.
   * Records the served recommendation for Learning Loop attribution.
   */
  async forVisitor(visitorId: string, strategy: RecStrategy, limit = 12): Promise<string[]> {
    const pool = getPool();
    let productIds: string[] = [];

    try {
      switch (strategy) {
        case 'for_you': {
          // Use visitor affinity to build a query vector, find nearest products
          const vec = await this.visitorVector(visitorId);
          const { rows } = await pool.query<{ product_id: string }>(
            `SELECT pe.product_id FROM product_embedding pe
             JOIN product p ON p.id = pe.product_id
             WHERE p.deleted_at IS NULL
             ORDER BY pe.embedding <=> $1::vector
             LIMIT $2`,
            [`[${vec.join(',')}]`, limit]
          );
          productIds = rows.map(r => r.product_id);
          break;
        }
        case 'because_you_viewed': {
          // Find the last viewed product's embedding, return k-NN
          const { rows: viewed } = await pool.query<{ entity_id: string }>(
            `SELECT entity_id FROM signal_event
             WHERE visitor_id=$1 AND type='product_view' AND entity_id IS NOT NULL
             ORDER BY ts DESC LIMIT 1`,
            [visitorId]
          );
          if (!viewed[0]) {
            productIds = await this.trendingByChapter(null, limit);
            break;
          }
          const pivotId = viewed[0].entity_id;
          const { rows } = await pool.query<{ product_id: string }>(
            `SELECT pe2.product_id FROM product_embedding pe1
             JOIN product_embedding pe2 ON pe2.product_id != pe1.product_id
             JOIN product p ON p.id = pe2.product_id
             WHERE pe1.product_id=$1 AND p.deleted_at IS NULL
             ORDER BY pe2.embedding <=> pe1.embedding
             LIMIT $2`,
            [pivotId, limit]
          );
          productIds = rows.map(r => r.product_id);
          break;
        }
        case 'complete_the_set': {
          // Same chapter as the visitor's dominant affinity, excluding recently viewed
          const { rows: vpRows } = await pool.query<{ affinity: any }>(
            `SELECT affinity FROM visitor_profile WHERE visitor_id=$1 LIMIT 1`,
            [visitorId]
          );
          const chapter = this.dominantChapter(vpRows[0]?.affinity);
          const { rows } = await pool.query<{ product_id: string }>(
            `SELECT pe.product_id FROM product_embedding pe
             JOIN product p ON p.id = pe.product_id
             WHERE pe.chapter=$1 AND p.deleted_at IS NULL
               AND pe.product_id NOT IN (
                 SELECT COALESCE(entity_id,'') FROM signal_event
                 WHERE visitor_id=$2 AND type='product_view'
                 LIMIT 20
               )
             ORDER BY random()
             LIMIT $3`,
            [chapter, visitorId, limit]
          );
          productIds = rows.map(r => r.product_id);
          break;
        }
        case 'trending_in_chapter': {
          const { rows: vpRows } = await pool.query<{ affinity: any }>(
            `SELECT affinity FROM visitor_profile WHERE visitor_id=$1 LIMIT 1`,
            [visitorId]
          );
          const chapter = this.dominantChapter(vpRows[0]?.affinity);
          productIds = await this.trendingByChapter(chapter, limit);
          break;
        }
        case 'graph_rec': {
          // Item-based collaborative filtering over the co-engagement graph.
          productIds = await graphRecForVisitor(pool, visitorId, limit);
          // Cold start / sparse graph → top up with cosine 'for_you'.
          if (productIds.length < limit) {
            const vec = await this.visitorVector(visitorId);
            const { rows } = await pool.query<{ product_id: string }>(
              `SELECT pe.product_id FROM product_embedding pe
               JOIN product p ON p.id = pe.product_id
               WHERE p.deleted_at IS NULL ${productIds.length ? 'AND pe.product_id <> ALL($3)' : ''}
               ORDER BY pe.embedding <=> $1::vector
               LIMIT $2`,
              productIds.length
                ? [`[${vec.join(',')}]`, limit - productIds.length, productIds]
                : [`[${vec.join(',')}]`, limit - productIds.length]
            );
            productIds = [...productIds, ...rows.map((r) => r.product_id)];
          }
          break;
        }
      }
    } catch (e) {
      console.warn('[ORACLE] forVisitor error:', (e as Error).message?.slice(0, 120));
      productIds = [];
    }

    // Record served recommendation for attribution
    if (productIds.length > 0) {
      await this.createRecommendations([{
        visitor_id: visitorId,
        strategy,
        product_ids: productIds,
        score: productIds.length,
        served_at: new Date(),
      } as any]).catch(() => {});
    }

    return productIds;
  }

  /**
   * Thompson-sampling bandit for broadcast block ordering.
   * State: Redis hash `bandit:{segment}:{block}` → `alpha beta`
   */
  async rankBroadcastBlocks(visitorId: string, candidateBlocks: string[]): Promise<string[]> {
    const redis = getRedis();
    if (!redis || candidateBlocks.length === 0) return candidateBlocks;

    // Get visitor segment for per-segment priors
    const pool = getPool();
    let segment = 'new_seeker';
    try {
      const { rows } = await pool.query<{ segment: string }>(
        `SELECT segment FROM visitor_profile WHERE visitor_id=$1 LIMIT 1`,
        [visitorId]
      );
      if (rows[0]) segment = rows[0].segment;
    } catch {}

    const scored: { block: string; theta: number }[] = [];
    for (const block of candidateBlocks) {
      const key = `bandit:${segment}:${block}`;
      const raw = await redis.hgetall(key).catch(() => null);
      const alpha = parseFloat(raw?.alpha ?? '1');
      const beta = parseFloat(raw?.beta ?? '1');
      // Thompson sample: draw from Beta(alpha, beta) approximated via Gamma sampling
      const theta = this.betaSample(alpha, beta);
      scored.push({ block, theta });
    }
    scored.sort((a, b) => b.theta - a.theta);
    return scored.map(s => s.block);
  }

  /** Apply a reward to a bandit arm. Called by the Learning Loop on conversion events. */
  async reward(visitorId: string, block: string, reward: number) {
    const redis = getRedis();
    if (!redis) return;
    const pool = getPool();
    let segment = 'new_seeker';
    try {
      const { rows } = await pool.query<{ segment: string }>(
        `SELECT segment FROM visitor_profile WHERE visitor_id=$1 LIMIT 1`,
        [visitorId]
      );
      if (rows[0]) segment = rows[0].segment;
    } catch {}
    const key = `bandit:${segment}:${block}`;
    if (reward > 0) {
      await redis.hincrbyfloat(key, 'alpha', reward).catch(() => {});
    } else {
      await redis.hincrbyfloat(key, 'beta', 1).catch(() => {});
    }
  }

  /** Mark a served recommendation clicked/converted. */
  async attribute(recId: string, kind: 'click' | 'convert') {
    await this.updateRecommendations([{
      selector: { id: recId },
      data: kind === 'click' ? { clicked: true } : { clicked: true, converted: true },
    }] as any).catch(() => {});
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async visitorVector(visitorId: string): Promise<number[]> {
    const pool = getPool();
    try {
      const { rows } = await pool.query<{ affinity: any }>(
        `SELECT affinity FROM visitor_profile WHERE visitor_id=$1 LIMIT 1`,
        [visitorId]
      );
      if (!rows[0]) return DEFAULT_VEC;
      const affinity = rows[0].affinity?.chapter ?? {};
      const chapters = ['stillness', 'armor', 'signal', 'altar', 'relentless'];
      const raw = chapters.map(c => affinity[c] ?? 0);
      const norm = raw.reduce((s, v) => s + v, 0) || 1;
      // Blend with chapter one-hot based on dominant chapter
      const dominant = chapters.reduce((a, b) => (affinity[a] ?? 0) > (affinity[b] ?? 0) ? a : b);
      const dominantVec = CHAPTER_VEC[dominant] ?? DEFAULT_VEC;
      return dominantVec.map((v, i) => 0.7 * v + 0.3 * (raw[i] / norm));
    } catch { return DEFAULT_VEC; }
  }

  private async trendingByChapter(chapter: string | null, limit: number): Promise<string[]> {
    const pool = getPool();
    const { rows } = await pool.query<{ product_id: string }>(
      `SELECT se.entity_id AS product_id, count(*) AS hits
       FROM signal_event se
       JOIN product p ON p.id = se.entity_id
       WHERE se.type IN ('product_view','add_to_cart','purchase')
         AND p.deleted_at IS NULL
         ${chapter ? "AND p.metadata->>'chapter' = $2" : ''}
         AND se.ts > now() - interval '7 days'
       GROUP BY se.entity_id
       ORDER BY hits DESC
       LIMIT $1`,
      chapter ? [limit, chapter] : [limit]
    );
    if (rows.length < limit) {
      // cold-start fallback: random products of the chapter
      const { rows: fallback } = await pool.query<{ id: string }>(
        `SELECT p.id FROM product p
         WHERE p.deleted_at IS NULL
         ${chapter ? "AND p.metadata->>'chapter' = $2" : ''}
         ORDER BY random()
         LIMIT $1`,
        chapter ? [limit - rows.length, chapter] : [limit - rows.length]
      );
      return [...rows.map(r => r.product_id), ...fallback.map(r => r.id)].slice(0, limit);
    }
    return rows.map(r => r.product_id);
  }

  private dominantChapter(affinity: any): string {
    const chapter = affinity?.chapter ?? {};
    const entries = Object.entries(chapter) as [string, number][];
    if (entries.length === 0) return 'relentless';
    return entries.reduce((a, b) => a[1] > b[1] ? a : b)[0];
  }

  /** Approximate Beta(α,β) sample via Normal approximation (fast, accurate for α,β>1). */
  private betaSample(alpha: number, beta: number): number {
    const mean = alpha / (alpha + beta);
    const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
    // Box-Muller transform for standard normal
    const u1 = Math.max(1e-10, Math.random());
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.max(0, Math.min(1, mean + Math.sqrt(variance) * z));
  }
}

export default RecommendationService;
