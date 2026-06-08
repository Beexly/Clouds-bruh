import Anthropic from '@anthropic-ai/sdk';
import { AGENTS, type AgentDef } from '../agents';
import { toolsFor } from '../tools';
import { Ledger } from '../memory/ledger';
import type { AgentRun } from '@alterxiv/shared';

/**
 * Assemble the system prompt sent to Claude for an agent run.
 *
 * Pure + side-effect-free so it can be unit-tested (see agents/skills.test.ts). Layers, in order:
 *   1. the agent's identity/mission prompt
 *   2. its named e-commerce playbooks (SKILLS.md) — surfaced so the model actually applies them
 *   3. the falsifiable self-audit it must pass before finishing ("verified, not assumed")
 */
export function buildSystemPrompt(def: AgentDef): string {
  let prompt = def.systemPrompt;
  if (def.skills?.length) {
    prompt += `\n\nPlaybooks you apply: ${def.skills.join(', ')}`;
  }
  prompt += `\n\nSELF-AUDIT before finishing: ${def.selfAudit}`;
  return prompt;
}

/**
 * Run one agent against a trigger.
 *  1. read Ledger history (the agent learns from its own past)
 *  2. Claude tool-use loop over the agent's least-privilege tools
 *  3. ESCALATION GATE — any action in def.escalation is queued for Garrett, never auto-executed
 *  4. self-audit — the agent verifies its own output (verified, not assumed)
 *  5. record run + outcome to the Ledger
 */
export async function runAgent(name: string, trigger: AgentRun['trigger'], input: unknown) {
  const def: AgentDef | undefined = AGENTS[name];
  if (!def) throw new Error(`Unknown agent: ${name}`);

  const history = await Ledger.history(def.name, 10).catch(() => []);
  const tools = toolsFor(def.tools);
  const decisions: string[] = [];
  const toolsUsed: string[] = [];
  let escalated = false;
  let output: unknown = null;

  console.log(`[${def.name}] Running: trigger=${trigger}`);

  // If no API key, run in mock mode: execute tools but skip Claude
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'sk-ant-...') {
    decisions.push('[mock mode — no ANTHROPIC_API_KEY configured]');
    const run: AgentRun = {
      id: crypto.randomUUID(), agent: def.name, trigger, input,
      output: { mock: true, message: `${def.name} would run here with Claude. Set ANTHROPIC_API_KEY to enable.` },
      tools_used: [], decisions,
      status: 'success', escalated: false,
      started_at: new Date().toISOString(), finished_at: new Date().toISOString(),
    };
    await Ledger.record(run);
    console.log(`[${def.name}] Mock run complete (no API key)`);
    return run;
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: JSON.stringify({ trigger, input, recent_runs: history.slice(0, 3) }) },
  ];

  // Tool-use loop (bounded at 12 steps)
  for (let step = 0; step < 12; step++) {
    const res = await anthropic.messages.create({
      model: def.model,
      max_tokens: 4096,
      system: buildSystemPrompt(def),
      tools: tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema as any })),
      messages,
    });

    output = res.content;
    const toolUses = res.content.filter((c) => c.type === 'tool_use');
    if (toolUses.length === 0) break;

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses as any[]) {
      toolsUsed.push(tu.name);
      // ESCALATION GATE: hard stop for privileged actions
      if (def.escalation.includes(tu.name) || def.escalation.includes(tu.input?.action)) {
        escalated = true;
        decisions.push(`ESCALATE → ${tu.name} queued for Garrett's approval (NOT executed)`);
        results.push({ type: 'tool_result', tool_use_id: tu.id, content: 'QUEUED_FOR_APPROVAL: This action requires human approval. Not executed.' });
        continue;
      }
      const tool = toolsFor([tu.name])[0];
      if (!tool) {
        decisions.push(`WARN: unknown tool ${tu.name}`);
        results.push({ type: 'tool_result', tool_use_id: tu.id, content: `Tool not found: ${tu.name}` });
        continue;
      }
      try {
        const out = await tool.run(tu.input);
        decisions.push(`${tu.name}(${JSON.stringify(tu.input).slice(0, 80)})`);
        results.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(out) });
      } catch (e: any) {
        decisions.push(`${tu.name} ERROR: ${e.message?.slice(0, 60)}`);
        results.push({ type: 'tool_result', tool_use_id: tu.id, content: `Error: ${e.message}` });
      }
    }
    messages.push({ role: 'assistant', content: res.content });
    messages.push({ role: 'user', content: results });
  }

  const run: AgentRun = {
    id: crypto.randomUUID(),
    agent: def.name,
    trigger,
    input,
    output,
    tools_used: toolsUsed,
    decisions,
    status: escalated ? 'awaiting_approval' : 'success',
    escalated,
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
  };
  await Ledger.record(run);
  console.log(`[${def.name}] Run complete: status=${run.status}, tools=${toolsUsed.join(',') || 'none'}, escalated=${escalated}`);
  return run;
}
