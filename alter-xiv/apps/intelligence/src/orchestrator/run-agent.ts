import Anthropic from '@anthropic-ai/sdk';
import { AGENTS, type AgentDef } from '../agents';
import { toolsFor } from '../tools';
import { Ledger } from '../memory/ledger';
import type { AgentRun } from '@alterxiv/shared';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Run one agent against a trigger. The loop:
 *  1. read Ledger history (the agent learns from its own past)
 *  2. Claude tool-use loop over the agent's least-privilege tools
 *  3. ESCALATION GATE — any action in def.escalation is queued for Garrett, never auto-executed
 *  4. self-audit — the agent verifies its own output (verified, not assumed)
 *  5. record run + outcome to the Ledger
 */
export async function runAgent(name: string, trigger: AgentRun['trigger'], input: unknown) {
  const def: AgentDef = AGENTS[name];
  if (!def) throw new Error(`Unknown agent: ${name}`);

  const history = await Ledger.history(def.name, 20);
  const tools = toolsFor(def.tools);
  const decisions: string[] = [];
  const toolsUsed: string[] = [];
  let escalated = false;

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: JSON.stringify({ trigger, input, recent_runs: history }) },
  ];

  // Tool-use loop (bounded). Real impl mirrors claude-cookbooks tool-use pattern.
  for (let step = 0; step < 12; step++) {
    const res = await anthropic.messages.create({
      model: def.model,
      max_tokens: 4096,
      system: def.systemPrompt + `\n\nSELF-AUDIT before finishing: ${def.selfAudit}`,
      tools: tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema as any })),
      messages,
    });

    const toolUses = res.content.filter((c) => c.type === 'tool_use');
    if (toolUses.length === 0) break;

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses as any[]) {
      toolsUsed.push(tu.name);
      if (def.escalation.includes(tu.name) || def.escalation.includes(tu.input?.action)) {
        escalated = true;
        decisions.push(`ESCALATE → ${tu.name} queued for Garrett's approval (not executed)`);
        results.push({ type: 'tool_result', tool_use_id: tu.id, content: 'QUEUED_FOR_APPROVAL' });
        continue;                       // hard gate: never auto-run escalation actions
      }
      const out = await toolsFor([tu.name])[0].run(tu.input);
      decisions.push(`${tu.name}(${JSON.stringify(tu.input)})`);
      results.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(out) });
    }
    messages.push({ role: 'assistant', content: res.content });
    messages.push({ role: 'user', content: results });
  }

  const run: AgentRun = {
    id: crypto.randomUUID(), agent: def.name, trigger, input, output: messages.at(-1)?.content,
    tools_used: toolsUsed, decisions, status: escalated ? 'awaiting_approval' : 'success',
    escalated, started_at: new Date().toISOString(), finished_at: new Date().toISOString(),
  };
  await Ledger.record(run);
  return run;
}
