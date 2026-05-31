import { Pool } from 'pg';
import { Ledger } from './memory/ledger';
import type { Audit } from '@alterxiv/shared';

let _pool: Pool | null = null;
function pool(): Pool {
  if (_pool) return _pool;
  _pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://alterxiv:alterxiv@localhost:5432/alterxiv' });
  return _pool;
}

/**
 * INTROSPECTION — continuous self-audit.
 * Each check produces Audits that are either auto-corrected (safe) or flagged with a
 * falsifiable "how would we know this failed?" check for Garrett.
 */
const CHECKS: Array<{ type: Audit['type']; run: () => Promise<Audit[]> }> = [
  // ── Catalog: missing thumbnails ───────────────────────────────────────────
  {
    type: 'catalog',
    run: async () => {
      const { rows } = await pool().query(`
        SELECT id, title FROM product
        WHERE deleted_at IS NULL
          AND (thumbnail IS NULL OR thumbnail = '')
          AND created_at > now() - interval '24 hours'
        LIMIT 10
      `).catch(() => ({ rows: [] }));
      return rows.map(r => ({
        id: crypto.randomUUID(),
        type: 'catalog' as const,
        severity: 'warn' as const,
        finding: `Product "${r.title}" (${r.id}) missing thumbnail image.`,
        recommendation: 'Trigger Artisan to generate hero imagery.',
        falsifiable_check: 'Check: product.thumbnail IS NOT NULL.',
        auto_corrected: false,
        entity_ref: r.id,
        created_at: new Date().toISOString(),
      }));
    },
  },

  // ── Catalog: missing descriptions ─────────────────────────────────────────
  {
    type: 'catalog',
    run: async () => {
      const { rows } = await pool().query(`
        SELECT id, title, description FROM product
        WHERE deleted_at IS NULL
          AND (description IS NULL OR length(description) < 50)
        LIMIT 8
      `).catch(() => ({ rows: [] }));
      return rows.map(r => ({
        id: crypto.randomUUID(),
        type: 'catalog' as const,
        severity: 'info' as const,
        finding: `Product "${r.title}" has no meaningful description (${(r.description || '').length} chars).`,
        recommendation: 'Trigger Scribe to write brand-voice copy for this product.',
        falsifiable_check: 'Check: product.description length > 80.',
        auto_corrected: false,
        entity_ref: r.id,
        created_at: new Date().toISOString(),
      }));
    },
  },

  // ── Integrity: products with no variants ──────────────────────────────────
  {
    type: 'integrity',
    run: async () => {
      const { rows } = await pool().query(`
        SELECT p.id, p.title FROM product p
        LEFT JOIN product_variant pv ON pv.product_id = p.id AND pv.deleted_at IS NULL
        WHERE p.deleted_at IS NULL AND pv.id IS NULL
        LIMIT 5
      `).catch(() => ({ rows: [] }));
      return rows.map(r => ({
        id: crypto.randomUUID(),
        type: 'integrity' as const,
        severity: 'warn' as const,
        finding: `Product "${r.title}" has no variants — cannot be added to cart.`,
        recommendation: 'Add at least one Standard variant via Medusa Admin.',
        falsifiable_check: 'Check: GET /store/products?id=X returns non-empty variants array.',
        auto_corrected: false,
        entity_ref: r.id,
        created_at: new Date().toISOString(),
      }));
    },
  },

  // ── Integrity: variants with no prices ────────────────────────────────────
  {
    type: 'integrity',
    run: async () => {
      const { rows } = await pool().query(`
        SELECT pv.id, p.title FROM product_variant pv
        JOIN product p ON p.id = pv.product_id AND p.deleted_at IS NULL
        LEFT JOIN product_variant_price_set pvps ON pvps.variant_id = pv.id
        WHERE pv.deleted_at IS NULL AND pvps.price_set_id IS NULL
        LIMIT 5
      `).catch(() => ({ rows: [] }));
      return rows.map(r => ({
        id: crypto.randomUUID(),
        type: 'integrity' as const,
        severity: 'error' as const,
        finding: `Variant ${r.id} for "${r.title}" has no price set — cannot purchase.`,
        recommendation: 'Run setup-prices.ts to link variant to pricing module.',
        falsifiable_check: 'Check: product_variant_price_set row exists for variant_id.',
        auto_corrected: false,
        entity_ref: r.id,
        created_at: new Date().toISOString(),
      }));
    },
  },

  // ── Conversion: chapters with no recent engagement ─────────────────────────
  {
    type: 'conversion',
    run: async () => {
      const { rows } = await pool().query(`
        SELECT chapter FROM (VALUES ('stillness'),('armor'),('signal'),('altar'),('relentless')) AS chapters(chapter)
        WHERE chapter NOT IN (
          SELECT DISTINCT p.metadata->>'chapter' FROM signal_event se
          JOIN product p ON p.id = se.entity_id
          WHERE se.ts > now() - interval '7 days'
        )
        LIMIT 5
      `).catch(() => ({ rows: [] }));
      return rows.map(r => ({
        id: crypto.randomUUID(),
        type: 'conversion' as const,
        severity: 'info' as const,
        finding: `Chapter "${r.chapter}" has no visitor engagement in the past 7 days.`,
        recommendation: 'Consider promoting this chapter in the broadcast or creating a new drop.',
        falsifiable_check: 'Check: signal_event count for chapter > 0 in last 7 days.',
        auto_corrected: false,
        entity_ref: r.chapter,
        created_at: new Date().toISOString(),
      }));
    },
  },

  // ── Conversion: high-performing products not in any live drop ─────────────
  {
    type: 'conversion',
    run: async () => {
      const { rows } = await pool().query(`
        SELECT p.id, p.title, COUNT(se.id) as signal_count
        FROM product p
        JOIN signal_event se ON se.entity_id = p.id AND se.ts > now() - interval '30 days'
        WHERE p.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM drop d
            WHERE d.status = 'live'
              AND d.product_ids::jsonb ? p.id
          )
        GROUP BY p.id, p.title
        HAVING COUNT(se.id) > 5
        ORDER BY signal_count DESC
        LIMIT 5
      `).catch(() => ({ rows: [] }));
      return rows.map(r => ({
        id: crypto.randomUUID(),
        type: 'conversion' as const,
        severity: 'info' as const,
        finding: `Product "${r.title}" has ${r.signal_count} signals but isn't featured in a live drop.`,
        recommendation: 'Curator: consider adding this product to the next drop or THE BROADCAST hero.',
        falsifiable_check: 'Check: product appears in a live drop product_ids.',
        auto_corrected: false,
        entity_ref: r.id,
        created_at: new Date().toISOString(),
      }));
    },
  },

  // ── Margin: drops approaching sell-out ────────────────────────────────────
  {
    type: 'margin',
    run: async () => {
      const { rows } = await pool().query(`
        SELECT id, name, units_remaining, units_total
        FROM drop
        WHERE status = 'live'
          AND units_total > 0
          AND (units_remaining::float / units_total::float) < 0.15
        LIMIT 5
      `).catch(() => ({ rows: [] }));
      return rows.map(r => ({
        id: crypto.randomUUID(),
        type: 'margin' as const,
        severity: 'warn' as const,
        finding: `Drop "${r.name}" is ${Math.round((r.units_remaining / r.units_total) * 100)}% remaining (${r.units_remaining}/${r.units_total} units).`,
        recommendation: 'Herald: prepare scarcity messaging. Sourcer: notify supplier to confirm next shipment.',
        falsifiable_check: 'Check: drop.units_remaining > 0 (not sold out).',
        auto_corrected: false,
        entity_ref: r.id,
        created_at: new Date().toISOString(),
      }));
    },
  },

  // ── SEO: products with generic/keyword-stuffed titles ─────────────────────
  {
    type: 'seo',
    run: async () => {
      const { rows } = await pool().query(`
        SELECT id, title FROM product
        WHERE deleted_at IS NULL
          AND (
            length(title) > 150
            OR title ILIKE '%pack%'
            OR title ILIKE '%set of%'
            OR title ILIKE '%compatible with%'
          )
        LIMIT 5
      `).catch(() => ({ rows: [] }));
      return rows.map(r => ({
        id: crypto.randomUUID(),
        type: 'seo' as const,
        severity: 'info' as const,
        finding: `Product title "${r.title.slice(0, 80)}..." may not align with brand voice (possibly keyword-stuffed).`,
        recommendation: 'Scribe: rewrite title for editorial luxury voice. Keep < 80 chars, brand-forward.',
        falsifiable_check: 'Check: product title length < 100 and passes brand audit.',
        auto_corrected: false,
        entity_ref: r.id,
        created_at: new Date().toISOString(),
      }));
    },
  },

  // ── VOC: visitors with high_intent but no purchase in 7 days ─────────────
  {
    type: 'voc',
    run: async () => {
      const { rows } = await pool().query(`
        SELECT visitor_id, segment, affinity FROM visitor_profile
        WHERE segment = 'high_intent'
          AND last_seen > now() - interval '7 days'
          AND visitor_id NOT IN (
            SELECT DISTINCT metadata->>'visitor_id' FROM "order"
            WHERE created_at > now() - interval '7 days'
          )
        LIMIT 5
      `).catch(() => ({ rows: [] }));
      return rows.map(r => ({
        id: crypto.randomUUID(),
        type: 'voc' as const,
        severity: 'info' as const,
        finding: `Visitor ${r.visitor_id} is high_intent (active in 7 days) but hasn't purchased.`,
        recommendation: 'Herald: consider a targeted re-engagement message if opted-in. Oracle: boost for_you rail.',
        falsifiable_check: 'Check: visitor_id appears in order.metadata->visitor_id.',
        auto_corrected: false,
        entity_ref: r.visitor_id,
        created_at: new Date().toISOString(),
      }));
    },
  },

  // ── Integrity: tool/connector registry health (F01 lesson — validate before activation) ──
  {
    type: 'integrity',
    run: async () => {
      // Validate that every agent's declared tools resolve in the registry. A missing/misnamed
      // connector must be caught in the control plane, never silently fail mid-loop.
      const { AGENTS } = require('./agents');
      const { TOOLS } = require('./tools');
      const findings: Audit[] = [];
      for (const def of Object.values(AGENTS) as any[]) {
        const missing = (def.tools ?? []).filter((t: string) => !TOOLS[t]);
        if (missing.length) {
          findings.push({
            id: crypto.randomUUID(),
            type: 'integrity',
            severity: 'error',
            finding: `Agent "${def.name}" references unregistered tool(s): ${missing.join(', ')}.`,
            recommendation: 'Register the connector in tools/index.ts or correct the agent definition before the next loop.',
            falsifiable_check: 'Check: every name in AgentDef.tools exists as a key in the TOOLS registry.',
            auto_corrected: false,
            entity_ref: def.name,
            created_at: new Date().toISOString(),
          });
        }
        // Escalation hygiene: a privileged agent with no escalation gate is a control-plane risk.
        if ((def.escalation ?? []).length === 0) {
          findings.push({
            id: crypto.randomUUID(),
            type: 'integrity',
            severity: 'warn',
            finding: `Agent "${def.name}" declares no escalation gate.`,
            recommendation: 'Define which actions require founder approval (escalation[]).',
            falsifiable_check: 'Check: AgentDef.escalation is a non-empty array.',
            auto_corrected: false,
            entity_ref: def.name,
            created_at: new Date().toISOString(),
          });
        }
      }
      return findings;
    },
  },
];

export async function runIntrospection() {
  console.log('[introspection] Running self-audit checks...');
  let total = 0;
  let errors = 0;
  for (const check of CHECKS) {
    try {
      const findings = await check.run();
      for (const f of findings) {
        await Ledger.audit(f);
        if (!f.auto_corrected) {
          console.log(`[introspection] ${f.severity.toUpperCase()}/${f.type}: ${f.finding.slice(0, 100)}`);
        }
      }
      total += findings.length;
    } catch (e: any) {
      errors++;
      console.warn(`[introspection] Check ${check.type} failed:`, e.message?.slice(0, 60));
    }
  }
  console.log(`[introspection] Self-audit complete: ${total} findings, ${errors} check errors.`);
  return { total, errors };
}
