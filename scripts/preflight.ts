/**
 * Lumera — LAUNCH PREFLIGHT
 *
 * A live go/no-go check against the actual deployment: env + database state.
 * Prints a checklist and a launch-readiness percentage.
 *
 *   pnpm preflight
 *   # or directly (point at the deployed DB):
 *   DATABASE_URL=postgres://… npx tsx scripts/preflight.ts
 *
 * Read-only. Safe to run anytime, against any environment.
 */
import { Pool } from 'pg';

type State = 'pass' | 'warn' | 'fail';
const mark = (s: State) => (s === 'pass' ? '✅' : s === 'warn' ? '⚠️ ' : '❌');

async function main() {
  const url = process.env.DATABASE_URL;
  const checks: { group: 'blocker' | 'recommended'; label: string; state: State }[] = [];
  const env = (k: string): State => (process.env[k] && process.env[k] !== '' ? 'pass' : 'fail');

  // ── Database state ─────────────────────────────────────────────────────────
  let pool: Pool | undefined;
  const count = async (sql: string): Promise<number> => {
    try {
      const { rows } = await pool!.query<{ n: string }>(sql);
      return Number(rows[0]?.n ?? 0);
    } catch {
      return -1; // table/extension missing or unreachable
    }
  };

  if (!url) {
    checks.push({ group: 'blocker', label: 'DATABASE_URL set', state: 'fail' });
  } else {
    pool = new Pool({ connectionString: url });
    let reachable = true;
    try {
      await pool.query('SELECT 1');
    } catch {
      reachable = false;
    }
    checks.push({ group: 'blocker', label: 'Database reachable', state: reachable ? 'pass' : 'fail' });

    if (reachable) {
      const products = await count(`SELECT count(*)::int n FROM product WHERE deleted_at IS NULL`);
      const keys = await count(`SELECT count(*)::int n FROM api_key WHERE deleted_at IS NULL AND type='publishable'`);
      const regions = await count(`SELECT count(*)::int n FROM region WHERE deleted_at IS NULL`);
      const channels = await count(`SELECT count(*)::int n FROM sales_channel WHERE deleted_at IS NULL`);
      const shipping = await count(`SELECT count(*)::int n FROM shipping_option WHERE deleted_at IS NULL`);
      const vector = await count(`SELECT count(*)::int n FROM pg_extension WHERE extname='vector'`);
      const embeddings = await count(`SELECT count(*)::int n FROM product_embedding`);

      checks.push({ group: 'blocker', label: `Catalog seeded (${Math.max(products, 0)} products)`, state: products > 0 ? 'pass' : 'fail' });
      checks.push({ group: 'blocker', label: `Publishable API key (${Math.max(keys, 0)})`, state: keys > 0 ? 'pass' : 'fail' });
      checks.push({ group: 'blocker', label: `Region configured (${Math.max(regions, 0)})`, state: regions > 0 ? 'pass' : 'fail' });
      checks.push({ group: 'blocker', label: `Sales channel (${Math.max(channels, 0)})`, state: channels > 0 ? 'pass' : 'fail' });
      checks.push({ group: 'blocker', label: `Shipping option (${Math.max(shipping, 0)})`, state: shipping > 0 ? 'pass' : 'fail' });
      checks.push({ group: 'recommended', label: 'pgvector extension', state: vector > 0 ? 'pass' : 'warn' });
      checks.push({ group: 'recommended', label: `Product embeddings (${Math.max(embeddings, 0)}) — recs/search`, state: embeddings > 0 ? 'pass' : 'warn' });
    }
  }

  // ── Environment ────────────────────────────────────────────────────────────
  checks.push({ group: 'blocker', label: 'JWT_SECRET set', state: env('JWT_SECRET') });
  checks.push({ group: 'blocker', label: 'COOKIE_SECRET set', state: env('COOKIE_SECRET') });
  checks.push({ group: 'blocker', label: 'STORE_CORS set', state: env('STORE_CORS') });
  checks.push({ group: 'blocker', label: 'ADMIN_CORS set', state: env('ADMIN_CORS') });
  checks.push({ group: 'recommended', label: 'REDIS_URL set — prod event bus', state: env('REDIS_URL') === 'pass' ? 'pass' : 'warn' });
  checks.push({ group: 'recommended', label: 'ANTHROPIC_API_KEY — agents live', state: env('ANTHROPIC_API_KEY') === 'pass' ? 'pass' : 'warn' });
  checks.push({ group: 'recommended', label: 'COCKPIT_KEY — required in prod to view cockpit/analyst', state: env('COCKPIT_KEY') === 'pass' ? 'pass' : 'warn' });
  const s3 = process.env.S3_FILE_URL && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY;
  checks.push({ group: 'recommended', label: 'S3/object storage — durable media', state: s3 ? 'pass' : 'warn' });
  const vendorLive = process.env.VENDOR_LIVE_MODE === 'true';
  const vendorGroup: 'blocker' | 'recommended' = vendorLive ? 'blocker' : 'recommended';
  const vendorState = (keys: string[]): State => keys.every((k) => process.env[k]) ? 'pass' : vendorLive ? 'fail' : 'warn';
  checks.push({ group: vendorGroup, label: 'Printify credentials — POD/house-label lane', state: vendorState(['PRINTIFY_TOKEN', 'PRINTIFY_SHOP_ID']) });
  checks.push({ group: vendorGroup, label: 'Printful credentials — premium POD lane', state: vendorState(['PRINTFUL_TOKEN', 'PRINTFUL_STORE_ID']) });
  checks.push({ group: vendorGroup, label: 'CJ credentials — broad dropship lane', state: vendorState(['CJ_API_KEY', 'CJ_ACCESS_TOKEN']) });
  const stripeLive = Boolean(process.env.STRIPE_API_KEY && !process.env.STRIPE_API_KEY.startsWith('sk_test'));
  checks.push({ group: vendorLive ? 'blocker' : 'recommended', label: 'Stripe live key when VENDOR_LIVE_MODE=true', state: vendorLive ? (stripeLive ? 'pass' : 'fail') : 'warn' });
  checks.push({ group: vendorLive ? 'blocker' : 'recommended', label: 'Medusa admin API token — publish approved products', state: env('MEDUSA_ADMIN_API_TOKEN') === 'pass' || env('MEDUSA_ADMIN_TOKEN') === 'pass' ? 'pass' : vendorLive ? 'fail' : 'warn' });

  await pool?.end().catch(() => {});

  // ── Report ─────────────────────────────────────────────────────────────────
  const blockers = checks.filter((c) => c.group === 'blocker');
  const recommended = checks.filter((c) => c.group === 'recommended');
  const passed = (cs: typeof checks) => cs.filter((c) => c.state === 'pass').length;
  const bPass = passed(blockers);
  const rPass = passed(recommended);
  const pct = Math.round(70 * (bPass / blockers.length) + 30 * (rPass / recommended.length));
  const allBlockers = bPass === blockers.length;

  const line = '─'.repeat(56);
  console.log(`\n  LUMERA — LAUNCH PREFLIGHT`);
  console.log(`  ${url ? url.replace(/\/\/[^@]*@/, '//***@') : '(no DATABASE_URL)'}`);
  console.log(line);
  console.log(`  BLOCKERS (must pass to take an order)`);
  for (const c of blockers) console.log(`    ${mark(c.state)} ${c.label}`);
  console.log(`\n  RECOMMENDED (enhances; non-blocking)`);
  for (const c of recommended) console.log(`    ${mark(c.state)} ${c.label}`);
  console.log(line);
  console.log(`  LAUNCH READINESS: ${pct}%   (blockers ${bPass}/${blockers.length} · recommended ${rPass}/${recommended.length})`);
  if (allBlockers) {
    console.log(`  VERDICT: ✅ READY — can take a (test-mode) order. Enable the ⚠️ items to go full-intelligence + durable.`);
  } else {
    const missing = blockers.filter((c) => c.state !== 'pass').map((c) => c.label).join(', ');
    console.log(`  VERDICT: ❌ NOT READY — resolve blockers: ${missing}`);
  }
  console.log(`  (Also copy the publishable key into the storefront as NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY.)\n`);

  process.exit(allBlockers ? 0 : 1);
}

main().catch((e) => {
  console.error('[preflight] error:', e);
  process.exit(2);
});
