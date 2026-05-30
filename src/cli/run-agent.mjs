import { createPaths } from '../lib/paths.mjs';
import { runAgent, runnableAgents } from '../agents/runtime.mjs';

const name = process.argv[2];
const paths = createPaths(process.cwd());

if (!name) {
  console.log('Usage: npm run agent <name> [count] [seed]');
  console.log('Agents:', runnableAgents().join(', '));
  process.exit(0);
}

const opts = { trigger: 'manual' };
if (process.argv[3]) opts.count = Number(process.argv[3]);
if (process.argv[4]) opts.seed = Number(process.argv[4]);

runAgent(name, paths, opts)
  .then(({ task, result }) => {
    console.log(`[${name}] ${task.status} — ${result.notes}`);
    if (result.producedCandidateIds?.length) {
      console.log('  queued:', result.producedCandidateIds.join(', '));
    }
  })
  .catch((e) => {
    console.error(`[${name}] ${e.message}`);
    process.exit(1);
  });
