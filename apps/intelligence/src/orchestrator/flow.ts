/**
 * Composable multi-agent flow primitives — adopted from Open Agents Builder's model
 * (itself from Anthropic's "Building Effective Agents"). UPGRADE to the orchestrator:
 * compose agents into reliable workflows instead of one-shot calls.
 *
 *   sequence([a, b, c])      run in order, piping output→input
 *   parallel([a, b])         run concurrently, collect results
 *   oneOf(router, {a, b})    route to one branch by a classifier
 *   evaluator(worker, judge) worker produces, judge critiques, loop until pass (self-audit at flow level)
 *   forEach(items, a)        fan out an agent over a list
 *
 * Example — a drop launch:
 *   sequence([
 *     curator,                       // propose products (DRAFT)
 *     parallel([artisan, scribe]),   // imagery + SEO in parallel
 *     evaluator(herald, brandJudge), // campaign copy, looped until on-brand
 *   ])  // → lands in Garrett's approval queue (escalation gate still applies)
 */
import { runAgent } from './run-agent';

type Node = (input: unknown) => Promise<unknown>;
export const agent = (name: string): Node => (input) => runAgent(name, 'manual', input);

export const sequence = (steps: Node[]): Node => async (input) => {
  let acc = input;
  for (const step of steps) acc = await step(acc);
  return acc;
};
export const parallel = (steps: Node[]): Node => async (input) =>
  Promise.all(steps.map((s) => s(input)));
export const forEach = (items: unknown[], step: Node): Node => async () =>
  Promise.all(items.map((it) => step(it)));
export const oneOf = (router: (i: unknown) => Promise<string>, branches: Record<string, Node>): Node =>
  async (input) => branches[await router(input)](input);
export const evaluator = (worker: Node, judge: (out: unknown) => Promise<boolean>, maxLoops = 3): Node =>
  async (input) => {
    let out = await worker(input);
    for (let i = 0; i < maxLoops && !(await judge(out)); i++) out = await worker(out);
    return out;
  };
