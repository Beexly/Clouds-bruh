import { readJson, writeJson } from '../lib/jsonfile.mjs';

export async function loadOrders(paths) {
  return readJson(paths.orders, []);
}

export async function saveOrders(paths, orders) {
  await writeJson(paths.orders, orders);
  return orders;
}

export async function upsertOrder(paths, order) {
  const all = await loadOrders(paths);
  const i = all.findIndex((o) => o.id === order.id);
  if (i >= 0) all[i] = order;
  else all.push(order);
  await saveOrders(paths, all);
  return order;
}
