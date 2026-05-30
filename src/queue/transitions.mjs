import { QueueStatus, ActorKind } from '../model/enums.mjs';
import { actorLabel } from '../lib/actor.mjs';
import { now } from '../lib/clock.mjs';

const T = QueueStatus;

/** Legal transitions: from → allowed set. */
const ALLOWED = {
  [T.PROPOSED]: new Set([T.QUEUED, T.EXPIRED, T.REJECTED]),
  [T.QUEUED]: new Set([T.IN_REVIEW, T.REJECTED, T.EXPIRED]),
  [T.IN_REVIEW]: new Set([T.NEEDS_CHANGES, T.APPROVED, T.REJECTED]),
  [T.NEEDS_CHANGES]: new Set([T.PROPOSED, T.REJECTED]),
  [T.APPROVED]: new Set([T.PUBLISHING, T.REJECTED]),
  [T.PUBLISHING]: new Set([T.PUBLISHED, T.NEEDS_CHANGES]),
  [T.PUBLISHED]: new Set([]),
  [T.REJECTED]: new Set([]),
  [T.EXPIRED]: new Set([]),
};

/** States an AGENT may never move a candidate into. The literal human gate. */
const HUMAN_ONLY_TARGETS = new Set([T.APPROVED, T.PUBLISHING, T.PUBLISHED]);

export function allowed(from, to, actor) {
  const set = ALLOWED[from];
  if (!set || !set.has(to)) return false;
  if (actor?.kind === ActorKind.AGENT && HUMAN_ONLY_TARGETS.has(to)) return false;
  return true;
}

/**
 * Apply a transition, returning a NEW candidate snapshot. Throws on illegal
 * moves, on approving without a passed gate, and on missing reasons.
 */
export function applyTransition(candidate, to, actor, opts = {}) {
  const from = candidate.status;
  if (!allowed(from, to, actor)) {
    throw new Error(`Illegal queue transition ${from} -> ${to} by ${actor?.kind || 'unknown'}`);
  }
  if (to === T.APPROVED && candidate.gate?.passed !== true) {
    throw new Error('Cannot approve: launch gate not passed');
  }
  if (to === T.REJECTED && !opts.note) {
    throw new Error('Rejection requires a note');
  }
  if (to === T.NEEDS_CHANGES && !(opts.changesRequested && opts.changesRequested.length)) {
    throw new Error('needs_changes requires changesRequested[]');
  }

  const at = now();
  const next = {
    ...candidate,
    status: to,
    updatedAt: at,
    history: [...(candidate.history || []), { from, to, at, actor: actorLabel(actor), note: opts.note }],
  };
  if (actor?.kind === ActorKind.HUMAN || opts.note || opts.changesRequested) {
    next.decision = {
      actor: actorLabel(actor),
      at,
      note: opts.note,
      changesRequested: opts.changesRequested,
    };
  }
  return next;
}

export { ALLOWED, HUMAN_ONLY_TARGETS };
