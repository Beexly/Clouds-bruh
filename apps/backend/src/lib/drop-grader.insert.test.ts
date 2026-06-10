import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * insertProposalRun must work on a FRESH Cloud DB where the intelligence Ledger hasn't yet created
 * agent_run / its pending_actions column. We mock the db layer and assert it ensures the table before
 * inserting, and that it stays best-effort (returns false, never throws) on a DB error.
 */
// vi.hoisted so the mocks exist when the hoisted vi.mock factory runs (the factory references
// ensureAgentRunTable directly, not lazily).
const { query, ensureAgentRunTable } = vi.hoisted(() => ({ query: vi.fn(), ensureAgentRunTable: vi.fn() }));
vi.mock('./lumera-db', () => ({ pool: () => ({ query }), ensureAgentRunTable }));

import { insertProposalRun, buildProposalRun } from './drop-grader';
import type { DropProposal } from '@alterxiv/shared';

const proposal: DropProposal = {
  drop_id: 'd1', name: 'Eclipse Hoodie', grade: 'scale', sell_through: 0.8,
  agent: 'forecaster', tool: 'trigger_reorder', input: { drop_id: 'd1', qty: 40 },
  reason: 'sell-through 80% — restock 40',
};

beforeEach(() => {
  query.mockReset();
  ensureAgentRunTable.mockReset();
});

describe('insertProposalRun (fresh-DB safe)', () => {
  it('ensures agent_run + pending_actions exists before the INSERT', async () => {
    ensureAgentRunTable.mockResolvedValue(undefined);
    query.mockResolvedValue({ rowCount: 1 });

    const ok = await insertProposalRun(buildProposalRun(proposal));

    expect(ensureAgentRunTable).toHaveBeenCalledTimes(1);
    expect(ok).toBe(true);
    const [sql] = query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO agent_run/);
    expect(sql).toMatch(/pending_actions/);
  });

  it('stays best-effort: returns false (never throws) when the DB write fails', async () => {
    ensureAgentRunTable.mockResolvedValue(undefined);
    query.mockRejectedValue(new Error('db down'));
    await expect(insertProposalRun(buildProposalRun(proposal))).resolves.toBe(false);
  });
});
