import { AGENTS } from '../agents';
import { runAgent } from '../orchestrator/run-agent';
import { Ledger } from '../memory/ledger';
import { runIntrospection } from '../introspection';
import { classifyRun, type WorkflowState } from './workflow';
import type { AgentRun } from '@alterxiv/shared';

/**
 * OPERATOR — the manager agent (crewAI hierarchical pattern).
 * Runs the daily loop so the founder approves, not operates:
 *   1. PLAN   — read company state, decide which departments run today, in order.
 *   2. DELEGATE — run each department via runAgent (least-privilege, escalation gate intact).
 *   3. VALIDATE — check each result against quality gates; a failed gate is a finding, not a ship.
 *   4. AGGREGATE — write one OPERATOR run + a founder inbox of escalations to the Ledger.
 * The OPERATOR never publishes or spends; it delegates and validates. Escalations route up.
 */

interface ValidatedStep {
  agent: string;
  status: AgentRun['status'];
  escalated: boolean;
  gate: 'pass' | 'fail' | 'escalated';
  workflow_state: WorkflowState;
  note: string;
  runId: string;
}

// The daily order of operations — sourcing/curation first, then make, then sell, then account.
const DAILY_PIPELINE = [
  'sourcer',
  'curator',
  'artisan',
  'scribe',
  'herald',
  'oracle_keeper',
  'quartermaster',
  'shepherd',
  'treasurer',
  'analyst',
];

/** Quality gate: did the department return a usable, non-erroring, properly-gated result? */
function validate(run: AgentRun): ValidatedStep {
  const def = AGENTS[run.agent];
  let gate: ValidatedStep['gate'] = 'pass';
  let note = 'ok';

  if (run.escalated || run.status === 'awaiting_approval') {
    gate = 'escalated';
    note = 'output requires founder approval (gate held)';
  } else if (run.status === 'error') {
    gate = 'fail';
    note = 'department errored';
  } else if (!run.output) {
    gate = 'fail';
    note = 'empty output';
  }

  return {
    agent: run.agent,
    status: run.status,
    escalated: run.escalated,
    gate,
    workflow_state: classifyRun(run),
    note: `${def?.department ?? run.agent}: ${note}`,
    runId: run.id,
  };
}

export async function runDailyLoop(opts: { only?: string[] } = {}): Promise<AgentRun> {
  const started = new Date().toISOString();
  const pipeline = opts.only?.length ? opts.only : DAILY_PIPELINE;
  console.log(`[operator] Daily loop start — delegating to ${pipeline.length} departments`);

  const steps: ValidatedStep[] = [];
  const inbox: string[] = []; // founder approval queue

  for (const agent of pipeline) {
    if (!AGENTS[agent]) {
      steps.push({ agent, status: 'error', escalated: false, gate: 'fail', workflow_state: 'failed', note: 'unknown department', runId: '' });
      continue;
    }
    try {
      const run = await runAgent(agent, 'cron', { source: 'operator_daily_loop', date: started });
      const v = validate(run);
      steps.push(v);
      if (v.gate === 'escalated') inbox.push(`${agent}: ${run.decisions.filter((d) => d.startsWith('ESCALATE')).join('; ') || 'awaiting approval'}`);
    } catch (e: any) {
      steps.push({ agent, status: 'error', escalated: false, gate: 'fail', workflow_state: 'failed', note: `threw: ${e.message?.slice(0, 80)}`, runId: '' });
    }
  }

  // Overnight self-audit feeds tomorrow's plan.
  const audit = await runIntrospection().catch(() => ({ total: 0, errors: 0 }));

  const passed = steps.filter((s) => s.gate === 'pass').length;
  const failed = steps.filter((s) => s.gate === 'fail');
  const escalated = steps.filter((s) => s.gate === 'escalated');

  const report: AgentRun = {
    id: crypto.randomUUID(),
    agent: 'operator',
    trigger: 'cron',
    input: { task: 'daily_loop', pipeline },
    output: {
      summary: `${passed}/${steps.length} departments passed · ${escalated.length} escalations · ${failed.length} failures`,
      steps,
      founder_inbox: inbox,
      ledger_health: Ledger.circuitState,
      audit_findings: (audit as any).total ?? 0,
    },
    tools_used: ['delegate', 'validate', 'introspection'],
    decisions: [
      `Delegated to: ${pipeline.join(', ')}`,
      `Validated: ${passed} pass, ${failed.length} fail, ${escalated.length} escalated`,
      ...(inbox.length ? [`FOUNDER INBOX (${inbox.length}): ${inbox.join(' | ')}`] : ['No escalations — nothing needs the founder today']),
      ...failed.map((f) => `FAILED GATE → ${f.note}`),
    ],
    outcome: escalated.length ? `${escalated.length} items awaiting founder approval` : 'loop complete, nothing to approve',
    status: failed.length ? 'error' : escalated.length ? 'awaiting_approval' : 'success',
    escalated: escalated.length > 0,
    started_at: started,
    finished_at: new Date().toISOString(),
  };

  await Ledger.record(report);
  console.log(`[operator] Daily loop complete: ${report.output && (report.output as any).summary}`);
  return report;
}

// Allow `node operator/index.js` / tsx direct invocation for verification.
if (require.main === module) {
  runDailyLoop()
    .then((r) => {
      console.log(JSON.stringify((r.output as any), null, 2));
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
