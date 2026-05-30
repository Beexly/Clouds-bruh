import { loadOrders } from '../orders/store.mjs';
import { OrderStatus } from '../model/enums.mjs';

const OPEN = new Set([
  OrderStatus.INTAKE,
  OrderStatus.PAYMENT_PENDING,
  OrderStatus.PAID,
  OrderStatus.ROUTED,
  OrderStatus.IN_FULFILLMENT,
  OrderStatus.SHIPPED,
  OrderStatus.IN_TRANSIT,
]);

/** Operator-facing orders summary: counts, revenue, and recent orders. */
export async function ordersView(paths, opts = {}) {
  const orders = await loadOrders(paths);
  const byStatus = {};
  let revenueMinor = 0;
  let openCount = 0;
  for (const o of orders) {
    byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    if (OPEN.has(o.status)) openCount++;
    // Recognize revenue for orders that reached at least "paid" and weren't refunded.
    if (o.status !== OrderStatus.REFUNDED && o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.INTAKE) {
      revenueMinor += o.totals?.grandMinor || 0;
    }
  }
  const recent = [...orders]
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .slice(0, opts.limit || 20)
    .map((o) => ({
      number: o.number,
      id: o.id,
      status: o.status,
      email: o.customer?.email,
      itemCount: (o.items || []).reduce((n, i) => n + i.qty, 0),
      grandMinor: o.totals?.grandMinor || 0,
      currency: o.totals?.currency || 'USD',
      paymentLive: o.payment?.live === true,
      createdAt: o.createdAt,
    }));

  return { total: orders.length, openCount, revenueMinor, byStatus, recent };
}
