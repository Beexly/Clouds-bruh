import { createPaths } from '../lib/paths.mjs';
import { loadQueue } from '../queue/store.mjs';
import { issuePayloadFor } from '../queue/mirror-github.mjs';
import { QueueStatus } from '../model/enums.mjs';

const paths = createPaths(process.cwd());
const cmd = process.argv[2] || 'list';

const MIRRORABLE = [
  QueueStatus.PROPOSED,
  QueueStatus.QUEUED,
  QueueStatus.IN_REVIEW,
  QueueStatus.NEEDS_CHANGES,
];

(async () => {
  const items = await loadQueue(paths);
  const pending = items.filter((i) => MIRRORABLE.includes(i.status) && !i.mirror?.githubIssueNumber);

  if (cmd === 'list' || cmd === 'export') {
    // Emit GitHub-issue payloads for candidates not yet mirrored. The agent
    // runtime creates the issues via the GitHub MCP and records the numbers back.
    console.log(JSON.stringify(pending.map((c) => ({ candidateId: c.id, ...issuePayloadFor(c) })), null, 2));
  } else {
    console.log('Usage: npm run mirror [list]');
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
