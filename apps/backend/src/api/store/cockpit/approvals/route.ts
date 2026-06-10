import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import pg from 'pg';
import Redis from 'ioredis';

let _pool: pg.Pool | null = null;
function pool() {
  if (_pool) return _pool;
  _pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  return _pool;
}

/**
 * POST /store/cockpit/approvals — the founder resolves an escalated agent action.
 * Approve → mark the run resolved and enqueue an `approval` job the intelligence orchestrator
 * executes with founder authority (executeApprovedAction). Reject → mark resolved, nothing runs.
 * Gated exactly like /store/cockpit: COCKPIT_KEY header, fail-closed in production.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const required = process.env.COCKPIT_KEY;
  const provided = req.headers['x-cockpit-key'] as string;
  if (required) {
    if (provided !== required) return res.status(401).json({ error: 'unauthorized' });
  } else if (process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'unauthorized — set COCKPIT_KEY to use approvals' });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const runId = typeof body.run_id === 'string' ? body.run_id : '';
  const agent = typeof body.agent === 'string' ? body.agent : '';
  const tool = typeof body.tool === 'string' ? body.tool : '';
  const decision = body.decision === 'approve' || body.decision === 'reject' ? body.decision : null;
  if (!runId || !agent || !decision || (decision === 'approve' && !tool)) {
    return res.status(400).json({ error: 'run_id, agent, decision (and tool when approving) are required' });
  }

  // Approval execution requires the orchestrator's job stream; reject needs no execution.
  if (decision === 'approve' && !process.env.REDIS_URL) {
    return res.status(503).json({ error: 'redis_required — approvals execute via the agent job stream (set REDIS_URL)' });
  }

  try {
    // Resolve the run (leaves the inbox) — only if it is actually still awaiting approval.
    const { rowCount } = await pool().query(
      `UPDATE agent_run SET status='success',
              outcome=$2,
              finished_at=now()
        WHERE id=$1 AND status='awaiting_approval'`,
      [runId, decision === 'approve' ? 'approved_by_founder → dispatched' : 'rejected_by_founder']
    );
    if (!rowCount) return res.status(404).json({ error: 'run not found or already resolved' });

    if (decision === 'approve') {
      const job = {
        id: `approval_${Date.now()}`,
        type: 'approval',
        decision,
        run_id: runId,
        agent,
        tool,
        input: body.input ?? {},
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
      return res.json({ ok: true, decision, dispatched: true, approval_id: job.approval_id });
    }
    return res.json({ ok: true, decision, dispatched: false });
  } catch (e: any) {
    return res.status(500).json({ error: e.message?.slice(0, 200) });
  }
};
