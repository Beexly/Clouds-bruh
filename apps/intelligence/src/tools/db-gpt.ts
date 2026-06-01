import { Pool } from 'pg';
import Anthropic from '@anthropic-ai/sdk';
import type { Tool } from './index';

let _pool: Pool | null = null;
function pool(): Pool {
  if (_pool) return _pool;
  _pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://alterxiv:alterxiv@localhost:5432/alterxiv' });
  return _pool;
}

const SCHEMA_CONTEXT = `
Lumera commerce DB (READ-ONLY):
- product(id, title, handle, status, metadata jsonb [chapter, sku, source, brand], deleted_at)
- product_variant(id, product_id, title)
- price(id, price_set_id, amount int [cents], currency_code)
- product_variant_price_set(variant_id, price_set_id)
- "order"(id, status, currency_code, metadata jsonb [visitor_id], created_at)
- cart_line_item(id, cart_id, variant_id, product_id, title, unit_price int, quantity int)
- signal_event(id, visitor_id, session_id, type, entity_id, value, ts)
  types: product_view, add_to_cart, purchase, drop_view, checkout_step
- visitor_profile(visitor_id, segment, affinity jsonb, last_seen)
  segments: high_intent, armor_devotee, patron, new_seeker
- drop(id, name, chapter, status, units_total int, units_remaining int)
- agent_run(id, agent, trigger, status, started_at)
- audit(id, type, severity, finding, created_at)
`;

const PREDEFINED_QUERIES: Array<{
  keywords: string[];
  description: string;
  sql: string;
  columns: string[];
}> = [
  {
    keywords: ['chapter', 'margin', 'revenue', 'best', 'top', 'earning', 'price'],
    description: 'Product pricing by chapter (margin proxy)',
    sql: `SELECT p.metadata->>'chapter' AS chapter,
           COUNT(DISTINCT p.id) AS products,
           ROUND(AVG(pr.amount) / 100.0, 2) AS avg_price_usd,
           ROUND(MIN(pr.amount) / 100.0, 2) AS min_usd,
           ROUND(MAX(pr.amount) / 100.0, 2) AS max_usd
         FROM product p
         JOIN product_variant pv ON pv.product_id = p.id AND pv.deleted_at IS NULL
         JOIN product_variant_price_set pvps ON pvps.variant_id = pv.id
         JOIN price_set ps ON ps.id = pvps.price_set_id
         JOIN price pr ON pr.price_set_id = ps.id AND pr.currency_code = 'usd'
         WHERE p.deleted_at IS NULL
         GROUP BY p.metadata->>'chapter'
         ORDER BY avg_price_usd DESC`,
    columns: ['chapter', 'products', 'avg_price_usd', 'min_usd', 'max_usd'],
  },
  {
    keywords: ['conversion', 'rate', 'funnel', 'checkout'],
    description: 'Conversion funnel (last 7 days)',
    sql: `SELECT type,
           COUNT(DISTINCT visitor_id) AS unique_visitors,
           COUNT(*) AS total_events
         FROM signal_event
         WHERE ts > now() - interval '7 days'
           AND type IN ('product_view','add_to_cart','checkout_step','purchase')
         GROUP BY type
         ORDER BY CASE type WHEN 'product_view' THEN 1 WHEN 'add_to_cart' THEN 2
           WHEN 'checkout_step' THEN 3 WHEN 'purchase' THEN 4 END`,
    columns: ['type', 'unique_visitors', 'total_events'],
  },
  {
    keywords: ['visitor', 'segment', 'distribution', 'audience'],
    description: 'Visitor segment distribution',
    sql: `SELECT segment, COUNT(*) AS visitor_count,
           ROUND(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (), 0), 1) AS pct
         FROM visitor_profile GROUP BY segment ORDER BY visitor_count DESC`,
    columns: ['segment', 'visitor_count', 'pct'],
  },
  {
    keywords: ['drop', 'inventory', 'units', 'sell-through', 'sellthrough', 'stock'],
    description: 'Drop sell-through rates',
    sql: `SELECT name, chapter, status, units_total, units_remaining,
           CASE WHEN units_total > 0 THEN
             ROUND((1.0 - units_remaining::float / units_total::float) * 100, 1)
           ELSE 0 END AS pct_sold
         FROM drop ORDER BY pct_sold DESC`,
    columns: ['name', 'chapter', 'status', 'units_total', 'units_remaining', 'pct_sold'],
  },
  {
    keywords: ['product', 'popular', 'trending', 'viewed'],
    description: 'Top products by signal activity (last 7 days)',
    sql: `SELECT p.title, p.metadata->>'chapter' AS chapter,
           COUNT(se.id) AS signals, COUNT(DISTINCT se.visitor_id) AS visitors,
           SUM(CASE WHEN se.type = 'add_to_cart' THEN 1 ELSE 0 END) AS cart_adds
         FROM signal_event se
         JOIN product p ON p.id = se.entity_id AND p.deleted_at IS NULL
         WHERE se.ts > now() - interval '7 days'
         GROUP BY p.id, p.title, p.metadata ORDER BY signals DESC LIMIT 10`,
    columns: ['title', 'chapter', 'signals', 'visitors', 'cart_adds'],
  },
  {
    keywords: ['agent', 'run', 'congregation'],
    description: 'Agent run history (last 24h)',
    sql: `SELECT agent, status, COUNT(*) AS runs, MAX(started_at)::date AS last_run
         FROM agent_run WHERE started_at > now() - interval '24 hours'
         GROUP BY agent, status ORDER BY last_run DESC`,
    columns: ['agent', 'status', 'runs', 'last_run'],
  },
  {
    keywords: ['audit', 'finding', 'introspection', 'health', 'issue'],
    description: 'Recent audit findings (last 7 days)',
    sql: `SELECT type, severity, COUNT(*) AS count, MAX(created_at)::date AS latest
         FROM audit WHERE created_at > now() - interval '7 days'
         GROUP BY type, severity
         ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'error' THEN 2
           WHEN 'warn' THEN 3 WHEN 'info' THEN 4 END, count DESC`,
    columns: ['type', 'severity', 'count', 'latest'],
  },
  {
    keywords: ['catalog', 'count', 'total', 'overview'],
    description: 'Catalog overview by chapter',
    sql: `SELECT p.metadata->>'chapter' AS chapter, COUNT(*) AS products,
           COUNT(CASE WHEN thumbnail IS NOT NULL AND thumbnail != '' THEN 1 END) AS with_image
         FROM product p WHERE p.deleted_at IS NULL
         GROUP BY p.metadata->>'chapter' ORDER BY products DESC`,
    columns: ['chapter', 'products', 'with_image'],
  },
];

