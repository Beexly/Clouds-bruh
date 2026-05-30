import { createPaths } from '../lib/paths.mjs';
import { runAgent } from '../agents/runtime.mjs';

const paths = createPaths(process.cwd());

// One cadence tick across the autonomy roster, in dependency order.
const ORDER = ['sourcing', 'catalog', 'pricing', 'imagery', 'restock', 'orders', 'qa', 'support'];

const run = async () => {
  for (const name of ORDER) {
    const opts = { trigger: 'cadence' };
    if (name === 'sourcing') opts.count = 2; // modest per-tick proposal volume
    try {
      const { task, result } = await runAgent(name, paths, opts);
      console.log(`[${name}] ${task.status} — ${result.notes}`);
    } catch (e) {
      console.log(`[${name}] failed — ${e.message}`);
    }
  }
};

run();
