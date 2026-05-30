import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import pg from 'pg';
import { matchQuery, buildInsight, buildChart } from './bi';

let _pool: pg.Pool | null = null;
function pool() {
  if (_pool) return _pool;
  _pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  return _pool;
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const question = (req.query.q as string)?.trim();
  if (!question) {
    return res.status(400).json({ error: 'Missing ?q= parameter. Example: ?q=which+chapter+has+the+best+margin' });
  }

  try {
    const { sql, description, columns } = matchQuery(question);

    const client = await pool().connect();
    let rows: any[] = [];
    try {
      await client.query('BEGIN READ ONLY');
      const result = await client.query(sql);
      await client.query('COMMIT');
      rows = result.rows;
    } catch (qe) {
      await client.query('ROLLBACK').catch(() => {});
      throw qe;
    } finally {
      client.release();
    }

    const cols = columns.length ? columns : rows.length ? Object.keys(rows[0]) : [];

    return res.json({
      question,
      description,
      sql,
      row_count: rows.length,
      columns: cols,
      data: rows,
      chart: buildChart(cols, rows),
      insight: buildInsight(question.toLowerCase(), rows, cols),
      grounded: true,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message?.slice(0, 200), grounded: false });
  }
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  req.query.q = (req.body as any)?.question ?? '';
  return GET(req, res);
};
