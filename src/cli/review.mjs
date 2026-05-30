import { createPaths } from '../lib/paths.mjs';
import { loadQueue } from '../queue/store.mjs';
import { boardFrom } from '../queue/board.mjs';
import {
  openForReview,
  approveCandidate,
  publishCandidate,
  rejectCandidate,
  requestChanges,
} from '../queue/review-actions.mjs';
import { human } from '../lib/actor.mjs';

const paths = createPaths(process.cwd());
const [cmd, id, ...rest] = process.argv.slice(2);
const actor = human('operator');
const money = (m) => '$' + ((m || 0) / 100).toFixed(2);

const main = async () => {
  switch (cmd) {
    case undefined:
    case 'list': {
      const board = boardFrom(await loadQueue(paths));
      for (const col of board.columns) {
        if (!col.items.length) continue;
        console.log(`\n${col.label} (${col.items.length})`);
        for (const i of col.items) {
          console.log(`  ${i.id}  ${i.title}  [gate ${i.gate?.passed ? 'PASS' : 'blocked'}]  ${money(i.costs?.suggestedListMinor)}`);
          for (const l of i.sourceLinks || []) console.log(`      ↳ ${l.label}: ${l.url}`);
        }
      }
      console.log('');
      break;
    }
    case 'open': {
      const c = await openForReview(paths, id, actor);
      console.log(`opened ${c.id} → ${c.status}`);
      break;
    }
    case 'approve': {
      const { candidate, product } = await approveCandidate(paths, id, actor);
      console.log(`approved ${candidate.id} → product ${product.id} (draft, hidden). Run "review publish ${candidate.id}" to go live.`);
      break;
    }
    case 'publish': {
      const stock = rest[0] ? Number(rest[0]) : 25;
      const { candidate, product } = await publishCandidate(paths, id, actor, { stock });
      console.log(`published ${candidate.id} → "${product.title}" is LIVE (${product.stockState}, ${stock} units).`);
      break;
    }
    case 'reject': {
      const c = await rejectCandidate(paths, id, actor, rest.join(' ') || 'rejected');
      console.log(`rejected ${c.id}`);
      break;
    }
    case 'changes': {
      const c = await requestChanges(paths, id, actor, [rest.join(' ') || 'Revise and resubmit']);
      console.log(`needs changes ${c.id}`);
      break;
    }
    default:
      console.log('Usage: npm run review [list|open|approve|publish|reject|changes] <id> [note|stock]');
  }
};

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
