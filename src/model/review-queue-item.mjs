import { QueueStatus, CandidateKind, Currency, values } from './enums.mjs';
import { candidateId, idempotencyKey } from './ids.mjs';
import { assertValid } from './validate.mjs';
import { now } from '../lib/clock.mjs';
import { int } from '../lib/num.mjs';

const schema = {
  kind: { required: true, enum: values(CandidateKind) },
  status: { required: true, enum: values(QueueStatus) },
  title: { required: true, type: 'string' },
};

/**
 * ReviewQueueItem — the safety-gate record and heart of the system.
 * Agents may only ever create these; humans approve/publish them.
 * `governance.autoApprovable` is a hard, always-false invariant.
 */
export function createCandidate(input = {}) {
  const kind = input.kind || CandidateKind.PRODUCT;
  const title = input.title || 'Untitled candidate';
  const payload = input.payload || {};
  const idem = input.idempotencyKey || idempotencyKey({ kind, title, payload });
  const status = input.status || QueueStatus.PROPOSED;
  const at = input.createdAt || now();
  const actor = input.proposedBy?.agent ? 'agent:' + input.proposedBy.agent : 'system';

  const item = {
    id: input.id || candidateId([kind, idem]),
    kind,
    status,
    title,
    summary: input.summary || '',
    proposedBy: input.proposedBy || { agent: 'unknown', runId: 'n/a' },
    payload,
    sourceLinks: input.sourceLinks || [],
    imagery: input.imagery || [],
    costs: {
      unitCostMinor: int(input.costs?.unitCostMinor, 0),
      suggestedListMinor: int(input.costs?.suggestedListMinor, 0),
      marginPct: int(input.costs?.marginPct, 0),
      currency: input.costs?.currency || Currency.USD,
    },
    scores: {
      readiness: int(input.scores?.readiness, 0),
      media: int(input.scores?.media, 0),
      supplier: int(input.scores?.supplier, 0),
      margin: int(input.scores?.margin, 0),
      overall: int(input.scores?.overall, 0),
    },
    gate: input.gate || { passed: false, blockers: ['not evaluated'] },
    governance: { autoApprovable: false }, // INVARIANT — never auto-approvable
    mirror: input.mirror || {},
    decision: input.decision,
    history: input.history || [{ from: null, to: status, at, actor }],
    idempotencyKey: idem,
    createdAt: at,
    updatedAt: input.updatedAt || at,
    expiresAt: input.expiresAt,
  };
  assertValid(item, schema, 'review-queue-item');
  item.governance.autoApprovable = false; // re-assert even if caller tampered
  return item;
}
