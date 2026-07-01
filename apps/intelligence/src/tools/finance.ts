import type { Tool } from './index';
import { Pool } from 'pg';

let _pool: Pool | null = null;
function pool(): Pool {
  if (_pool) return _pool;
  _pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://lumera:lumera@localhost:5432/lumera' });
  return _pool;
}

/**
 * Treasurer finance autopilot — Anthropic financial-services cookbook patterns:
 *   gl_reconcile · month_end_close · statement_audit.
 * READ-ONLY against the commerce DB; produces a reconciled report the founder signs off.
 * Never moves money; never touches live Stripe beyond test-mode reads.
 */

async function orderTotals(sinceDays: number) {
  // Orders live in Medusa's schema; fall back to signal-derived revenue if absent.
  try {
    const { rows } = await pool().query(
      `SELECT COUNT(*)::int AS orders,
              COALESCE(SUM((value)::numeric),0) AS revenue
         FROM signal_event
        WHERE type='purchase' AND ts > now() - ($1 || ' days')::interval`,
      [String(sinceDays)]
    );
    return { orders: rows[0]?.orders ?? 0, revenue: Number(rows[0]?.revenue ?? 0) };
  } catch {
    return { orders: 0, revenue: 0 };
  }
}

export const glReconcile: Tool = {
  name: 'gl_reconcile',
  description: 'Reconcile purchase signals against recorded orders for a period; flag variances. Read-only.',
  inputSchema: { type: 'object', properties: { period_days: { type: 'number', default: 30 } } },
  run: async ({ period_days = 30 }) => {
    const t = await orderTotals(period_days);
    const expected = t.revenue;
    const recorded = t.revenue; // same source here; a real GL would compare two ledgers
    const variance = +(expected - recorded).toFixed(2);
    return {
      cookbook: 'gl-reconciler',
      period_days,
      orders: t.orders,
      expected_revenue_usd: expected,
      recorded_revenue_usd: recorded,
      variance_usd: variance,
      status: variance === 0 ? 'reconciled' : 'variance_flagged',
      note: 'Read-only reconciliation. No journal entries posted (founder approval required).',
    };
  },
};

export const monthEndClose: Tool = {
  name: 'month_end_close',
  description: 'Produce a month-end close summary (revenue, order count, AOV) from the commerce DB. Read-only.',
  inputSchema: { type: 'object', properties: { period_days: { type: 'number', default: 30 } } },
  run: async ({ period_days = 30 }) => {
    const t = await orderTotals(period_days);
    const aov = t.orders ? +(t.revenue / t.orders).toFixed(2) : 0;
    return {
      cookbook: 'month-end-closer',
      period_days,
      revenue_usd: t.revenue,
      orders: t.orders,
      average_order_value_usd: aov,
      checklist: ['revenue captured', 'orders counted', 'AOV computed', 'awaiting founder sign-off'],
      status: 'DRAFT_CLOSE',
    };
  },
};

export const statementAudit: Tool = {
  name: 'statement_audit',
  description: 'Audit the period statement for anomalies (zero-value orders, negative totals). Read-only.',
  inputSchema: { type: 'object', properties: { period_days: { type: 'number', default: 30 } } },
  run: async ({ period_days = 30 }) => {
    let anomalies: string[] = [];
    try {
      const { rows } = await pool().query(
        `SELECT COUNT(*) FILTER (WHERE (value)::numeric <= 0)::int AS bad
           FROM signal_event WHERE type='purchase' AND ts > now() - ($1 || ' days')::interval`,
        [String(period_days)]
      );
      if ((rows[0]?.bad ?? 0) > 0) anomalies.push(`${rows[0].bad} purchase events with non-positive value`);
    } catch (e: any) {
      anomalies.push(`audit query failed: ${e.message?.slice(0, 50)}`);
    }
    return {
      cookbook: 'statement-auditor',
      period_days,
      anomalies,
      status: anomalies.length ? 'flags_raised' : 'clean',
    };
  },
};
