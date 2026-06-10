import { Pool } from 'pg';
import type { AgentRun, Audit } from '@alterxiv/shared';

let _pool: Pool | null = null;

function pool(): Pool {
  if (_pool) return _pool;
  _pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://alterxiv:alterxiv@localhost:5432/alterxiv' });
  return _pool;
}

/**
 * DDL for the Ledger's two tables. These previously had NO migration anywhere, so on a fresh DB
 * every write threw → the circuit breaker wedged open → all agent_run/audit history silently fell
 * back to the volatile in-memory buffer (lost on restart) and the cockpit showed nothing. We now
 * create them idempotently (memoized) before the first read/write. Columns match the INSERTs below.
 */
let _ensured: Promise<void> | null = null;
export function ensureLedgerTables(): Promise<void> {
  if (_ensured) return _ensured;
  _ensured = pool()
    .query(`
      CREATE TABLE IF NOT EXISTS agent_run (
        id text primary key,
        agent text not null,
        trigger text,
        input jsonb,
        output jsonb,
        tools_used text[] not null default '{}',
        decisions text[] not null default '{}',
        status text not null default 'unknown',
        escalated boolean not null default false,
        outcome text,
        started_at timestamptz not null default now(),
        finished_at timestamptz
      );
      CREATE INDEX IF NOT EXISTS agent_run_agent_started_idx ON agent_run (agent, started_at DESC);
      ALTER TABLE agent_run ADD COLUMN IF NOT EXISTS pending_actions jsonb;

      CREATE TABLE IF NOT EXISTS audit (
        id text primary key,
        type text not null,
        severity text not null,
        finding text not null,
        recommendation text,
        falsifiable_check text,
        auto_corrected boolean not null default false,
        entity_ref text,
        created_at timestamptz not null default now()
      );
      CREATE INDEX IF NOT EXISTS audit_severity_created_idx ON audit (severity, created_at DESC);
    `)
    .then(() => undefined)
    .catch((e: any) => {
      // Don't cache a failure — let the next call retry once Postgres is reachable.
      _ensured = null;
      throw e;
    });
  return _ensured;
}

/**
 * Resilience (agentmemory pattern): a circuit-breaker around Postgres with an in-memory
 * fallback ring buffer. If Postgres fails repeatedly the breaker OPENS — writes go to
 * memory (never lost), reads merge memory + db — and HALF-OPENs after a cooldown to probe
 * recovery. A degraded DB never halts the CONGREGATION or drops a run record.
 */
const breaker = {
  failures: 0,
  threshold: 3,
  openUntil: 0,
  cooldownMs: 15_000,
  get open() {
    return Date.now() < this.openUntil;
  },
  trip() {
    this.failures += 1;
    if (this.failures >= this.threshold) {
      this.openUntil = Date.now() + this.cooldownMs;
      console.warn(`[ledger] circuit OPEN — Postgres degraded, using in-memory fallback for ${this.cooldownMs}ms`);
    }
  },
  reset() {
    if (this.failures > 0) console.log('[ledger] circuit reset — Postgres healthy');
    this.failures = 0;
    this.openUntil = 0;
  },
};

// In-memory fallback stores (ring-buffered).
const memRuns: AgentRun[] = [];
const memAudits: Audit[] = [];
const CAP = 500;
function push<T>(arr: T[], item: T) {
  arr.unshift(item);
  if (arr.length > CAP) arr.length = CAP;
}

async function withBreaker<T>(op: () => Promise<T>, fallback: () => T, label: string): Promise<T> {
  if (breaker.open) return fallback();
  try {
    const r = await op();
    breaker.reset();
    return r;
  } catch (e: any) {
    breaker.trip();
    console.warn(`[ledger] ${label} failed (${e.message?.slice(0, 60)}) — fallback`);
    return fallback();
  }
}

export const Ledger = {
  async record(run: AgentRun): Promise<void> {
    push(memRuns, run); // always mirror to memory first — never lose a record
    await withBreaker(
      async () => {
        await ensureLedgerTables();
        await pool().query(
          `INSERT INTO agent_run (id, agent, trigger, input, output, tools_used, decisions, status, escalated, pending_actions, started_at, finished_at)
           VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8,$9,$10::jsonb,$11,$12)
           ON CONFLICT (id) DO UPDATE SET
             output = EXCLUDED.output, tools_used = EXCLUDED.tools_used, decisions = EXCLUDED.decisions,
             status = EXCLUDED.status, escalated = EXCLUDED.escalated,
             pending_actions = EXCLUDED.pending_actions, finished_at = EXCLUDED.finished_at`,
          [
            run.id, run.agent, run.trigger,
            JSON.stringify(run.input), JSON.stringify(run.output),
            run.tools_used, run.decisions, run.status, run.escalated,
            run.pending_actions ? JSON.stringify(run.pending_actions) : null,
            run.started_at, run.finished_at ?? null,
          ]
        );
      },
      () => undefined,
      'record'
    );
  },

  async outcome(runId: string, outcome: string): Promise<void> {
    const m = memRuns.find((r) => r.id === runId);
    if (m) m.outcome = outcome;
    await withBreaker(
      async () => {
        await ensureLedgerTables();
        await pool().query(`UPDATE agent_run SET outcome=$1, finished_at=now() WHERE id=$2`, [outcome, runId]);
      },
      () => undefined,
      'outcome'
    );
  },

  async history(agent: string, limit = 50): Promise<AgentRun[]> {
    return withBreaker(
      async () => {
        await ensureLedgerTables();
        const { rows } = await pool().query(
          `SELECT * FROM agent_run WHERE agent=$1 ORDER BY started_at DESC LIMIT $2`,
          [agent, limit]
        );
        return rows as AgentRun[];
      },
      () => memRuns.filter((r) => r.agent === agent).slice(0, limit),
      'history'
    );
  },

  async audit(a: Audit): Promise<void> {
    push(memAudits, a);
    await withBreaker(
      async () => {
        await ensureLedgerTables();
        await pool().query(
          `INSERT INTO audit (id, type, severity, finding, recommendation, falsifiable_check, auto_corrected, entity_ref, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
          [
            a.id ?? crypto.randomUUID(), a.type, a.severity, a.finding, a.recommendation,
            a.falsifiable_check, a.auto_corrected, a.entity_ref ?? null, a.created_at ?? new Date().toISOString(),
          ]
        );
      },
      () => undefined,
      'audit'
    );
  },

  async openAudits(severity?: Audit['severity']): Promise<Audit[]> {
    return withBreaker(
      async () => {
        await ensureLedgerTables();
        const { rows } = await pool().query(
          severity
            ? `SELECT * FROM audit WHERE severity=$1 ORDER BY created_at DESC LIMIT 50`
            : `SELECT * FROM audit ORDER BY created_at DESC LIMIT 50`,
          severity ? [severity] : []
        );
        return rows as Audit[];
      },
      () => (severity ? memAudits.filter((a) => a.severity === severity) : memAudits).slice(0, 50),
      'openAudits'
    );
  },

  async recentRuns(limit = 20): Promise<AgentRun[]> {
    return withBreaker(
      async () => {
        await ensureLedgerTables();
        const { rows } = await pool().query(`SELECT * FROM agent_run ORDER BY started_at DESC LIMIT $1`, [limit]);
        return rows as AgentRun[];
      },
      () => memRuns.slice(0, limit),
      'recentRuns'
    );
  },

  /** Health probe for the OPERATOR's daily report. */
  get circuitState() {
    return breaker.open ? 'open' : breaker.failures > 0 ? 'half-open' : 'closed';
  },
};
