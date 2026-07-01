/**
 * Drop grader — the deterministic last mile of the LATR loop. Reads live drops, grades them with the
 * shared planner, and writes restock/kill PROPOSALS straight into the founder approval inbox as
 * `awaiting_approval` agent_run rows (the same shape the cockpit + Approval Loop already consume).
 *
 * Why deterministic (not the LLM Forecaster): this runs with ANTHROPIC_API_KEY absent, so the
 * scale-or-kill engine works even with the agents asleep. Each proposal maps to a real escalation
 * gate (forecaster/trigger_reorder, warden/delist_product) → founder taps Approve & Execute → the
 * Approval Loop runs it. Everything DB is best-effort/fixture-safe; the shaping is pure + tested.
 */

import { pool, ensureAgentRunTable } from './lumera-db';
import { type LiveDrop, type DropProposal } from '@lumera/shared';

/** Read live drops (fixture-safe → []). created_at gives days_live; matches the grade_drops tool. */
export async function readLiveDrops(): Promise<LiveDrop[]> {
  const { rows } = await pool()
    .query(
      `SELECT id, name, units_total, units_remaining,
              GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - created_at)) / 86400))::int AS days_live
         FROM "drop" WHERE status = 'live'`
    )
    .catch(() => ({ rows: [] as any[] }));
  return (rows as any[]).map((r) => ({
    id: String(r.id),
    name: r.name ? String(r.name) : undefined,
    units_total: Number(r.units_total ?? 0),
    units_remaining: Number(r.units_remaining ?? 0),
    days_live: Number(r.days_live ?? 0),
  }));
}

export interface ProposalRun {
  id: string;
  agent: string;
  trigger: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  tools_used: string[];
  decisions: string[];
  status: string;
  escalated: boolean;
  pending_actions: Array<{ tool: string; input: unknown }>;
  started_at: string;
  finished_at: string | null;
}

/**
 * PURE: shape a proposal into an `awaiting_approval` agent_run row. The decisions line starts with
 * "ESCALATE →" so the cockpit derives the inbox reason from it; pending_actions drives the
 * Approve & Execute button; input.drop_id + input.source enable dedup.
 */
export function buildProposalRun(p: DropProposal, now: Date = new Date()): ProposalRun {
  const ts = now.toISOString();
  const label = p.grade === 'scale' ? `restock ${p.name ?? p.drop_id}` : `delist ${p.name ?? p.drop_id}`;
  return {
    id: crypto.randomUUID(),
    agent: p.agent,
    trigger: 'cron',
    input: { source: 'drop-grader', drop_id: p.drop_id, grade: p.grade, sell_through: p.sell_through },
    output: { proposal: p },
    tools_used: [],
    decisions: [`ESCALATE → ${p.tool} (${label}) — ${p.reason}`],
    status: 'awaiting_approval',
    escalated: true,
    pending_actions: [{ tool: p.tool, input: p.input }],
    started_at: ts,
    finished_at: null,
  };
}

/** Drop_ids that already have an OPEN drop-grader proposal (dedup so we don't re-propose daily). */
export async function openProposalDropIds(): Promise<Set<string>> {
  const { rows } = await pool()
    .query(
      `SELECT input->>'drop_id' AS drop_id FROM agent_run
        WHERE status = 'awaiting_approval'
          AND input->>'source' = 'drop-grader'
          AND input->>'drop_id' IS NOT NULL`
    )
    .catch(() => ({ rows: [] as any[] }));
  return new Set((rows as any[]).map((r) => String(r.drop_id)));
}

/** Best-effort insert of one proposal run into the shared agent_run table (cockpit reads it). */
export async function insertProposalRun(run: ProposalRun): Promise<boolean> {
  try {
    // Make the write safe on a fresh Cloud DB where intelligence's Ledger hasn't created agent_run yet.
    await ensureAgentRunTable();
    await pool().query(
      `INSERT INTO agent_run
         (id, agent, trigger, input, output, tools_used, decisions, status, escalated, pending_actions, started_at, finished_at)
       VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8,$9,$10::jsonb,$11,$12)`,
      [
        run.id, run.agent, run.trigger,
        JSON.stringify(run.input), JSON.stringify(run.output),
        run.tools_used, run.decisions, run.status, run.escalated,
        JSON.stringify(run.pending_actions), run.started_at, run.finished_at,
      ]
    );
    return true;
  } catch {
    return false;
  }
}
