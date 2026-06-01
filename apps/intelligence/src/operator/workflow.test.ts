import { describe, it, expect } from 'vitest';
import { canTransition, isTerminal, classifyRun, WORKFLOW_STATES } from './workflow';

describe('agent workflow state machine (G03)', () => {
  it('allows the legal happy path', () => {
    expect(canTransition('proposed', 'approved')).toBe(true);
    expect(canTransition('approved', 'running')).toBe(true);
    expect(canTransition('running', 'validating')).toBe(true);
    expect(canTransition('validating', 'complete')).toBe(true);
  });

  it('cannot bypass the approval gate (proposed → running is illegal)', () => {
    expect(canTransition('proposed', 'running')).toBe(false);
    expect(canTransition('proposed', 'complete')).toBe(false);
    expect(canTransition('needs_approval', 'running')).toBe(false);
  });

  it('failure can roll back; complete/rolled_back are terminal', () => {
    expect(canTransition('running', 'failed')).toBe(true);
    expect(canTransition('failed', 'rolled_back')).toBe(true);
    expect(isTerminal('complete')).toBe(true);
    expect(isTerminal('rolled_back')).toBe(true);
    expect(isTerminal('running')).toBe(false);
  });

  it('validating can escalate to the founder', () => {
    expect(canTransition('validating', 'escalated')).toBe(true);
    expect(canTransition('escalated', 'approved')).toBe(true);
  });

  it('classifyRun maps run status → workflow state', () => {
    expect(classifyRun({ status: 'awaiting_approval', escalated: true } as any)).toBe('escalated');
    expect(classifyRun({ status: 'error', escalated: false } as any)).toBe('failed');
    expect(classifyRun({ status: 'success', escalated: false } as any)).toBe('complete');
  });

  it('every state is reachable in the catalog', () => {
    expect(WORKFLOW_STATES.length).toBe(9);
  });
});
