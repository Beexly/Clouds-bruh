import { createPaths } from '../lib/paths.mjs';
import { detectTrends } from '../trends/detect.mjs';
import { proposeTrends } from '../trends/propose.mjs';

const paths = createPaths(process.cwd());
const cmd = process.argv[2] || 'list';
const count = process.argv[3] ? Number(process.argv[3]) : 10;

const pct = (x) => (x * 100).toFixed(0);

(async () => {
  if (cmd === 'list' || cmd === 'detect') {
    const { ranked } = detectTrends();
    console.log(`Eclipse trend radar — ${ranked.length} on-brand opportunity(ies):\n`);
    for (const t of ranked) {
      console.log(`  ${pct(t.score).padStart(3)}/100  ${t.trajectory.padEnd(10)} conf ${pct(t.confidence)}%  ${t.term}`);
    }
    console.log('');
  } else if (cmd === 'propose') {
    const { producedCandidateIds, ranked } = await proposeTrends(paths, { count });
    console.log(`Queued ${producedCandidateIds.length} of ${ranked.length} trend opportunity(ies) for review.`);
    for (const id of producedCandidateIds) console.log('  ' + id);
  } else {
    console.log('Usage: npm run trends [list | propose [count]]');
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
