import type { AgentRun, Audit } from '@alterxiv/shared';

/**
 * The Ledger — shared agent memory + audit log. Every agent reads relevant history
 * before acting and writes its decisions + outcomes after. This is how the
 * CONGREGATION learns from itself. Backed by Postgres (agent_run, audit tables).
 */
export const Ledger = {
  async record(run: AgentRun): Promise<void> { /* TODO: insert agent_run */ },
  async outcome(runId: string, outcome: string): Promise<void> { /* TODO: update agent_run.outcome */ },
  async history(agent: string, limit = 50): Promise<AgentRun[]> { return []; },
  async audit(a: Audit): Promise<void> { /* TODO: insert audit */ },
  async openAudits(severity?: Audit['severity']): Promise<Audit[]> { return []; },
};
