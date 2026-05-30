import { createPaths } from '../lib/paths.mjs';
import { rebuildQueueIndex } from '../queue/store.mjs';
import { renderStorefront } from '../storefront/render.mjs';
import { computeLedger } from '../ops/progress.mjs';
import { writeJson } from '../lib/jsonfile.mjs';

const paths = createPaths(process.cwd());

(async () => {
  const idx = await rebuildQueueIndex(paths);
  const ledger = await computeLedger(paths);
  await writeJson(paths.ledger, ledger);
  const sf = await renderStorefront(paths);
  console.log(`Rebuilt — queue index: ${idx.count} candidate(s), ledger: ${ledger.overallPct}%, storefront: ${sf.count} live product(s).`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
