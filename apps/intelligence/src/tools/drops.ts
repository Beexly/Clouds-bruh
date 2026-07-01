import type { Tool } from './index';
import { Pool } from 'pg';
import { planDropActions, type LiveDrop } from '@lumera/shared';

let _pool: Pool | null = null;
function pool(): Pool {
  if (_pool) return _pool;
  _pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://lumera:lumera@localhost:5432/lumera' });
  return _pool;
}

/**
 * grade_drops — the LATR loop's read tool. Grades every LIVE drop on the day-7 sell-through rule and
 * returns scale/kill PROPOSALS (never executes). The Forecaster surfaces these; each proposal carries
 * the department + gated action (trigger_reorder / delist_product) the founder Approval Loop runs on a
 * tap. Read-only and fixture-safe: any DB error → empty (the loop simply finds nothing this cycle).
 */
export const gradeDropsTool: Tool = {
  name: 'grade_drops',
  description:
    'Grade all LIVE drops on the LATR sell-through rule (day-7 window) and return scale (restock) / kill (delist) proposals for founder approval. Read-only; proposals only, never executes.',
  inputSchema: { type: 'object', properties: {} },
  run: async () => {
    const { rows } = await pool()
      .query(
        `SELECT id, name, units_total, units_remaining,
                GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - created_at)) / 86400))::int AS days_live
           FROM "drop" WHERE status = 'live'`
      )
      .catch(() => ({ rows: [] as any[] }));

    const drops: LiveDrop[] = (rows as any[]).map((r) => ({
      id: String(r.id),
      name: r.name ? String(r.name) : undefined,
      units_total: Number(r.units_total ?? 0),
      units_remaining: Number(r.units_remaining ?? 0),
      days_live: Number(r.days_live ?? 0),
    }));

    const proposals = planDropActions(drops);
    return {
      graded: drops.length,
      proposals,
      note: proposals.length
        ? 'Escalate each proposal for founder approval (restocks → trigger_reorder; kills → delist_product via Warden).'
        : 'No drops crossed a scale/kill threshold this cycle.',
    };
  },
};
