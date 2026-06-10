import { describe, it, expect } from 'vitest';
import { selectPendingAction } from './approvals';

/**
 * selectPendingAction is the security boundary of the approval path: only an action the agent itself
 * stored in pending_actions may execute on approval. Anything missing/malformed must return null so
 * the endpoint refuses — it must never fall back to executing client-supplied tool/input.
 */
describe('selectPendingAction', () => {
  it('returns the first stored action by default', () => {
    expect(
      selectPendingAction([{ tool: 'trigger_reorder', input: { drop_id: 'd1' } }])
    ).toEqual({ tool: 'trigger_reorder', input: { drop_id: 'd1' } });
  });

  it('selects the nth action by index', () => {
    const actions = [
      { tool: 'a', input: { x: 1 } },
      { tool: 'b', input: { y: 2 } },
    ];
    expect(selectPendingAction(actions, 1)).toEqual({ tool: 'b', input: { y: 2 } });
  });

  it('defaults missing input to {}', () => {
    expect(selectPendingAction([{ tool: 'delist_product' }])).toEqual({ tool: 'delist_product', input: {} });
  });

  it('returns null for a non-array (e.g. a pre-migration DB returning null)', () => {
    expect(selectPendingAction(null)).toBeNull();
    expect(selectPendingAction(undefined)).toBeNull();
    expect(selectPendingAction({ tool: 'x' })).toBeNull();
  });

  it('returns null when the action has no tool (cannot execute a nameless action)', () => {
    expect(selectPendingAction([{ input: { x: 1 } }])).toBeNull();
    expect(selectPendingAction([{ tool: '   ', input: {} }])).toBeNull();
  });

  it('returns null for an out-of-range or negative index', () => {
    expect(selectPendingAction([{ tool: 'a', input: {} }], 5)).toBeNull();
    expect(selectPendingAction([{ tool: 'a', input: {} }], -1)).toEqual({ tool: 'a', input: {} });
  });
});
