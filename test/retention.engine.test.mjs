import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setNow, resetNow } from '../src/lib/clock.mjs';
import { customersFrom, rfm, lapseState, predictedLtvMinor, retentionSummary } from '../src/retention/engine.mjs';
import { evaluateFlows, proposeFlows } from '../src/retention/lifecycle.mjs';
import { createOrder } from '../src/model/order.mjs';
import { saveOrders } from '../src/orders/store.mjs';
import { loadInbox } from '../src/support/inbox.mjs';
import { tempPaths } from './helpers.mjs';

const order = (email, at, grandMinor, status = 'delivered') =>
  createOrder({
    items: [{ productId: 'p', variantId: 'v', sku: 'S', unitPriceMinor: grandMinor, qty: 1 }],
    customer: { email },
    status,
    createdAt: at,
  });

test('customersFrom groups realized orders and computes monetary/count', () => {
  const customers = customersFrom([
    order('a@x.com', '2026-01-01T00:00:00Z', 10000),
    order('a@x.com', '2026-03-01T00:00:00Z', 20000),
    order('b@x.com', '2026-02-01T00:00:00Z', 5000),
    order('c@x.com', '2026-02-01T00:00:00Z', 5000, 'cancelled'), // excluded
  ]);
  const a = customers.find((c) => c.email === 'a@x.com');
  assert.equal(a.count, 2);
  assert.equal(a.monetaryMinor, 30000);
  assert.ok(!customers.find((c) => c.email === 'c@x.com'), 'cancelled order excluded');
});

test('RFM segments a frequent recent buyer as champion', () => {
  setNow('2026-03-15T00:00:00Z');
  try {
    const c = customersFrom([
      order('vip@x.com', '2026-01-01T00:00:00Z', 40000),
      order('vip@x.com', '2026-02-01T00:00:00Z', 40000),
      order('vip@x.com', '2026-03-01T00:00:00Z', 40000),
      order('vip@x.com', '2026-03-10T00:00:00Z', 40000),
    ])[0];
    const r = rfm(c);
    assert.equal(r.segment, 'champion');
    assert.ok(r.F >= 4); // 4 orders → high frequency
  } finally {
    resetNow();
  }
});

test('lapse state + predicted LTV reflect recency', () => {
  setNow('2026-06-01T00:00:00Z');
  try {
    const recent = customersFrom([order('r@x.com', '2026-05-20T00:00:00Z', 20000)])[0];
    const old = customersFrom([order('o@x.com', '2026-01-01T00:00:00Z', 20000)])[0];
    assert.equal(lapseState(recent), 'active');
    assert.ok(['due', 'lapsing', 'dormant'].includes(lapseState(old)));
    assert.ok(predictedLtvMinor(recent) >= recent.monetaryMinor);
    assert.ok(predictedLtvMinor(recent) > predictedLtvMinor(old), 'active customer worth more than lapsed');
  } finally {
    resetNow();
  }
});

test('retention summary reports repeat rate and cohorts', () => {
  const s = retentionSummary([
    order('a@x.com', '2026-01-05T00:00:00Z', 10000),
    order('a@x.com', '2026-02-05T00:00:00Z', 10000),
    order('b@x.com', '2026-01-20T00:00:00Z', 10000),
  ]);
  assert.equal(s.customers, 2);
  assert.equal(s.repeatRatePct, 50); // a@ repeats, b@ doesn't
  assert.ok(s.cohorts.find((c) => c.cohort === '2026-01'));
});

test('second-purchase flow proposes for a single-purchase due customer; never sends', async () => {
  const paths = await tempPaths();
  setNow('2026-06-01T00:00:00Z');
  try {
    // One purchase ~150 days ago → past the 120-day default → due/lapsing.
    await saveOrders(paths, [order('solo@x.com', '2026-01-01T00:00:00Z', 15000)]);
    const proposals = await evaluateFlows(paths);
    assert.ok(proposals.some((p) => p.flow === 'second_purchase' && p.email === 'solo@x.com'));

    const { proposed } = await proposeFlows(paths);
    assert.ok(proposed >= 1);
    const inbox = await loadInbox(paths);
    const msg = inbox.find((m) => m.email === 'solo@x.com' && m.flow === 'second_purchase');
    assert.ok(msg, 'proposal landed in inbox');
    assert.equal(msg.status, 'drafted'); // drafted, NOT sent — human gate holds
    assert.notEqual(msg.status, 'sent');

    // Idempotent: re-running proposes nothing new.
    const again = await proposeFlows(paths);
    assert.equal(again.proposed, 0);
  } finally {
    resetNow();
  }
});
