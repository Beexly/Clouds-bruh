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

  // ── ORACLE depth (Wave E) ───────────────────────────────────────────────
  await check('GET /store/recommendations?strategy=graph_rec — returns products', async () => {
    const data = await get('/store/recommendations?visitor_id=ssr&strategy=graph_rec&limit=8');
    assert(data.strategy === 'graph_rec', 'wrong strategy echoed');
    assert(Array.isArray(data.product_ids) && data.product_ids.length > 0, 'no graph_rec products');
  });

  await check('GET /store/broadcast — includes a populated graph_rec block', async () => {
    const data = await get('/store/broadcast?visitor_id=ssr');
    assert(Array.isArray(data.block_order) && data.block_order.includes('graph_rec'), 'no graph_rec in block_order');
    assert((data.blocks?.graph_rec ?? []).length > 0, 'graph_rec block empty');
  });

  await check('GET /store/pricing — staged dynamic price within floor/ceiling', async () => {
    const prods = await get('/store/products?limit=1&fields=id');
    const pid = prods.products[0].id;
    const d = await get(`/store/pricing?product_id=${pid}`);
    assert(d.would_apply === false, 'pricing must be staged (would_apply=false)');
    assert(d.suggested_usd >= d.floor_usd && d.suggested_usd <= d.ceiling_usd, 'suggested outside [floor, ceiling]');
  });

  // ── Monetization (Wave C) ───────────────────────────────────────────────
  await check('GET /store/monetization/tiers — includes patron', async () => {
    const d = await get('/store/monetization/tiers');
    assert(Array.isArray(d.tiers) && d.tiers.some((t: any) => t.key === 'patron'), 'patron tier missing');
  });

  await check('POST subscribe + purchase credits — test mode round-trip', async () => {
    const cust = `regression-${Date.now()}`;
    const sub = await (await fetch(`${API}/store/monetization/subscribe`, {
      method: 'POST', headers, body: JSON.stringify({ customer_id: cust, tier_key: 'patron' }),
    })).json();
    assert(sub.is_patron === true, 'subscribe did not grant patron');
    const credits = await (await fetch(`${API}/store/monetization/credits`, {
      method: 'POST', headers, body: JSON.stringify({ customer_id: cust, amount: 1000 }),
    })).json();
    assert(credits.balance === 1000, `credit balance ${credits.balance} != 1000`);
  });

  // ── Predictive BI (Wave D / Phase 9) ─────────────────────────────────────
  await check('GET /store/analyst — demand forecast is predictive', async () => {
    const d = await get('/store/analyst?q=forecast+demand+by+chapter+next+week');
    assert(/Demand forecast/.test(d.description), `wrong query matched: ${d.description}`);
    assert(/next-week demand|wk\/wk/.test(d.insight), `not a forecast insight: ${d.insight}`);
  });

  await check('GET /store/analyst — churn risk projection', async () => {
    const d = await get('/store/analyst?q=churn+retention+risk+lapsed');
    assert(/Churn risk/.test(d.description), `wrong query matched: ${d.description}`);
    assert(/lapsed/.test(d.insight), `not a churn insight: ${d.insight}`);
  });

  // ── Tune the Broadcast — visitor controls (Wave G) ───────────────────────
  await check('POST /store/preferences — follow steers ORACLE toward the chapter', async () => {
    const vid = `tune-reg-${Date.now()}`;
    const set = await (await fetch(`${API}/store/preferences`, {
      method: 'POST', headers, body: JSON.stringify({ visitor_id: vid, followed: ['armor'], muted: ['altar'] }),
    })).json();
    assert(set.followed?.includes('armor') && set.muted?.includes('altar'), 'preferences not stored');
    const bc = await get(`/store/broadcast?visitor_id=${vid}`);
    assert(bc.block_order?.[0] === 'your_chapters', `followed rail should lead, got ${bc.block_order?.[0]}`);
    assert(bc.preferences?.followed?.includes('armor'), 'broadcast did not reflect preferences');
  });

  // ── Conversational Shepherd (Wave D/11) ──────────────────────────────────
  await check('POST /store/shepherd — replies, grounded in live drops', async () => {
    const res = await fetch(`${API}/store/shepherd`, {
      method: 'POST', headers, body: JSON.stringify({ message: 'what drops are live?' }),
    });
    assert(res.ok, `shepherd HTTP ${res.status}`);
    const d = await res.json();
    assert(typeof d.reply === 'string' && d.reply.length > 0, 'empty shepherd reply');
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch(e => { console.error(e); process.exit(1); });
