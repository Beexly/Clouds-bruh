import { createPaths } from '../lib/paths.mjs';
import { buildImageryPlan } from '../imagery/plan.mjs';

const paths = createPaths(process.cwd());
const limit = process.argv[2] ? Number(process.argv[2]) : undefined;

(async () => {
  const plan = await buildImageryPlan(paths, { limit });
  // Emit the imagery generation plan as JSON. The image MCP fulfills these;
  // nothing here calls it or spends credits.
  console.log(JSON.stringify(plan, null, 2));
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
