import { pct } from '../lib/num.mjs';
import { now } from '../lib/clock.mjs';

export function createLane(id, label, totalUnits = 0, doneUnits = 0) {
  return { id, label, totalUnits, doneUnits, pct: pct(doneUnits, totalUnits) };
}

export function ledgerFrom(lanes) {
  const totalUnits = lanes.reduce((s, l) => s + l.totalUnits, 0);
  const doneUnits = lanes.reduce((s, l) => s + l.doneUnits, 0);
  return { lanes, overallPct: pct(doneUnits, totalUnits), updatedAt: now() };
}
