/**
 * API regression: smoke-tests the key store API endpoints.
 * Run: npx tsx scripts/api-regression.ts
 */
const API = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';
const PK = process.env.PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';

const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  ...(PK ? { 'x-publishable-api-key': PK } : {}),
};

let passed = 0;
let failed = 0;

async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e: any) {
    console.error(`  ✗ ${name}: ${e.message}`);
    failed++;
  }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function get(path: string) {
  const res = await fetch(`${API}${path}`, { headers });
  assert(res.ok, `HTTP ${res.status} on GET ${path}`);
  return res.json();
}

async function run() {
  console.log(`\nALTER XIV — API Regression\n  Backend: ${API}\n  Key: ${PK ? PK.slice(0, 12) + '...' : '(none)'}\n`);

  await check('GET /health', async () => {
    const res = await fetch(`${API}/health`);
    assert(res.ok, `health check failed: ${res.status}`);
  });

  await check('GET /store/products — returns catalog', async () => {
    const data = await get('/store/products?limit=5');
    assert(Array.isArray(data.products), 'products not array');
    assert(data.products.length > 0, 'no products returned');
  });

  await check('GET /store/products — has chapter metadata', async () => {
    const data = await get('/store/products?limit=5&fields=id,title,metadata');
    assert(data.products[0]?.metadata?.chapter, 'missing chapter metadata');
  });

  await check('GET /store/regions — returns region with USD', async () => {
    const data = await get('/store/regions');
    assert(Array.isArray(data.regions), 'regions not array');
    const usd = data.regions.find((r: any) => r.currency_code === 'usd');
    assert(usd, 'no USD region found');
  });

  await check('POST /store/carts — creates cart', async () => {
    const data = await get('/store/regions');
    const regionId = data.regions?.[0]?.id;
    const res = await fetch(`${API}/store/carts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ region_id: regionId }),
    });
    assert(res.ok, `create cart failed: ${res.status}`);
    const cart = await res.json();
    assert(cart.cart?.id, 'no cart id in response');
  });

  await check('GET /store/broadcast — personalization endpoint', async () => {
    const data = await get('/store/broadcast?visitor_id=regression-test');
    assert(data.block_order || data.blocks, 'missing broadcast structure');
  });

  await check('GET /store/signal — signal endpoint reachable', async () => {
    const res = await fetch(`${API}/store/signal`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: 'test-' + Date.now(),
        visitor_id: 'regression-test',
        session_id: 'session-regression',
        type: 'page_view',
        context: {},
        ts: new Date().toISOString(),
      }),
    });
    assert(res.ok || res.status === 201, `signal POST failed: ${res.status}`);
  });

  await check('GET /store/analyst — chapter margin query', async () => {
    const data = await get('/store/analyst?q=which+chapter+has+the+best+margin');
    assert(data.grounded === true, 'not grounded');
    assert(data.row_count > 0, 'no rows returned');
    assert(data.insight?.includes('Best:'), `unexpected insight: ${data.insight}`);
  });

  await check('GET /store/analyst — missing q returns 400', async () => {
    const res = await fetch(`${API}/store/analyst`, { headers });
    assert(res.status === 400, `expected 400, got ${res.status}`);
  });

  await check('GET /store/drops — drop list reachable', async () => {
    const data = await get('/store/drops');
    assert(data.drops !== undefined || data.error === undefined, 'unexpected drops response');
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch(e => { console.error(e); process.exit(1); });
