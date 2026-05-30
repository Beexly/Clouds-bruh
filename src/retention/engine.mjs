import { now } from '../lib/clock.mjs';

/**
 * Retention engine (R7, from docs/research/08). Pure, deterministic analytics
 * over the append-only order log — RFM segmentation, cohort retention, a
 * transparent predicted-LTV heuristic, and lapse detection. Money stays integer
 * minor units; "now" comes from the injectable clock so tests are stable.
 *
 * Realized revenue counts orders that left intake and weren't cancelled/refunded
 * (mirrors the analytics + reviews definition of a real purchase).
 */

const DAY = 86_400_000;
const REALIZED_EXCLUDE = new Set(['intake', 'cancelled', 'refunded']);

const isRealized = (o) => !REALIZED_EXCLUDE.has(o.status);
const ts = (s) => (s ? Date.parse(s) : NaN);

/** Group realized orders by customer email → { email, orders[], firstAt, lastAt, count, monetaryMinor }. */
export function customersFrom(orders = []) {
  const by = new Map();
  for (const o of orders) {
    if (!isRealized(o)) continue;
    const email = o.customer?.email;
    if (!email) continue;
    if (!by.has(email)) by.set(email, { email, orders: [], monetaryMinor: 0 });
    const c = by.get(email);
    c.orders.push(o);
    c.monetaryMinor += o.totals?.grandMinor || 0;
  }
  for (const c of by.values()) {
    const times = c.orders.map((o) => ts(o.createdAt)).filter((n) => !Number.isNaN(n)).sort((a, b) => a - b);
    c.count = c.orders.length;
    c.firstAt = times[0] ?? null;
    c.lastAt = times[times.length - 1] ?? null;
    c.aovMinor = c.count ? Math.round(c.monetaryMinor / c.count) : 0;
  }
  return [...by.values()];
}

/** Quintile-ish RFM scoring (1–5 each) + a named segment. */
export function rfm(customer, nowMs = Date.parse(now())) {
  const recencyDays = customer.lastAt ? Math.floor((nowMs - customer.lastAt) / DAY) : Infinity;
  // Recency: fresher = higher. Thresholds tuned for considered/luxury cadence.
  const R = recencyDays <= 30 ? 5 : recencyDays <= 90 ? 4 : recencyDays <= 180 ? 3 : recencyDays <= 365 ? 2 : 1;
  const F = customer.count >= 5 ? 5 : customer.count >= 3 ? 4 : customer.count === 2 ? 3 : 1;
  const m = customer.monetaryMinor;
  const M = m >= 100000 ? 5 : m >= 50000 ? 4 : m >= 20000 ? 3 : m >= 8000 ? 2 : 1;
  return { R, F, M, recencyDays, segment: segmentOf(R, F, M) };
}

function segmentOf(R, F, M) {
  if (R >= 4 && F >= 4) return 'champion';
  if (F >= 4) return 'loyal';
  if (R >= 4 && F <= 2) return 'new';
  if (R >= 3 && M >= 4) return 'promising';
  if (R <= 2 && F >= 3) return 'at_risk';
  if (R === 1 && F <= 2) return 'lost';
  if (R <= 2) return 'hibernating';
  return 'promising';
}

/** Lapse state from recency vs. the customer's own typical inter-purchase gap. */
export function lapseState(customer, nowMs = Date.parse(now())) {
  if (!customer.lastAt) return 'unknown';
  const recencyDays = (nowMs - customer.lastAt) / DAY;
  // Typical gap: median inter-order gap if repeat, else a 120-day luxury default.
  let typical = 120;
  if (customer.count >= 2) {
    const times = customer.orders.map((o) => ts(o.createdAt)).filter((n) => !Number.isNaN(n)).sort((a, b) => a - b);
    const gaps = [];
    for (let i = 1; i < times.length; i++) gaps.push((times[i] - times[i - 1]) / DAY);
    gaps.sort((a, b) => a - b);
    typical = gaps[Math.floor(gaps.length / 2)] || 120;
  }
  if (recencyDays <= typical) return 'active';
  if (recencyDays <= typical * 1.5) return 'due';
  if (recencyDays <= typical * 3) return 'lapsing';
  return 'dormant';
}

/**
 * Transparent predicted-LTV heuristic (v1; BG/NBD×Gamma-Gamma documented as v2).
 * Expected future value ≈ AOV × expected repeats, discounted by lapse risk.
 */
export function predictedLtvMinor(customer, nowMs = Date.parse(now())) {
  if (!customer.count) return 0;
  const state = lapseState(customer, nowMs);
  const survival = { active: 1, due: 0.7, lapsing: 0.35, dormant: 0.1, unknown: 0.5 }[state] ?? 0.5;
  // More past orders → higher expected future cadence (capped).
  const expectedFutureOrders = Math.min(8, customer.count) * survival;
  const future = Math.round(customer.aovMinor * expectedFutureOrders);
  return customer.monetaryMinor + future; // historic + predicted future
}

/** Monthly cohort retention matrix: cohort (first-purchase month) → repeat counts by month offset. */
export function cohorts(customers = []) {
  const monthKey = (ms) => {
    const d = new Date(ms);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  };
  const byCohort = {};
  for (const c of customers) {
    if (!c.firstAt) continue;
    const cohort = monthKey(c.firstAt);
    byCohort[cohort] = byCohort[cohort] || { cohort, size: 0, repeatCustomers: 0 };
    byCohort[cohort].size++;
    if (c.count >= 2) byCohort[cohort].repeatCustomers++;
  }
  return Object.values(byCohort)
    .sort((a, b) => a.cohort.localeCompare(b.cohort))
    .map((c) => ({ ...c, repeatRate: c.size ? Math.round((c.repeatCustomers / c.size) * 100) : 0 }));
}

/** Whole-population retention snapshot — the headline numbers. */
export function retentionSummary(orders = [], nowMs = Date.parse(now())) {
  const customers = customersFrom(orders);
  const total = customers.length;
  const repeat = customers.filter((c) => c.count >= 2).length;
  const second = customers.filter((c) => c.count >= 2).length;
  const segments = {};
  const lapses = {};
  let ltvSum = 0;
  for (const c of customers) {
    const seg = rfm(c, nowMs).segment;
    segments[seg] = (segments[seg] || 0) + 1;
    const ls = lapseState(c, nowMs);
    lapses[ls] = (lapses[ls] || 0) + 1;
    ltvSum += predictedLtvMinor(c, nowMs);
  }
  return {
    customers: total,
    repeatRatePct: total ? Math.round((repeat / total) * 100) : 0,
    secondPurchaseRatePct: total ? Math.round((second / total) * 100) : 0,
    segments,
    lapses,
    avgPredictedLtvMinor: total ? Math.round(ltvSum / total) : 0,
    cohorts: cohorts(customers),
  };
}
