import * as sourcing from './sourcing.mjs';
import * as restock from './restock.mjs';
import * as qa from './qa-governance.mjs';
import * as pricing from './pricing-agent.mjs';
import * as orders from './orders-agent.mjs';
import * as imagery from './imagery-agent.mjs';
import * as support from './support-agent.mjs';
import * as catalog from './catalog-agent.mjs';
import * as trends from './trends-agent.mjs';
import { buildContext } from './context.mjs';
import { createTask } from '../model/agent-task.mjs';
import { appendNdjson } from '../lib/ndjson.mjs';
import { now } from '../lib/clock.mjs';

const RUNNERS = { sourcing, restock, qa, pricing, orders, imagery, support, catalog, trends };

export function runnableAgents() {
  return Object.keys(RUNNERS);
}

/** Run a single agent tick: build context, execute, record a Task. */
export async function runAgent(name, paths, opts = {}) {
  const mod = RUNNERS[name];
  if (!mod || typeof mod.run !== 'function') {
    throw new Error('Unknown or non-runnable agent: ' + name);
  }
  const ctx = await buildContext(paths, opts);
  const task = createTask({ agentId: 'agent.' + name, trigger: opts.trigger || 'manual', runId: opts.runId });
  try {
    const result = await mod.run(paths, ctx, { ...opts, runId: task.runId });
    const done = {
      ...task,
      status: 'succeeded',
      finishedAt: now(),
      producedCandidateIds: result.producedCandidateIds || [],
      emittedEvents: result.emittedEvents || 0,
      notes: result.notes,
    };
    await appendNdjson(paths.agentRuns, done);
    return { task: done, result };
  } catch (e) {
    const failed = { ...task, status: 'failed', finishedAt: now(), error: String(e?.message || e) };
    await appendNdjson(paths.agentRuns, failed);
    throw e;
  }
}
