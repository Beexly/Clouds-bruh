import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advanceOrder, canTransitionOrder } from '../src/orders/lifecycle.mjs';
import { createOrder } from '../src/model/order.mjs';
import { human, agent } from '../src/lib/actor.mjs';

test('happy path intake → delivered', () => {
  let o = createOrder({ items: [{ unitPriceMinor: 1000, qty: 1 }] });
  for (const to of ['payment_pending', 'paid', 'routed', 'in_fulfillment', 'shipped', 'in_transit', 'delivered']) {
    o = advanceOrder(o, to, human());
  }
  assert.equal(o.status, 'delivered');
  assert.equal(o.statusHistory.length, 8); // initial + 7 moves
});

test('illegal jump is rejected', () => {
  const o = createOrder({ items: [] });
  assert.throws(() => advanceOrder(o, 'delivered', human()));
});

test('an agent may never refund or cancel', () => {
  assert.equal(canTransitionOrder('paid', 'refunded', agent('orders')), false);
  assert.equal(canTransitionOrder('paid', 'refunded', human()), true);
  assert.throws(() => advanceOrder({ status: 'paid', statusHistory: [] }, 'refunded', agent('orders')));
});

test('return + refund path', () => {
  let o = { status: 'delivered', statusHistory: [] };
  for (const to of ['return_requested', 'return_in_transit', 'returned', 'refunded']) {
    o = advanceOrder(o, to, human());
  }
  assert.equal(o.status, 'refunded');
});
