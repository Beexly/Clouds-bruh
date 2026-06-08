import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import pg from 'pg';

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
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message?.slice(0, 200) });
  }
};
