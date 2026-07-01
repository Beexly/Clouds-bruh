import type { Tool } from './index';
import { Pool } from 'pg';
import { quoteSupplierSku } from '../vendors';

/**
 * Connector adapters surfaced by the INTROSPECTION tool-registry audit (F01 lesson: every
 * declared connector must resolve in the control plane, never silently fail mid-loop).
 * Read connectors query the live DB; write/act connectors STAGE for founder approval and
 * never publish, send, or move money on their own.
 */
let _pool: Pool | null = null;
function pool(): Pool {
  if (_pool) return _pool;
  _pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://lumera:lumera@localhost:5432/lumera' });
  return _pool;
}

// ── Read connectors (live DB) ──────────────────────────────────────────────

export const signalQuery: Tool = {
  name: 'signal_query',
  description: 'Read recent SIGNAL aggregates (counts by type over a window). Read-only.',
  inputSchema: { type: 'object', properties: { days: { type: 'number', default: 7 } } },
  run: async ({ days = 7 }) => {
    const { rows } = await pool()
      .query(
        `SELECT type, COUNT(*)::int AS count FROM signal_event
          WHERE ts > now() - ($1 || ' days')::interval GROUP BY type ORDER BY count DESC`,
        [String(days)]
      )
      .catch(() => ({ rows: [] }));
    return { window_days: days, by_type: rows };
  },
};

export const recommendationRead: Tool = {
  name: 'recommendation_read',
  description: 'Read recent served recommendations + their click/convert outcomes. Read-only.',
  inputSchema: { type: 'object', properties: { limit: { type: 'number', default: 20 } } },
  run: async ({ limit = 20 }) => {
    const { rows } = await pool()
      .query(
        `SELECT strategy, COUNT(*)::int AS served,
                SUM(CASE WHEN clicked THEN 1 ELSE 0 END)::int AS clicks,
                SUM(CASE WHEN converted THEN 1 ELSE 0 END)::int AS conversions
           FROM recommendation WHERE served_at > now() - interval '30 days'
          GROUP BY strategy ORDER BY served DESC LIMIT $1`,
        [limit]
      )
      .catch(() => ({ rows: [] }));
    return { strategies: rows };
  },
};

export const orderLookup: Tool = {
  name: 'order_lookup',
  description: 'Look up recent orders / purchase signals for support context. Read-only.',
  inputSchema: { type: 'object', properties: { visitor_id: { type: 'string' } } },
  run: async ({ visitor_id }) => {
    const { rows } = await pool()
      .query(
        `SELECT entity_id AS order_ref, value AS total, ts FROM signal_event
          WHERE type='purchase' ${visitor_id ? 'AND visitor_id=$1' : ''}
          ORDER BY ts DESC LIMIT 10`,
        visitor_id ? [visitor_id] : []
      )
      .catch(() => ({ rows: [] }));
    return { orders: rows };
  },
};

// ── Write / act connectors (STAGED — never auto-execute) ───────────────────

export const replyDraft: Tool = {
  name: 'reply_draft',
  description: 'Draft a customer-support reply in the house voice. STAGED — never sent.',
  inputSchema: {
    type: 'object',
    properties: { question: { type: 'string' }, context: { type: 'string' } },
    required: ['question'],
  },
  run: async ({ question, context }) => ({
    draft: `Here is what I can share: ${context ?? 'I will look into this for you.'}`,
    re: question,
    status: 'STAGED_FOR_APPROVAL',
    note: 'Support reply drafted; founder/agent sends, never the tool.',
  }),
};

export const calendarWrite: Tool = {
  name: 'calendar_write',
  description: 'Schedule a content/campaign slot on the marketing calendar. STAGED draft only.',
  inputSchema: {
    type: 'object',
    properties: { title: { type: 'string' }, when: { type: 'string' }, channel: { type: 'string' } },
    required: ['title', 'when'],
  },
  run: async (i) => ({ ...i, id: `cal-${Date.now()}`, status: 'STAGED_FOR_APPROVAL' }),
};

export const invoiceGenerate: Tool = {
  name: 'invoice_generate',
  description: 'Generate a branded invoice/quote draft (B2B/wholesale). STAGED — not sent.',
  inputSchema: {
    type: 'object',
    properties: { to: { type: 'string' }, line_items: { type: 'array' }, currency: { type: 'string', default: 'usd' } },
    required: ['to'],
  },
  run: async ({ to, line_items = [], currency = 'usd' }) => {
    const total = (line_items as any[]).reduce((s, li) => s + (li.amount ?? 0) * (li.qty ?? 1), 0);
    return { invoice_no: `ALTAR-INV-${Date.now()}`, to, currency, total, line_items, status: 'DRAFT' };
  },
};

export const pdfRender: Tool = {
  name: 'pdf_render',
  description: 'Render a document (invoice/report) to a staged PDF artifact.',
  inputSchema: { type: 'object', properties: { kind: { type: 'string' }, ref: { type: 'string' } }, required: ['kind'] },
  run: async ({ kind, ref }) => ({ kind, ref, path: `staged/pdf/${kind}-${Date.now()}.pdf`, status: 'STAGED' }),
};

export const supplierApi: Tool = {
  name: 'supplier_api',
  description: 'Query configured vendor adapters for price/stock/lead-time. Read-only; fixture-backed until vendor credentials are present.',
  inputSchema: {
    type: 'object',
    properties: {
      supplier_sku: { type: 'string' },
      vendor: { type: 'string', enum: ['printify', 'printful', 'cj', 'manual', 'radar'] },
      action: { type: 'string', default: 'quote' },
    },
  },
  run: async ({ supplier_sku, vendor, action = 'quote' }) => ({
    action,
    ...(await quoteSupplierSku(supplier_sku, vendor)),
  }),
};

export const recommendationAdmin: Tool = {
  name: 'recommendation_admin',
  description: 'Propose ORACLE tuning (weights/strategy mix). STAGED — applying needs approval.',
  inputSchema: { type: 'object', properties: { proposal: { type: 'string' } }, required: ['proposal'] },
  run: async ({ proposal }) => ({ proposal, status: 'STAGED_FOR_APPROVAL' }),
};

export const experimentAdmin: Tool = {
  name: 'experiment_admin',
  description: 'Draft an A/B experiment (hypothesis, variants, metric). STAGED — not launched.',
  inputSchema: {
    type: 'object',
    properties: { hypothesis: { type: 'string' }, variants: { type: 'array' }, metric: { type: 'string' } },
    required: ['hypothesis'],
  },
  run: async (i) => ({ id: `exp-${Date.now()}`, ...i, status: 'draft' }),
};
