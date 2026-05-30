import { taskId } from './ids.mjs';
import { now } from '../lib/clock.mjs';

export function createAgent(input = {}) {
  return {
    id: input.id,
    role: input.role,
    name: input.name || input.id,
    description: input.description || '',
    inputs: input.inputs || [],
    outputs: input.outputs || [],
    cadence: input.cadence || { kind: 'manual' },
    governance: {
      autonomous: input.governance?.autonomous || [],
      gated: input.governance?.gated || [],
      forbidden: input.governance?.forbidden || [],
    },
    enabled: input.enabled !== false,
  };
}

export function createTask(input = {}) {
  const startedAt = input.startedAt || now();
  return {
    id: input.id || taskId([input.agentId, startedAt]),
    agentId: input.agentId,
    runId: input.runId || 'run_' + startedAt,
    trigger: input.trigger || 'manual',
    startedAt,
    finishedAt: input.finishedAt,
    status: input.status || 'running',
    producedCandidateIds: input.producedCandidateIds || [],
    emittedEvents: input.emittedEvents || 0,
    notes: input.notes,
    error: input.error,
  };
}
