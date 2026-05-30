import { createPaths } from '../lib/paths.mjs';
import { loadOrders, upsertOrder } from '../orders/store.mjs';
import { advanceOrder } from '../orders/lifecycle.mjs';
import { ordersView } from '../ops/orders-view.mjs';
import { makeEvent, appendEvent } from '../catalog/events.mjs';
import { human } from '../lib/actor.mjs';
import { OrderStatus } from '../model/enums.mjs';

const paths = createPaths(process.cwd());
const [cmd, num, ...rest] = process.argv.slice(2);
const actor = human('operator');
const money = (m) => '$' + ((m || 0) / 100).toFixed(2);

async function findByNumberOrId(key) {
  const orders = await loadOrders(paths);
  return orders.find((o) => o.number === key || o.id === key);
}

async function transition(key, to) {
  const order = await findByNumberOrId(key);
  if (!order) throw new Error('Order not found: ' + key);
  const next = advanceOrder(order, to, actor, { note: `operator ${to}` });
  await upsertOrder(paths, next);
  await appendEvent(paths, makeEvent('order.' + to, { orderId: order.id, number: order.number }, 'human:operator'));
  console.log(`${order.number}: ${order.status} → ${next.status}`);
}

const main = async () => {
  switch (cmd) {
    case undefined:
    case 'list': {
      const v = await ordersView(paths);
      console.log(`Orders: ${v.total} total, ${v.openCount} open, revenue ${money(v.revenueMinor)}`);
      for (const o of v.recent) {
        console.log(`  ${o.number}  ${String(o.status).padEnd(14)} ${money(o.grandMinor).padStart(10)}  ${o.email}`);
      }
      break;
    }
    case 'advance': await transition(num, rest[0] || OrderStatus.PAID); break; // operator picks the next state
    case 'refund': await transition(num, OrderStatus.REFUNDED); break; // human-only
    case 'cancel': await transition(num, OrderStatus.CANCELLED); break; // human-only
    default:
      console.log('Usage: npm run orders [list | advance <number> <state> | refund <number> | cancel <number>]');
  }
};

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
