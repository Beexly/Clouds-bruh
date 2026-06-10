import { describe, it, expect } from 'vitest';
import { isGated, executeApprovedAction } from './run-agent';
import { AGENTS } from '../agents';

/**
 * The Approval Execution Loop — the founder's decision must actually DO something, safely:
 * gated actions (and only gated actions) execute with founder authority; abstract directives are
 * recorded durably; and the path needs no ANTHROPIC_API_KEY (approvals work with the LLM asleep).
 */
describe('escalation gate (pure)', () => {
  it('gates by tool name and by input.action; passes ordinary tools', () => {
    expect(isGated(AGENTS.artisan, 'image_write')).toBe(true);
    expect(isGated(AGENTS.curator, 'medusa_admin_write', { action: 'publish_product' })).toBe(true);
    expect(isGated(AGENTS.curator, 'dataset_query')).toBe(false);
  });
});

describe('executeApprovedAction', () => {
  it('executes an approved gated tool that resolves in the registry', async () => {
    const run = await executeApprovedAction({
      agent: 'artisan',
      tool: 'image_write',
      input: { product_id: 'prod_test_1' },
      approval_id: 'apr_test',
    });
    expect(run.trigger).toBe('approval');
    expect(run.status).toBe('success');
    expect(run.tools_used).toEqual(['image_write']);
    expect(run.decisions.join(' ')).toContain('FOUNDER-APPROVED');
    expect((run.output as any).product_id).toBe('prod_test_1');
  });

  it('records an abstract gated directive durably (no registry tool to run)', async () => {
    const run = await executeApprovedAction({
      agent: 'curator',
      tool: 'publish_drop',
      input: { drop: 'd1' },
    });
    expect(run.status).toBe('success');
    expect(run.tools_used).toEqual([]);
    expect(run.decisions.join(' ')).toContain('FOUNDER-APPROVED DIRECTIVE');
    expect((run.output as any).directive).toBe('publish_drop');
  });

  it('refuses non-gated tools — approval can never become arbitrary execution', async () => {
    await expect(
      executeApprovedAction({ agent: 'artisan', tool: 'higgsfield', input: {} })
    ).rejects.toThrow(/not_a_gated_action/);
  });

  it('refuses unknown agents', async () => {
    await expect(executeApprovedAction({ agent: 'nobody', tool: 'x' })).rejects.toThrow(/unknown_agent/);
  });
});
