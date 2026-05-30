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
  {
    type: 'integrity',
    run: async () => {
      // Check for products with no variants
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
  {
    type: 'conversion',
    run: async () => {
      // Check for chapters with no recent signal events (dead zones)
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
];

export async function runIntrospection() {
  console.log('[introspection] Running self-audit checks...');
  let total = 0;
  for (const check of CHECKS) {
    try {
      const findings = await check.run();
      for (const f of findings) {
        await Ledger.audit(f);
        if (!f.auto_corrected) {
          console.log(`[introspection] ${f.severity.toUpperCase()}: ${f.finding}`);
        }
      }
      total += findings.length;
    } catch (e: any) {
      console.warn(`[introspection] Check ${check.type} failed:`, e.message?.slice(0, 60));
    }
  }
  console.log(`[introspection] Self-audit complete: ${total} findings.`);
}
