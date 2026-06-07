/**
 * Lumera launch preflight.
 *
 * Default mode is code-readiness: deployment env gaps are reported but do not
 * block local push readiness. Use `--live` for a live go/no-go check.
 */
import { Pool } from 'pg';

type State = 'pass' | 'warn' | 'fail';
type Group = 'blocker' | 'recommended';
type Check = { group: Group; label: string; state: State };

const mark = (state: State) => (state === 'pass' ? 'PASS' : state === 'warn' ? 'WARN' : 'FAIL');

async function main() {
  const args = new Set(process.argv.slice(2));
  const liveProof =
    args.has('--live') ||
    args.has('--mode=live') ||
    process.env.LUMERA_LIVE_PROOF === 'true' ||
    process.env.VENDOR_LIVE_MODE === 'true';
  const deploymentGroup: Group = liveProof ? 'blocker' : 'recommended';
  const deploymentMissing: State = liveProof ? 'fail' : 'warn';
  const url = process.env.DATABASE_URL;
  const checks: Check[] = [];
  const env = (key: string): State => (process.env[key] && process.env[key] !== '' ? 'pass' : 'fail');
  const envCheck = (key: string): State => (env(key) === 'pass' ? 'pass' : deploymentMissing);

  let pool: Pool | undefined;
  const count = async (sql: string): Promise<number> => {
    try {
      const { rows } = await pool!.query<{ n: string }>(sql);
      return Number(rows[0]?.n ?? 0);
    } catch {
      return -1;
    }
  };

  if (!url) {
    checks.push({ group: deploymentGroup, label: 'DATABASE_URL set', state: deploymentMissing });
  } else {
    pool = new Pool({ connectionString: url });
    let reachable = true;
    try {
      await pool.query('SELECT 1');
    } catch {
      reachable = false;
    }
    checks.push({ group: deploymentGroup, label: 'Database reachable', state: reachable ? 'pass' : deploymentMissing });

    if (reachable) {
      const products = await count(`SELECT count(*)::int n FROM product WHERE deleted_at IS NULL`);
      const keys = await count(`SELECT count(*)::int n FROM api_key WHERE deleted_at IS NULL AND type='publishable'`);
      const regions = await count(`SELECT count(*)::int n FROM region WHERE deleted_at IS NULL`);
      const channels = await count(`SELECT count(*)::int n FROM sales_channel WHERE deleted_at IS NULL`);
      const shipping = await count(`SELECT count(*)::int n FROM shipping_option WHERE deleted_at IS NULL`);
      const vector = await count(`SELECT count(*)::int n FROM pg_extension WHERE extname='vector'`);
      const embeddings = await count(`SELECT count(*)::int n FROM product_embedding`);

      checks.push({ group: deploymentGroup, label: `Catalog seeded (${Math.max(products, 0)} products)`, state: products > 0 ? 'pass' : deploymentMissing });
      checks.push({ group: deploymentGroup, label: `Publishable API key (${Math.max(keys, 0)})`, state: keys > 0 ? 'pass' : deploymentMissing });
      checks.push({ group: deploymentGroup, label: `Region configured (${Math.max(regions, 0)})`, state: regions > 0 ? 'pass' : deploymentMissing });
      checks.push({ group: deploymentGroup, label: `Sales channel (${Math.max(channels, 0)})`, state: channels > 0 ? 'pass' : deploymentMissing });
      checks.push({ group: deploymentGroup, label: `Shipping option (${Math.max(shipping, 0)})`, state: shipping > 0 ? 'pass' : deploymentMissing });
      checks.push({ group: 'recommended', label: 'pgvector extension', state: vector > 0 ? 'pass' : 'warn' });
      checks.push({ group: 'recommended', label: `Product embeddings (${Math.max(embeddings, 0)}) - recs/search`, state: embeddings > 0 ? 'pass' : 'warn' });
    }
  }

  checks.push({ group: deploymentGroup, label: 'JWT_SECRET set', state: envCheck('JWT_SECRET') });
  checks.push({ group: deploymentGroup, label: 'COOKIE_SECRET set', state: envCheck('COOKIE_SECRET') });
  checks.push({ group: deploymentGroup, label: 'STORE_CORS set', state: envCheck('STORE_CORS') });
  checks.push({ group: deploymentGroup, label: 'ADMIN_CORS set', state: envCheck('ADMIN_CORS') });
  checks.push({ group: 'recommended', label: 'REDIS_URL set - prod event bus', state: env('REDIS_URL') === 'pass' ? 'pass' : 'warn' });
  checks.push({ group: 'recommended', label: 'ANTHROPIC_API_KEY - agents live', state: env('ANTHROPIC_API_KEY') === 'pass' ? 'pass' : 'warn' });
  checks.push({ group: 'recommended', label: 'COCKPIT_KEY - required in prod to view cockpit/analyst', state: env('COCKPIT_KEY') === 'pass' ? 'pass' : 'warn' });

  const s3 = process.env.S3_FILE_URL && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY;
  checks.push({ group: 'recommended', label: 'S3/object storage - durable media', state: s3 ? 'pass' : 'warn' });

  const vendorLive = liveProof;
  const vendorGroup: Group = vendorLive ? 'blocker' : 'recommended';
  const vendorState = (keys: string[]): State => {
    if (keys.every((key) => process.env[key])) return 'pass';
    return vendorLive ? 'fail' : 'warn';
  };
  checks.push({ group: vendorGroup, label: 'Printify credentials - POD/house-label lane', state: vendorState(['PRINTIFY_TOKEN', 'PRINTIFY_SHOP_ID']) });
  checks.push({ group: vendorGroup, label: 'Printful credentials - premium POD lane', state: vendorState(['PRINTFUL_TOKEN', 'PRINTFUL_STORE_ID']) });
  checks.push({ group: vendorGroup, label: 'CJ credentials - broad dropship lane', state: vendorState(['CJ_API_KEY', 'CJ_ACCESS_TOKEN']) });

  const stripeLive = Boolean(process.env.STRIPE_API_KEY && !process.env.STRIPE_API_KEY.startsWith('sk_test'));
  checks.push({ group: vendorGroup, label: 'Stripe live key', state: vendorLive ? (stripeLive ? 'pass' : 'fail') : 'warn' });
  checks.push({
    group: vendorGroup,
    label: 'Medusa admin API token - publish approved products',
    state: env('MEDUSA_ADMIN_API_TOKEN') === 'pass' || env('MEDUSA_ADMIN_TOKEN') === 'pass' ? 'pass' : vendorLive ? 'fail' : 'warn',
  });

  await pool?.end().catch(() => {});

  const blockers = checks.filter((check) => check.group === 'blocker');
  const recommended = checks.filter((check) => check.group === 'recommended');
  const passed = (items: Check[]) => items.filter((check) => check.state === 'pass').length;
  const bPass = passed(blockers);
  const rPass = passed(recommended);
  const blockerRatio = blockers.length ? bPass / blockers.length : 1;
  const recommendedRatio = recommended.length ? rPass / recommended.length : 1;
  const pct = Math.round(70 * blockerRatio + 30 * recommendedRatio);
  const allBlockers = blockers.length ? bPass === blockers.length : true;
  const line = '-'.repeat(56);

  console.log('\n  LUMERA LAUNCH PREFLIGHT');
  console.log(`  proof_mode=${liveProof ? 'live' : 'code'}`);
  console.log(`  ${url ? url.replace(/\/\/[^@]*@/, '//***@') : '(no DATABASE_URL)'}`);
  console.log(line);
  console.log('  BLOCKERS');
  if (!blockers.length) console.log('    PASS none in code-readiness mode');
  for (const check of blockers) console.log(`    ${mark(check.state)} ${check.label}`);
  console.log('\n  RECOMMENDED / LIVE READINESS DEBT');
  for (const check of recommended) console.log(`    ${mark(check.state)} ${check.label}`);
  console.log(line);
  console.log(`  READINESS: ${pct}% (blockers ${bPass}/${blockers.length}, recommended ${rPass}/${recommended.length})`);
  if (allBlockers) {
    console.log(liveProof ? '  VERDICT: READY for live deployment checks in this shell.' : '  VERDICT: READY for local code push.');
  } else {
    const missing = blockers.filter((check) => check.state !== 'pass').map((check) => check.label).join(', ');
    console.log(`  VERDICT: NOT READY for live launch - resolve blockers: ${missing}`);
  }
  console.log('');

  process.exit(allBlockers ? 0 : 1);
}

main().catch((error) => {
  console.error('[preflight] error:', error);
  process.exit(2);
});
