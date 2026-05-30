import { getCandidate } from './store.mjs';
import { transitionForLabels } from './mirror-github.mjs';
import { approveCandidate, rejectCandidate, requestChanges } from './review-actions.mjs';
import { QueueStatus } from '../model/enums.mjs';

/**
 * Pull half of the GitHub mirror (Phase 2). Given the labels an operator applied
 * to a candidate's issue (from their phone), apply the corresponding HUMAN-gated
 * review action. The actor is the human who labeled the issue — so this routes
 * through the exact same gate as the CLI; agents still cannot approve.
 *
 * Returns { applied, action, candidateId } describing what happened. A no-op
 * (no decision label, or already in the target state) returns applied:false.
 */
export async function applyGithubDecision(paths, { candidateId, labels = [] }, actor) {
  const c = await getCandidate(paths, candidateId);
  if (!c) throw new Error('Candidate not found: ' + candidateId);

  const target = transitionForLabels(labels);
  if (!target) return { applied: false, action: 'none', candidateId, reason: 'no decision label' };

  // Idempotent: if already resolved, do nothing.
  const TERMINAL = [QueueStatus.APPROVED, QueueStatus.PUBLISHING, QueueStatus.PUBLISHED, QueueStatus.REJECTED];
  if (TERMINAL.includes(c.status) && c.status !== QueueStatus.NEEDS_CHANGES) {
    return { applied: false, action: 'none', candidateId, reason: 'already ' + c.status };
  }

  if (target === QueueStatus.REJECTED) {
    await rejectCandidate(paths, candidateId, actor, 'Rejected via GitHub label');
    return { applied: true, action: 'rejected', candidateId };
  }
  if (target === QueueStatus.NEEDS_CHANGES) {
    await requestChanges(paths, candidateId, actor, ['Changes requested via GitHub label']);
    return { applied: true, action: 'needs_changes', candidateId };
  }
  if (target === QueueStatus.APPROVED) {
    const { product } = await approveCandidate(paths, candidateId, actor, { note: 'Approved via GitHub label' });
    // Approval materializes a hidden draft; publishing remains a deliberate step.
    return { applied: true, action: 'approved', candidateId, productId: product.id };
  }
  return { applied: false, action: 'none', candidateId };
}
