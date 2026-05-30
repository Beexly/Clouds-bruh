import { Pool } from 'pg';
import type { AgentRun, Audit } from '@alterxiv/shared';

let _pool: Pool | null = null;

function pool(): Pool {
  if (_pool) return _pool;
  _pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://alterxiv:alterxiv@localhost:5432/alterxiv' });
  return _pool;
}

/**
 * The Ledger — shared agent memory + audit log.
 * Every agent reads relevant history before acting and writes decisions after.
 * This is how CONGREGATION learns from itself. Backed by Postgres.
 */
export const Ledger = {
  async record(run: AgentRun): Promise<void> {
    await pool().query(
      `INSERT INTO agent_run (id, agent, trigger, input, output, tools_used, decisions, status, escalated, started_at, finished_at)
       VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET
         output = EXCLUDED.output,
         tools_used = EXCLUDED.tools_used,
         decisions = EXCLUDED.decisions,
         status = EXCLUDED.status,
         escalated = EXCLUDED.escalated,
         finished_at = EXCLUDED.finished_at`,
      [
        run.id, run.agent, run.trigger,
        JSON.stringify(run.input), JSON.stringify(run.output),
        run.tools_used, run.decisions,
        run.status, run.escalated,
        run.started_at, run.finished_at ?? null,
      ]
    );
  },

  async outcome(runId: string, outcome: string): Promise<void> {
    await pool().query(
      `UPDATE agent_run SET outcome=$1, finished_at=now() WHERE id=$2`,
      [outcome, runId]
    );
  },

  async history(agent: string, limit = 50): Promise<AgentRun[]> {
    const { rows } = await pool().query(
      `SELECT * FROM agent_run WHERE agent=$1 ORDER BY started_at DESC LIMIT $2`,
      [agent, limit]
    );
    return rows as AgentRun[];
  },

  async audit(a: Audit): Promise<void> {
    await pool().query(
      `INSERT INTO audit (id, type, severity, finding, recommendation, falsifiable_check, auto_corrected, entity_ref, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO NOTHING`,
      [
        a.id ?? crypto.randomUUID(),
        a.type, a.severity, a.finding, a.recommendation,
        a.falsifiable_check, a.auto_corrected, a.entity_ref ?? null,
        a.created_at ?? new Date().toISOString(),
      ]
    );
  },

  async openAudits(severity?: Audit['severity']): Promise<Audit[]> {
    const { rows } = await pool().query(
      severity
        ? `SELECT * FROM audit WHERE severity=$1 ORDER BY created_at DESC LIMIT 50`
        : `SELECT * FROM audit ORDER BY created_at DESC LIMIT 50`,
      severity ? [severity] : []
    );
    return rows as Audit[];
  },

  async recentRuns(limit = 20): Promise<AgentRun[]> {
    const { rows } = await pool().query(
      `SELECT * FROM agent_run ORDER BY started_at DESC LIMIT $1`,
      [limit]
    );
    return rows as AgentRun[];
  },
};
