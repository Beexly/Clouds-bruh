import type pg from 'pg';

/**
 * GRAPH-REC (RecoGCN-inspired) — ORACLE's graph strategy.
 * Raw cosine treats products as isolated vectors. The "what goes with what" signal lives in
 * graph STRUCTURE: visitors ↔ products ↔ chapters, with co-engagement edges. RecoGCN learns
 * this offline via relational graph convolution + meta-paths; here we serve its practical
 * online form — item-based collaborative filtering over the co-engagement graph:
 *
 *   seed        = products THIS visitor recently engaged (view/cart/buy)
 *   co-visitors = other visitors who engaged any seed product
 *   candidates  = products those co-visitors also engaged, weighted by co-occurrence,
 *                 purchases weighted highest — "people who wore this also wore…"
 *
 * Cold start (no seed) → empty, and the caller falls back to cosine for_you.
 * This is a real, explainable graph rec today; swap in exported RecoGCN node-embeddings
 * (pgvector) when the offline GCN is trained, keeping the same interface + Learning-Loop hooks.
 */
export async function graphRecForVisitor(pool: pg.Pool, visitorId: string, limit = 12): Promise<string[]> {
  try {
    const { rows } = await pool.query<{ product_id: string }>(
      `
      WITH seed AS (
        SELECT DISTINCT entity_id AS pid
        FROM signal_event
        WHERE visitor_id = $1
          AND type IN ('product_view','add_to_cart','purchase')
          AND entity_id IS NOT NULL
        ORDER BY entity_id
        LIMIT 10
      ),
      covisitors AS (
        SELECT DISTINCT se.visitor_id
        FROM signal_event se
        WHERE se.entity_id IN (SELECT pid FROM seed)
          AND se.visitor_id <> $1
          AND se.type IN ('product_view','add_to_cart','purchase')
        LIMIT 500
      )
      SELECT se.entity_id AS product_id,
             SUM(CASE se.type WHEN 'purchase' THEN 3 WHEN 'add_to_cart' THEN 2 ELSE 1 END)::int AS weight
      FROM signal_event se
      JOIN product p ON p.id = se.entity_id AND p.deleted_at IS NULL
      WHERE se.visitor_id IN (SELECT visitor_id FROM covisitors)
        AND se.type IN ('product_view','add_to_cart','purchase')
        AND se.entity_id IS NOT NULL
        AND se.entity_id NOT IN (SELECT pid FROM seed)
      GROUP BY se.entity_id
      ORDER BY weight DESC, se.entity_id
      LIMIT $2
      `,
      [visitorId, limit]
    );
    return rows.map((r) => r.product_id);
  } catch (e) {
    console.warn('[ORACLE/graph_rec]', (e as Error).message?.slice(0, 120));
    return [];
  }
}
