import { describe, it, expect } from 'vitest';
import { buildProposalRun } from './drop-grader';
import { planDropActions, type DropProposal } from '@lumera/shared';

const scale: DropProposal = {
  drop_id: 'd1', name: 'Eclipse Hoodie', grade: 'scale', sell_through: 0.8,
  agent: 'forecaster', tool: 'trigger_reorder', input: { drop_id: 'd1', qty: 40 }, reason: 'sell-through 80% — restock 40',
};
const kill: DropProposal = {
  drop_id: 'd2', name: 'Dead Tee', grade: 'kill', sell_through: 0.1,
  agent: 'warden', tool: 'delist_product', input: { drop_id: 'd2' }, reason: 'sell-through 10% — capital is dying',
};

describe('drop-grader proposal → approval-inbox row (pure)', () => {
  it('shapes a scale proposal the cockpit + Approval Loop can consume', () => {
    const r = buildProposalRun(scale);
    expect(r.agent).toBe('forecaster');
    expect(r.status).toBe('awaiting_approval');
    expect(r.escalated).toBe(true);
    expect(r.pending_actions[0]).toEqual({ tool: 'trigger_reorder', input: { drop_id: 'd1', qty: 40 } });
    // cockpit derives the inbox reason from a decision line starting with ESCALATE
    expect(r.decisions[0].startsWith('ESCALATE →')).toBe(true);
    // dedup keys
    expect(r.input).toMatchObject({ source: 'drop-grader', drop_id: 'd1', grade: 'scale' });
    expect(r.finished_at).toBeNull();
  });

  it('routes a kill proposal to the Warden / delist gate', () => {
    const r = buildProposalRun(kill);
    expect(r.agent).toBe('warden');
    expect(r.pending_actions[0].tool).toBe('delist_product');
  });

  it('every gated tool it emits is a real escalation action (end-to-end with the planner)', () => {
    const proposals = planDropActions([
      { id: 'a', units_total: 20, units_remaining: 2, days_live: 8 }, // scale
      { id: 'b', units_total: 20, units_remaining: 19, days_live: 8 }, // kill
    ]);
    for (const p of proposals) {
      const r = buildProposalRun(p);
      expect(['forecaster', 'warden']).toContain(r.agent);
      expect(['trigger_reorder', 'delist_product']).toContain(r.pending_actions[0].tool);
    }
  });
});
