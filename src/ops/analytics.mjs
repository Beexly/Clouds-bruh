import { loadCatalog } from '../catalog/store.mjs';
import { loadQueue } from '../queue/store.mjs';
import { loadOrders } from '../orders/store.mjs';
import { readEvents } from '../catalog/events.mjs';
import { isLive } from '../storefront/projection.mjs';
import { Lifecycle, QueueStatus, OrderStatus } from '../model/enums.mjs';

const rate = (num, den) => (den > 0 ? Math.round((num / den) * 100) : 0);

function tally(arr) {
  const out = {};
  for (const x of arr) out[x] = (out[x] || 0) + 1;
  return out;
}

/**
 * Analytics command center. Derives metrics from the append-only event log plus
 * the catalog/queue/orders projections. Read-only; feeds the optimization loop.
 */
export async function analytics(paths) {
  const [catalog, queue, orders, events] = await Promise.all([
    loadCatalog(paths),
    loadQueue(paths),
    loadOrders(paths),
    readEvents(paths),
  ]);
  const products = catalog.products || [];

  // — Catalog —
  const published = products.filter((p) => p.lifecycle === Lifecycle.PUBLISHED).length;
  const liveCount = products.filter(isLive).length;
  const byCategory = tally(products.map((p) => p.category));
  const byTier = tally(products.map((p) => p.tier || 'untiered'));

  // — Queue funnel + approval economics —
  const qByStatus = tally(queue.map((c) => c.status));
  const approved =
    (qByStatus[QueueStatus.APPROVED] || 0) +
    (qByStatus[QueueStatus.PUBLISHING] || 0) +
    (qByStatus[QueueStatus.PUBLISHED] || 0);
  const rejected = qByStatus[QueueStatus.REJECTED] || 0;
  const decided = approved + rejected;
  const funnel = {
    sourced: queue.length,
    queued: qByStatus[QueueStatus.QUEUED] || 0,
    approved,
    published: qByStatus[QueueStatus.PUBLISHED] || 0,
    live: liveCount,
  };

  // — Orders —
  const realized = orders.filter(
    (o) => ![OrderStatus.INTAKE, OrderStatus.CANCELLED, OrderStatus.REFUNDED].includes(o.status)
  );
  const revenueMinor = realized.reduce((s, o) => s + (o.totals?.grandMinor || 0), 0);
  const unitsSold = realized.reduce((s, o) => s + (o.items || []).reduce((n, i) => n + i.qty, 0), 0);
  const aovMinor = realized.length ? Math.round(revenueMinor / realized.length) : 0;

  // — Best sellers (by units, from realized orders) —
  const unitsByTitle = {};
  for (const o of realized) for (const i of o.items || []) unitsByTitle[i.title] = (unitsByTitle[i.title] || 0) + i.qty;
  const topProducts = Object.entries(unitsByTitle)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([title, units]) => ({ title, units }));

  // — Activity —
  const eventsByType = tally(events.map((e) => e.type));
  const recentActivity = events.slice(-10).reverse().map((e) => ({ type: e.type, at: e.at, actor: e.actor }));

  return {
    catalog: { total: products.length, published, live: liveCount, byCategory, byTier },
    queue: {
      total: queue.length,
      byStatus: qByStatus,
      approvalRatePct: rate(approved, decided),
      rejectionRatePct: rate(rejected, decided),
      funnel,
    },
    orders: { total: orders.length, realized: realized.length, revenueMinor, aovMinor, unitsSold, topProducts },
    activity: { totalEvents: events.length, byType: eventsByType, recent: recentActivity },
  };
}
