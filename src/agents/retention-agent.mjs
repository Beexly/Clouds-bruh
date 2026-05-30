import { proposeFlows } from '../retention/lifecycle.mjs';
import { retentionSummary } from '../retention/engine.mjs';
import { loadOrders } from '../orders/store.mjs';

export const meta = { role: 'retention' };

/**
 * Retention agent: evaluate lifecycle flows and PROPOSE outreach into the
 * support inbox for a human to send. Never sends, never discounts. Also reports
 * the retention snapshot. The decisive lever is the second-purchase nudge.
 */
export async function run(paths, ctx, opts = {}) {
  const { proposed, total } = await proposeFlows(paths, opts);
  const summary = retentionSummary(await loadOrders(paths));
  return {
    producedCandidateIds: [],
    notes:
      `${summary.customers} customer(s), repeat ${summary.repeatRatePct}%; ` +
      `proposed ${proposed} lifecycle draft(s) of ${total} eligible (awaiting human send)`,
  };
}
