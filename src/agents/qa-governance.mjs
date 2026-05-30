import { loadQueue } from '../queue/store.mjs';
import { now } from '../lib/clock.mjs';

export const meta = { role: 'qa' };

/**
 * QA / Governance: audits invariants and can BLOCK — it approves nothing.
 * Verifies the always-false auto-approvable invariant and flags stale items.
 */
export async function run(paths, ctx, opts = {}) {
  const items = await loadQueue(paths);
  const findings = [];
  const t = now();
  for (const i of items) {
    if (i.governance?.autoApprovable !== false) {
      findings.push(`INVARIANT VIOLATION: ${i.id} is auto-approvable`);
    }
    if (i.expiresAt && i.expiresAt < t && ['proposed', 'queued'].includes(i.status)) {
      findings.push(`STALE: ${i.id} past expiry`);
    }
  }
  return {
    producedCandidateIds: [],
    notes: findings.length ? findings.join('; ') : `audited ${items.length} candidate(s) — all invariants hold`,
  };
}
