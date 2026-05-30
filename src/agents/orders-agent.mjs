import { loadOrders, saveOrders } from '../orders/store.mjs';
import { advanceOrder, canTransitionOrder } from '../orders/lifecycle.mjs';
import { OrderStatus } from '../model/enums.mjs';
import { agent } from '../lib/actor.mjs';

export const meta = { role: 'orders' };

// One autonomous step forward per eligible order (never refund/cancel).
const STEP = {
  [OrderStatus.PAID]: OrderStatus.ROUTED,
  [OrderStatus.ROUTED]: OrderStatus.IN_FULFILLMENT,
  [OrderStatus.IN_FULFILLMENT]: OrderStatus.SHIPPED,
  [OrderStatus.SHIPPED]: OrderStatus.IN_TRANSIT,
  [OrderStatus.IN_TRANSIT]: OrderStatus.DELIVERED,
};

export async function run(paths, ctx, opts = {}) {
  const orders = await loadOrders(paths);
  const a = agent('orders');
  let advanced = 0;
  const next = orders.map((o) => {
    const to = STEP[o.status];
    if (to && canTransitionOrder(o.status, to, a)) {
      advanced++;
      return advanceOrder(o, to, a, { note: 'auto-advance' });
    }
    return o;
  });
  if (advanced) await saveOrders(paths, next);
  return { producedCandidateIds: [], notes: `advanced ${advanced} order(s)` };
}
