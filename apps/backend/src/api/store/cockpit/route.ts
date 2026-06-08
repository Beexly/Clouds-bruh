import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import pg from 'pg';
import { integrationStatus } from '../../../lib/integrations';

let _pool: pg.Pool | null = null;
function pool() {
  if (_pool) return _pool;
  _pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  return _pool;
}

async function q<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const c = await pool().connect();
  try {
    await c.query('BEGIN READ ONLY');
    const r = await c.query(sql, params);
    await c.query('COMMIT');
    return r.rows as T[];
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

/**
 * GET /store/cockpit — the Founder's Cockpit: a read-only snapshot of the company running
 * itself. Latest OPERATOR loop, the founder approval inbox (escalations), recent agent runs,
 * open audits, and drop status. Gated by COCKPIT_KEY when set (?key= or x-cockpit-key).
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  // Internal ops surface — fail CLOSED in production. Requires the COCKPIT_KEY header.
  // Open in non-production for local/dev convenience. Header-only (no query string — avoids log leakage).
  const required = process.env.COCKPIT_KEY;
  const provided = req.headers['x-cockpit-key'] as string;
  if (required) {
    if (provided !== required) return res.status(401).json({ error: 'unauthorized' });
  } else if (process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'unauthorized — set COCKPIT_KEY to expose the cockpit' });
  }

  try {
    const [operator] = await q(
      `SELECT id, output, decisions, status, started_at, finished_at
         FROM agent_run WHERE agent='operator' ORDER BY started_at DESC LIMIT 1`
    ).catch(() => []);

    const inbox = await q(
      `SELECT id, agent, decisions, started_at FROM agent_run
        WHERE status='awaiting_approval' ORDER BY started_at DESC LIMIT 20`
    ).catch(() => []);

    const recentRuns = await q(
      `SELECT agent, status, escalated, started_at FROM agent_run
        ORDER BY started_at DESC LIMIT 12`
    ).catch(() => []);

    const audits = await q(
      `SELECT severity, COUNT(*)::int AS count FROM audit
        WHERE created_at > now() - interval '7 days' GROUP BY severity`
    ).catch(() => []);

    const drops = await q(
      `SELECT status, COUNT(*)::int AS count FROM "drop" GROUP BY status`
    ).catch(() => []);

    const [signals] = await q(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE type='purchase')::int AS purchases
         FROM signal_event WHERE ts > now() - interval '7 days'`
    ).catch(() => [{ total: 0, purchases: 0 }]);

    // ── Founder business KPIs ────────────────────────────────────────────────
    // All read-only, all integer-cents (divide by 100 for display), each independently
    // .catch()-wrapped so a missing/empty table or schema drift degrades to zero — never a 500.
    // Revenue is line-item truth: order_line_item.unit_price × order_item.quantity, taking the
    // latest order_item version per order so amendments/edits don't double-count.
    const revenueSql = (interval: string) => `
      WITH latest AS (
        SELECT oi.item_id, oi.quantity, oi.order_id,
               row_number() OVER (PARTITION BY oi.item_id ORDER BY oi.version DESC) AS rn
          FROM order_item oi
          JOIN "order" o ON o.id = oi.order_id
         WHERE o.created_at > now() - interval '${interval}'
           AND o.deleted_at IS NULL AND oi.deleted_at IS NULL
      )
      SELECT COALESCE(SUM(li.unit_price * l.quantity), 0)::bigint AS revenue_cents
        FROM latest l
        JOIN order_line_item li ON li.id = l.item_id
       WHERE l.rn = 1`;

    const [rev7] = await q<{ revenue_cents: string }>(revenueSql('7 days')).catch(() => [{ revenue_cents: '0' }]);
    const [rev30] = await q<{ revenue_cents: string }>(revenueSql('30 days')).catch(() => [{ revenue_cents: '0' }]);

    const [orders30] = await q<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM "order"
        WHERE created_at > now() - interval '30 days' AND deleted_at IS NULL`
    ).catch(() => [{ count: 0 }]);

    // Return rate: orders in the last 30d that have any return-requested line vs total orders.
    const [returns30] = await q<{ returned: number; total: number }>(
      `SELECT
         COUNT(DISTINCT oi.order_id) FILTER (WHERE oi.return_requested_quantity > 0)::int AS returned,
         COUNT(DISTINCT oi.order_id)::int AS total
       FROM order_item oi
       JOIN "order" o ON o.id = oi.order_id
       WHERE o.created_at > now() - interval '30 days'
         AND o.deleted_at IS NULL AND oi.deleted_at IS NULL`
    ).catch(() => [{ returned: 0, total: 0 }]);

    // Top products by SIGNAL engagement in the last 7d (sales proxy via add_to_cart).
    const topProducts = await q<{ title: string; chapter: string | null; signals: number; cart_adds: number }>(
      `SELECT p.title, p.metadata->>'chapter' AS chapter,
              COUNT(*)::int AS signals,
              SUM(CASE WHEN se.type='add_to_cart' THEN 1 ELSE 0 END)::int AS cart_adds
         FROM signal_event se
         JOIN product p ON p.id = se.entity_id AND p.deleted_at IS NULL
        WHERE se.ts > now() - interval '7 days'
          AND se.type IN ('product_view','add_to_cart','purchase')
        GROUP BY p.id, p.title, p.metadata
        ORDER BY signals DESC LIMIT 5`
    ).catch(() => []);

    // Low-stock live drops (≤ 20% of units remaining) — restock/curation signal.
    const lowStockDrops = await q<{ name: string; chapter: string; units_total: number; units_remaining: number; pct_remaining: number }>(
      `SELECT name, chapter, units_total, units_remaining,
              ROUND(CASE WHEN units_total > 0
                THEN units_remaining::numeric / units_total::numeric * 100 ELSE 0 END, 1) AS pct_remaining
         FROM "drop"
        WHERE status = 'live' AND units_total > 0
          AND units_remaining::numeric / units_total::numeric <= 0.20
        ORDER BY pct_remaining ASC LIMIT 5`
    ).catch(() => []);

    const revenue7d = Number(rev7?.revenue_cents ?? 0);
    const revenue30d = Number(rev30?.revenue_cents ?? 0);
    const orderCount30d = orders30?.count ?? 0;
    const aov30d = orderCount30d > 0 ? Math.round(revenue30d / orderCount30d) : 0;
    const returnTotal = returns30?.total ?? 0;
    const returnRate30d = returnTotal > 0 ? (returns30?.returned ?? 0) / returnTotal : 0;

    const kpis = {
      revenue_7d_cents: revenue7d,
      revenue_30d_cents: revenue30d,
      order_count_30d: orderCount30d,
      aov_30d_cents: aov30d,
      return_rate_30d: returnRate30d, // 0..1 fraction
      returns_30d: returns30?.returned ?? 0,
      top_products: topProducts,
      low_stock_drops: lowStockDrops,
    };

    res.json({
      generated_at: new Date().toISOString(),
      operator: operator
        ? {
            summary: (operator.output as any)?.summary ?? null,
            founder_inbox: (operator.output as any)?.founder_inbox ?? [],
            ledger_health: (operator.output as any)?.ledger_health ?? 'unknown',
            status: operator.status,
            ran_at: operator.started_at,
          }
        : null,
      approval_inbox: inbox.map((r) => ({
        id: r.id,
        agent: r.agent,
        reason: (r.decisions ?? []).filter((d: string) => d.startsWith('ESCALATE')).join('; ') || 'awaiting approval',
        at: r.started_at,
      })),
      recent_runs: recentRuns,
      audits_7d: audits,
      drops,
      signals_7d: signals,
      kpis,
      integrations: integrationStatus(),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message?.slice(0, 200) });
  }
};
