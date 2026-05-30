import { createPaths } from '../lib/paths.mjs';
import { buildStripeSyncPlan } from '../orders/stripe-sync.mjs';

const paths = createPaths(process.cwd());

(async () => {
  const plan = await buildStripeSyncPlan(paths);
  // Emit the request plan as JSON. The Stripe MCP fulfills these in TEST mode;
  // nothing here touches Stripe or spends money.
  console.log(JSON.stringify(plan, null, 2));
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
