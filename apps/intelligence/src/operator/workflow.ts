import type { AgentRun } from '@lumera/shared';

/**
 * G03 — durable agent-workflow grammar (Temporal/LangGraph pattern, no dependency).
 * Every autonomous action moves through an explicit, auditable lifecycle. Human-in-the-loop is
 * a first-class state: anything privileged parks at `needs_approval`/`escalated` until the
 * founder acts. Transitions are guarded so the control plane can never skip the approval gate.
 */
export const WORKFLOW_STATES = [
  'proposed',      // agent produced a draft
  'needs_approval', // privileged → parked for the founder
  'approved',      // founder approved (or no approval needed)
  'running',       // executing
  'validating',    // self-audit / gate check
  'escalated',     // gate held it for the founder
  'complete',      // validated, done
  'failed',        // errored
  'rolled_back',   // compensated after failure
] as const;
export type WorkflowState = (typeof WORKFLOW_STATES)[number];

// Legal forward transitions. The approval gate (proposed → needs_approval → approved) cannot be
// bypassed for privileged work; only auto-approvable work goes proposed → approved directly.
const TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  proposed: ['needs_approval', 'approved', 'failed'],
  needs_approval: ['approved', 'escalated', 'failed'],
  approved: ['running', 'failed'],
  running: ['validating', 'failed'],
  validating: ['complete', 'escalated', 'failed'],
  escalated: ['approved', 'complete', 'failed'], // founder resolves
  complete: [],
  failed: ['rolled_back'],
  rolled_back: [],
};

export function canTransition(from: WorkflowState, to: WorkflowState): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function isTerminal(s: WorkflowState): boolean {
  return TRANSITIONS[s]?.length === 0;
}

/**
 * Map a completed AgentRun (the existing status/escalated fields) into the explicit workflow
 * state, so the Cockpit + approval inbox can show the real lifecycle position of each run.
 */
export function classifyRun(run: Pick<AgentRun, 'status' | 'escalated'>): WorkflowState {
  if (run.escalated || run.status === 'awaiting_approval') return 'escalated';
  if (run.status === 'error') return 'failed';
  if (run.status === 'success') return 'complete';
  return 'running';
}
