import { getCandidate, saveCandidate } from './store.mjs';
import { applyTransition } from './transitions.mjs';
import { QueueStatus } from '../model/enums.mjs';
import { evaluateLaunchGates } from '../scoring/launch-gate.mjs';
import { mediaScore } from '../scoring/media-score.mjs';
import { createProduct } from '../model/product.mjs';
import { upsertProduct, getProductByCandidate } from '../catalog/store.mjs';
import { publishProduct } from '../catalog/publish.mjs';
import { makeEvent, appendEvent } from '../catalog/events.mjs';
import { renderStorefront } from '../storefront/render.mjs';
import { now } from '../lib/clock.mjs';
import { actorLabel } from '../lib/actor.mjs';

/**
 * Human-gated review orchestrations. Used by both the CLI and the integration
 * test, so the exact same logic that an operator drives is what the tests prove.
 * Approval and publish are deliberately distinct steps.
 */

function draftFromCandidate(c) {
  const spec = c.payload?.product || {};
  return createProduct({
    ...spec,
    media: c.imagery || [],
    origin: { source: 'agent', candidateId: c.id, agent: c.proposedBy?.agent },
  });
}

export async function openForReview(paths, id, actor) {
  let c = await getCandidate(paths, id);
  if (!c) throw new Error('Candidate not found: ' + id);
  if (c.status === QueueStatus.QUEUED) {
    c = applyTransition(c, QueueStatus.IN_REVIEW, actor);
    await saveCandidate(paths, c);
  }
  return c;
}

export async function approveCandidate(paths, id, actor, opts = {}) {
  let c = await getCandidate(paths, id);
  if (!c) throw new Error('Candidate not found: ' + id);

  // At approval the operator confirms the candidate's imagery.
  c = { ...c, imagery: (c.imagery || []).map((m) => ({ ...m, approved: true })) };
  const draft = draftFromCandidate(c);
  const gate = evaluateLaunchGates(draft, { humanApproved: true });
  c = {
    ...c,
    gate,
    scores: { ...c.scores, media: mediaScore(c.imagery), overall: gate.score },
  };
  if (!gate.passed) {
    await saveCandidate(paths, c); // persist updated blockers for the board
    throw new Error('Cannot approve — unmet gates: ' + gate.blockers.join(', '));
  }

  // Walk QUEUED → IN_REVIEW → APPROVED (only a human may reach APPROVED).
  if (c.status === QueueStatus.QUEUED) c = applyTransition(c, QueueStatus.IN_REVIEW, actor);
  c = applyTransition(c, QueueStatus.APPROVED, actor, { note: opts.note || 'approved' });
  await saveCandidate(paths, c);

  // Materialize an approved DRAFT product (still hidden/out-of-stock until publish).
  const product = createProduct({ ...draft, approvedBy: actorLabel(actor), approvedAt: now() });
  await upsertProduct(paths, product);
  await appendEvent(paths, makeEvent('candidate.approved', { candidateId: id, productId: product.id }, actorLabel(actor)));
  return { candidate: c, product };
}

export async function publishCandidate(paths, id, actor, opts = {}) {
  let c = await getCandidate(paths, id);
  if (!c) throw new Error('Candidate not found: ' + id);
  if (c.status !== QueueStatus.APPROVED) {
    throw new Error('Candidate must be approved before publishing (is ' + c.status + ')');
  }
  const product = await getProductByCandidate(paths, id);
  if (!product) throw new Error('No materialized product for candidate ' + id);

  c = applyTransition(c, QueueStatus.PUBLISHING, actor);
  await saveCandidate(paths, c);
  const published = await publishProduct(paths, product.id, actor, {
    humanApproved: true,
    stock: Number.isFinite(opts.stock) ? opts.stock : 25,
  });
  c = applyTransition(c, QueueStatus.PUBLISHED, actor);
  await saveCandidate(paths, c);
  await appendEvent(paths, makeEvent('candidate.published', { candidateId: id, productId: product.id }, actorLabel(actor)));
  await renderStorefront(paths);
  return { candidate: c, product: published };
}

export async function rejectCandidate(paths, id, actor, note) {
  let c = await getCandidate(paths, id);
  if (!c) throw new Error('Candidate not found: ' + id);
  c = applyTransition(c, QueueStatus.REJECTED, actor, { note: note || 'rejected' });
  await saveCandidate(paths, c);
  return c;
}

export async function requestChanges(paths, id, actor, changesRequested) {
  let c = await getCandidate(paths, id);
  if (!c) throw new Error('Candidate not found: ' + id);
  if (c.status === QueueStatus.QUEUED) c = applyTransition(c, QueueStatus.IN_REVIEW, actor);
  const changes = changesRequested && changesRequested.length ? changesRequested : ['Revise and resubmit'];
  c = applyTransition(c, QueueStatus.NEEDS_CHANGES, actor, { changesRequested: changes });
  await saveCandidate(paths, c);
  return c;
}
