import { loadCatalog, saveCatalog } from '../catalog/store.mjs';
import { isLive } from '../storefront/projection.mjs';
import { createOrder } from '../model/order.mjs';
import { upsertOrder, loadOrders } from './store.mjs';
import { buildPaymentLinkIntent } from './payments.mjs';
import { makeEvent, appendEvent } from '../catalog/events.mjs';
import { renderStorefront } from '../storefront/render.mjs';
import { StockState } from '../model/enums.mjs';
import { now } from '../lib/clock.mjs';

/** Available units for a variant = on hand minus already reserved. */
export function variantAvailable(v) {
  return (v.inventory?.onHand || 0) - (v.inventory?.reserved || 0);
}

/** Recompute a product's stockState from its variants' availability. */
export function recomputeStock(product) {
  const anyAvailable = (product.variants || []).some((v) => variantAvailable(v) > 0);
  product.stockState = anyAvailable ? StockState.IN : StockState.OUT;
  return product;
}

/**
 * Turn a cart into a real Order through the existing lifecycle. Safety:
 * - only LIVE products (published+visible+in-stock) are purchasable;
 * - quantities are validated against true availability and reserved atomically
 *   (per call) so the storefront can't oversell;
 * - payment stays intent-only in v1 (`live:false`) — no charge, no spend.
 *
 * cart: [{ productId, variantId, qty }]
 * customer: { email, name?, ... }
 */
export async function createCheckout(paths, cart = [], customer = {}, opts = {}) {
  if (!Array.isArray(cart) || cart.length === 0) throw new Error('Cart is empty');
  if (!customer.email) throw new Error('Customer email is required');

  const catalog = await loadCatalog(paths);
  const items = [];
  const reservations = [];

  for (const line of cart) {
    const qty = Math.trunc(line.qty || 0);
    if (qty <= 0) throw new Error('Invalid quantity for ' + line.productId);
    const product = catalog.products.find((p) => p.id === line.productId);
    if (!product || !isLive(product)) throw new Error('Product not available: ' + line.productId);
    const variant = (product.variants || []).find((v) => v.id === line.variantId);
    if (!variant) throw new Error('Variant not found: ' + line.variantId);
    if (variantAvailable(variant) < qty) {
      throw new Error(`Insufficient stock for ${product.title} (${variant.color}/${variant.size})`);
    }
    const unitPriceMinor = variant.priceMinor || product.pricing?.listMinor || 0;
    items.push({
      productId: product.id,
      variantId: variant.id,
      sku: variant.sku,
      title: `${product.title} — ${variant.color}/${variant.size}`,
      qty,
      unitPriceMinor,
      currency: product.pricing?.currency || 'USD',
    });
    reservations.push({ variant, qty, product });
  }

  // Reserve inventory and recompute stock (a sold-out product drops off the storefront).
  for (const r of reservations) {
    r.variant.inventory.reserved = (r.variant.inventory.reserved || 0) + r.qty;
    recomputeStock(r.product);
  }

  const existing = await loadOrders(paths);
  const order = createOrder({
    items,
    customer,
    shippingAddress: opts.shippingAddress,
    shippingMinor: opts.shippingMinor || 0,
    taxMinor: opts.taxMinor || 0,
    seq: existing.length + 1,
    payment: { provider: 'stripe', status: 'pending', live: false },
    actor: 'storefront',
  });
  order.payment.intent = buildPaymentLinkIntent(order); // intent only — no Stripe call

  await saveCatalog(paths, catalog);
  await upsertOrder(paths, order);
  await appendEvent(paths, makeEvent('order.created', { orderId: order.id, number: order.number, grandMinor: order.totals.grandMinor }, 'storefront'));
  await renderStorefront(paths);

  return order;
}

/** Public-safe view of an order for the confirmation screen. */
export function orderConfirmation(order) {
  return {
    number: order.number,
    status: order.status,
    items: order.items.map((i) => ({ title: i.title, qty: i.qty, lineTotalMinor: i.lineTotalMinor })),
    totals: order.totals,
    placedAt: order.createdAt || now(),
    note: 'Payment is not captured in this preview build.',
  };
}
