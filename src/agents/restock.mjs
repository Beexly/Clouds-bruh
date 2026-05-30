import { scanForRestock, proposeRestocks } from '../restock/loop.mjs';

export const meta = { role: 'restock' };

/** Restock agent: detect low inventory, write restock candidates to the queue. */
export async function run(paths, ctx, opts = {}) {
  const signals = await scanForRestock(paths);
  const produced = await proposeRestocks(paths, signals, opts);
  return {
    producedCandidateIds: produced,
    notes: `${signals.length} low-stock signal(s), ${produced.length} restock candidate(s) queued`,
  };
}
