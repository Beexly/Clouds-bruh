import { createPaths } from '../lib/paths.mjs';
import { getCandidate, loadQueue } from '../queue/store.mjs';
import { evaluateStandard, summarize } from '../standard/eclipse-standard.mjs';
import { createProduct } from '../model/product.mjs';

const paths = createPaths(process.cwd());
const id = process.argv[2];

/** Evaluate one queued candidate (product + its copy + its imagery) against the Standard. */
async function evaluateCandidate(c) {
  const spec = c.payload?.product;
  const lines = [];
  if (spec) {
    const product = createProduct({ ...spec, media: c.imagery || [] });
    lines.push(summarize(evaluateStandard('product', product, { humanApproved: false })));
    lines.push(summarize(evaluateStandard('copy', {
      title: spec.title, subtitle: spec.subtitle, description: spec.description,
      bulletBenefits: spec.bulletBenefits, priceMinor: spec.pricing?.listMinor,
    })));
    lines.push(summarize(evaluateStandard('imagery', (c.imagery || []).map((m) => ({ ...m, approved: true })))));
  } else if (c.payload?.trend) {
    lines.push(summarize(evaluateStandard('trend', c.payload.trend)));
  }
  return lines;
}

(async () => {
  if (id) {
    const c = await getCandidate(paths, id);
    if (!c) throw new Error('Candidate not found: ' + id);
    console.log(`Candidate ${c.id} — ${c.title}`);
    for (const line of await evaluateCandidate(c)) console.log('  ' + line);
  } else {
    const items = await loadQueue(paths);
    console.log(`Eclipse Standard — ${items.length} candidate(s):\n`);
    for (const c of items) {
      console.log(`${c.id}  ${c.title}`);
      for (const line of await evaluateCandidate(c)) console.log('  ' + line);
    }
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