function matchQuery(question: string) {
  const q = question.toLowerCase();
  let best = PREDEFINED_QUERIES[0];
  let bestScore = 0;
  for (const query of PREDEFINED_QUERIES) {
    const score = query.keywords.filter((kw) => q.includes(kw)).length;
    if (score > bestScore) { bestScore = score; best = query; }
  }
  return best;
}

async function executeReadOnly(sql: string): Promise<{ rows: any[]; rowCount: number }> {
  const client = await pool().connect();
  try {
    await client.query('BEGIN READ ONLY');
    const result = await client.query(sql);
    await client.query('COMMIT');
    return { rows: result.rows, rowCount: result.rowCount ?? 0 };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

function buildChart(rows: any[], columns: string[]) {
  if (!rows.length) return { type: 'empty' };
  const numCols = columns.filter((c) => typeof rows[0]?.[c] === 'number');
  const labelCol = columns.find((c) => typeof rows[0]?.[c] === 'string') ?? columns[0];
  if (!numCols.length) return { type: 'table', data: rows };
  return { type: numCols.length === 1 ? 'bar' : 'multi-bar', x: labelCol, y: numCols, data: rows.slice(0, 10) };
}

function insight(question: string, rows: any[], columns: string[]): string {
  if (!rows.length) return 'No data.';
  const q = question.toLowerCase();
  const top = rows[0];
  if (q.includes('margin') || q.includes('chapter') || q.includes('earning')) {
    const label = columns.find((c) => typeof top[c] === 'string') ?? 'chapter';
    const val = columns.find((c) => typeof top[c] === 'number') ?? '';
    return val ? `Best: ${top[label]} (${val}: ${top[val]})` : `Top chapter: ${top[label]}`;
  }
  if (q.includes('conversion') || q.includes('funnel')) {
    const views = rows.find((r: any) => r.type === 'product_view')?.unique_visitors ?? 0;
    const buys = rows.find((r: any) => r.type === 'purchase')?.unique_visitors ?? 0;
    return views ? `Conversion: ${((buys / views) * 100).toFixed(1)}% (${buys}/${views})` : 'No purchases yet.';
  }
  if (q.includes('segment') || q.includes('audience')) return `Largest segment: ${top?.segment} (${top?.pct}%)`;
  return `${rows.length} row${rows.length !== 1 ? 's' : ''}. Top: ${JSON.stringify(top).slice(0, 100)}`;
}

async function claudeSql(question: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key.includes('...')) return null;
  try {
    const client = new Anthropic({ apiKey: key });
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 512,
      system: `PostgreSQL expert. One SELECT only.\n${SCHEMA_CONTEXT}\nReturn ONLY SQL starting with SELECT.`,
      messages: [{ role: 'user', content: question }],
    });
    const sql = (msg.content[0] as any).text?.trim();
    return sql?.toLowerCase().startsWith('select') ? sql : null;
  } catch { return null; }
}

export const dbGpt: Tool = {
  name: 'nl_analytics',
  description: 'Business question in natural language → SQL → data + chart. READ-ONLY. Shows the SQL behind every number.',
  inputSchema: {
    type: 'object',
    properties: {
      question: { type: 'string' },
      format: { type: 'string', enum: ['table', 'chart', 'summary'], default: 'summary' },
    },
    required: ['question'],
  },
  run: async ({ question, format = 'summary' }) => {
    try {
      const aiSql = await claudeSql(question);
      const { sql, description, columns: cols } = aiSql
        ? { sql: aiSql, description: question, columns: [] as string[] }
        : matchQuery(question);

      const { rows, rowCount } = await executeReadOnly(sql);
      const columns = cols.length ? cols : rows.length ? Object.keys(rows[0]) : [];

      return {
        question, description, sql, row_count: rowCount, columns,
        data: rows.slice(0, 50),
        chart: buildChart(rows, columns),
        insight: insight(question, rows, columns),
        grounded: true,
      };
    } catch (e: any) {
      return { question, error: e.message?.slice(0, 200), grounded: false };
    }
  },
};
