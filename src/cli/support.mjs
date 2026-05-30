import { createPaths } from '../lib/paths.mjs';
import { loadInbox, draftReplies, sendReply, inboxSummary } from '../support/inbox.mjs';
import { human } from '../lib/actor.mjs';

const paths = createPaths(process.cwd());
const [cmd, id, ...rest] = process.argv.slice(2);

const main = async () => {
  switch (cmd) {
    case undefined:
    case 'list': {
      const s = inboxSummary(await loadInbox(paths));
      console.log(`Support: ${s.total} messages (${JSON.stringify(s.byStatus)})`);
      for (const m of s.recent) {
        console.log(`  ${m.id}  [${m.status}] ${m.intent} — ${m.email}: ${m.subject}`);
        if (m.draft) console.log(`     draft: ${m.draft}`);
      }
      break;
    }
    case 'draft': {
      const n = await draftReplies(paths);
      console.log(`drafted ${n} reply(ies)`);
      break;
    }
    case 'send': {
      const m = await sendReply(paths, id, human('operator'), rest.join(' ') || undefined);
      console.log(`sent ${m.id} to ${m.email}`);
      break;
    }
    default:
      console.log('Usage: npm run support [list | draft | send <id> [override text]]');
  }
};

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
