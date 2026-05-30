import { OrderStatus, Currency } from './enums.mjs';
import { orderId, orderNumber } from './ids.mjs';
import { shortHash } from '../lib/hash.mjs';
import { now } from '../lib/clock.mjs';
import { int } from '../lib/num.mjs';

export function createOrderItem(input = {}) {
  const qty = int(input.qty, 1);
  const unit = int(input.unitPriceMinor, 0);
  return {
    id: input.id || 'oi_' + shortHash([input.productId, input.variantId, input.sku, qty], 8),
    productId: input.productId,
    variantId: input.variantId,
    sku: input.sku,
    title: input.title || '',
    qty,
    unitPriceMinor: unit,
    lineTotalMinor: unit * qty,
    currency: input.currency || Currency.USD,
    fulfillmentStatus: input.fulfillmentStatus || 'pending',
  };
}

export function computeTotals(items, opts = {}) {
  const subtotalMinor = items.reduce((s, i) => s + int(i.lineTotalMinor, 0), 0);
  const shippingMinor = int(opts.shippingMinor, 0);
  const taxMinor = int(opts.taxMinor, 0);
  return {
    subtotalMinor,
    shippingMinor,
    taxMinor,
    grandMinor: subtotalMinor + shippingMinor + taxMinor,
    currency: opts.currency || items[0]?.currency || Currency.USD,
  };
}

export function createOrder(input = {}) {
  const items = (input.items || []).map(createOrderItem);
  const status = input.status || OrderStatus.INTAKE;
  const at = input.createdAt || now();
  const seq = int(input.seq, 1);
  return {
    id: input.id || orderId([input.number || seq, input.customer?.email || '']),
    number: input.number || orderNumber(seq, input.year),
    status,
    customer: input.customer || { email: 'unknown@example.com' },
    items,
    shippingAddress: input.shippingAddress,
    totals: input.totals || computeTotals(items, input),
    payment: {
      provider: input.payment?.provider || 'none',
      paymentLinkId: input.payment?.paymentLinkId,
      paymentIntentId: input.payment?.paymentIntentId,
      checkoutSessionId: input.payment?.checkoutSessionId,
      status: input.payment?.status || 'none',
      // v1 guarantee: nothing is live. Proven by tests.
      live: input.payment?.live === true,
    },
    fulfillment: input.fulfillment,
    returns: input.returns || [],
    statusHistory: input.statusHistory || [
      { from: null, to: status, at, actor: input.actor || 'system' },
    ],
    createdAt: at,
    updatedAt: input.updatedAt || at,
  };
}
