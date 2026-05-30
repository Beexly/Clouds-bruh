import { OrderStatus, ActorKind } from '../model/enums.mjs';
import { now } from '../lib/clock.mjs';
import { actorLabel } from '../lib/actor.mjs';

const O = OrderStatus;

/** Legal order transitions. */
const ALLOWED = {
  [O.INTAKE]: new Set([O.PAYMENT_PENDING, O.CANCELLED]),
  [O.PAYMENT_PENDING]: new Set([O.PAID, O.CANCELLED]),
  [O.PAID]: new Set([O.ROUTED, O.CANCELLED, O.REFUNDED]),
  [O.ROUTED]: new Set([O.IN_FULFILLMENT, O.CANCELLED]),
  [O.IN_FULFILLMENT]: new Set([O.SHIPPED, O.CANCELLED]),
  [O.SHIPPED]: new Set([O.IN_TRANSIT, O.DELIVERED]),
  [O.IN_TRANSIT]: new Set([O.DELIVERED]),
  [O.DELIVERED]: new Set([O.RETURN_REQUESTED]),
  [O.RETURN_REQUESTED]: new Set([O.RETURN_IN_TRANSIT, O.DELIVERED]),
  [O.RETURN_IN_TRANSIT]: new Set([O.RETURNED]),
  [O.RETURNED]: new Set([O.REFUNDED]),
  [O.REFUNDED]: new Set([]),
  [O.CANCELLED]: new Set([]),
};

/** Money-moving outcomes an agent may never trigger — always human-gated. */
const AGENT_FORBIDDEN_TARGETS = new Set([O.REFUNDED, O.CANCELLED]);

export function canTransitionOrder(from, to, actor) {
  const set = ALLOWED[from];
  if (!set || !set.has(to)) return false;
  if (actor?.kind === ActorKind.AGENT && AGENT_FORBIDDEN_TARGETS.has(to)) return false;
  return true;
}

export function advanceOrder(order, to, actor, opts = {}) {
  const from = order.status;
  if (!canTransitionOrder(from, to, actor)) {
    const suffix = actor?.kind === ActorKind.AGENT && AGENT_FORBIDDEN_TARGETS.has(to) ? ' (agent not permitted)' : '';
    throw new Error(`Illegal order transition ${from} -> ${to}${suffix}`);
  }
  const at = now();
  return {
    ...order,
    status: to,
    updatedAt: at,
    fulfillment: opts.fulfillment ? { ...(order.fulfillment || {}), ...opts.fulfillment } : order.fulfillment,
    statusHistory: [...(order.statusHistory || []), { from, to, at, actor: actorLabel(actor), note: opts.note }],
  };
}

export { ALLOWED as ORDER_ALLOWED, AGENT_FORBIDDEN_TARGETS };
