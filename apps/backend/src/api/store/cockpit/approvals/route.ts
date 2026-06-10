import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import pg from 'pg';
import Redis from 'ioredis';
import { authorizeOps } from '../../../../lib/lumera-auth';
import { selectPendingAction } from '../../../../lib/approvals';

let _pool: pg.Pool | null = null;
function pool() {
  if (_pool) return _pool;
  _pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  return _pool;
}

/**
 * POST /store/cockpit/approvals — the founder resolves an escalated agent action.
 *
 * Approve → execute the action the AGENT escalated (read from the run's stored `pending_actions`),
 * NOT a tool/input supplied in the request body. The client only chooses run_id + decision (+ an
 * optional action_index). This keeps the approval path from becoming an arbitrary tool-execution API:
 * the only thing that can run is what the agent itself proposed and the founder approved.
 * Reject → mark resolved, nothing runs.
 *
 * Gated like the rest of the cockpit: COCKPIT_KEY header (fail-closed in prod / staging) via authorizeOps.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!authorizeOps(req, res)) return;

  const body = (req.body ?? {}) as Record<string, unknown>;
  const runId = typeof body.run_id === 'string' ? body.run_id : '';
  const decision = body.decision === 'approve' || body.decision === 'reject' ? body.decision : null;
  const actionIndex = Number.isInteger(body.action_index) ? (body.action_index as number) : 0;
  if (!runId || !decision) {
    return res.status(400).json({ error: 'run_id and decision (approve|reject) are required' });
  }

  // Approval execution requires the orchestrator's job stream; reject needs no execution.
  if (decision === 'approve' && !process.env.REDIS_URL) {
    return res.status(503).json({ error: 'redis_required — approvals execute via the agent job stream (set REDIS_URL)' });
  }

  try {
    if (decision === 'reject') {
      const { rowCount } = await pool().query(
        `UPDATE agent_run SET status='success', outcome='rejected_by_founder', finished_at=now()
          WHERE id=$1 AND status='awaiting_approval'`,
        [runId]
      );
      if (!rowCount) return res.status(404).json({ error: 'run not found or already resolved' });
      return res.json({ ok: true, decision, dispatched: false });
    }

    // Approve: read the run + the action the AGENT stored. to_jsonb() so a pre-migration DB whose
    // agent_run lacks a pending_actions column degrades to null (→ selectPendingAction returns null →
    // we refuse) rather than throwing.
    const { rows } = await pool().query(
      `SELECT id, agent, status, (to_jsonb(agent_run.*)->'pending_actions') AS pending_actions
         FROM agent_run WHERE id=$1`,
      [runId]
    );
    const run = rows[0];
    if (!run) return res.status(404).json({ error: 'run not found' });
    if (run.status !== 'awaiting_approval') {
      return res.status(409).json({ error: 'run is not awaiting approval (already resolved)' });
    }

    const action = selectPendingAction(run.pending_actions, actionIndex);
    if (!action) {
      return res.status(422).json({
        error: 'no stored escalated action to approve for this run — refusing (approvals execute only what the agent proposed)',
      });
    }

    // Resolve the run (leaves the inbox) — guarded so a concurrent approval can't double-dispatch.
    const { rowCount } = await pool().query(
      `UPDATE agent_run SET status='success', outcome='approved_by_founder → dispatched', finished_at=now()
        WHERE id=$1 AND status='awaiting_approval'`,
      [runId]
    );
    if (!rowCount) return res.status(409).json({ error: 'run was resolved concurrently' });

    const job = {
      id: `approval_${Date.now()}`,
      type: 'approval',
      decision,
      run_id: runId,
      agent: String(run.agent ?? ''),
      tool: action.tool,
      input: action.input ?? {},
      approval_id: `apr_${crypto.randomUUID()}`,
      approved_at: new Date().toISOString(),
    };
    const redis = new Redis(process.env.REDIS_URL!, { lazyConnect: true });
    try {
      await redis.connect();
      await redis.xadd('lumera:agent-jobs', '*', 'payload', JSON.stringify(job));
    } finally {
      await redis.quit().catch(() => {});
    }
    return res.json({ ok: true, decision, dispatched: true, tool: job.tool, approval_id: job.approval_id });
  } catch (e: any) {
    return res.status(500).json({ error: e.message?.slice(0, 200) });
  }
};
