import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOrder } from '../src/model/order.mjs';

test('totals = line totals + shipping + tax', () => {
  const o = createOrder({
    items: [
      { unitPriceMinor: 1000, qty: 2 },
      { unitPriceMinor: 500, qty: 1 },
    ],
    shippingMinor: 300,
    taxMinor: 200,
  });
  assert.equal(o.totals.subtotalMinor, 2500);
  assert.equal(o.totals.grandMinor, 3000);
});

test('payment is never live by default (v1 guarantee)', () => {
  const o = createOrder({ items: [] });
  assert.equal(o.payment.live, false);
  assert.equal(o.status, 'intake');
});
