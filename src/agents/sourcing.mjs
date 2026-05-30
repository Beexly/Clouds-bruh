import { getAdapters } from '../adapters/index.mjs';
import { vaultCopyFor, colorwaysFor, sizesFor } from '../storefront/copy.mjs';
import { createCandidate } from '../model/review-queue-item.mjs';
import { createProduct } from '../model/product.mjs';
import { enqueueCandidate } from '../queue/store.mjs';
import { evaluateLaunchGates } from '../scoring/launch-gate.mjs';
import { productReadiness } from '../scoring/product-readiness.mjs';
import { supplierScore } from '../scoring/supplier-score.mjs';
import { marginPct } from '../scoring/pricing-margin.mjs';
import { CandidateKind } from '../model/enums.mjs';
import { mulberry32 } from '../lib/rng.mjs';

export const meta = { role: 'sourcing' };

/**
 * Sourcing agent: propose product candidates into the review queue. Every
 * candidate is fully formed — copy, variants, placeholder imagery, source links,
 * costs, scores, and a gate snapshot — so the operator can decide at a glance.
 * It NEVER touches the catalog; it only appends to the queue.
 */
export async function run(paths, ctx, opts = {}) {
  const adapters = await getAdapters();
  const seed = opts.seed ?? ctx.seed ?? 1;
  const count = opts.count ?? 3;
  const rng = mulberry32(seed);
  const supplier = (ctx.suppliers || []).find((s) => s.status === 'active') || (ctx.suppliers || [])[0] || null;

  const concepts = adapters.claude.proposeProducts({ seed, count, exclude: ctx.existingNames || [] });
  const produced = [];

  for (const concept of concepts) {
    const copy = vaultCopyFor({ name: concept.name, category: concept.category, specs: concept.specs, rng });
    const variants = [];
    for (const color of colorwaysFor(concept.category, rng)) {
      for (const size of sizesFor(concept.category)) {
        variants.push({ color, size, inventory: { onHand: 0, reserved: 0, restockThreshold: 6 } });
      }
    }
    const imagery = adapters.imagegen.generateImagery(concept.name);
    const costMinor = concept.costMinor;
    const listMinor = concept.listMinor;
    const floorMinor = costMinor * 2;

    const productSpec = {
      title: copy.title,
      subtitle: copy.subtitle,
      description: copy.description,
      bulletBenefits: copy.bulletBenefits,
      emotionalHooks: copy.emotionalHooks,
      category: concept.category,
      tags: concept.tags,
      specs: copy.specs,
      variants,
      pricing: { listMinor, floorMinor, currency: 'USD' },
      supplierId: supplier?.id,
      tier: ctx.brand.tiers.vault,
    };

    // Score a temp product. Gate snapshot represents "ready for the operator's
    // decision": imagery treated as approvable, human treated as the pending step.
    const tmp = createProduct({ ...productSpec, media: imagery });
    const readiness = productReadiness(tmp);
    const sScore = supplier ? supplierScore(supplier) : 0;
    const mPct = marginPct(listMinor, costMinor);
    const gate = evaluateLaunchGates(
      { ...tmp, media: imagery.map((m) => ({ ...m, approved: true })) },
      { humanApproved: true }
    );

    const candidate = createCandidate({
      kind: CandidateKind.PRODUCT,
      title: `${concept.name} — Vault candidate`,
      summary: copy.description,
      proposedBy: { agent: 'sourcing', runId: opts.runId || 'manual', model: 'mock' },
      payload: { product: productSpec },
      sourceLinks: adapters.websearch.research(concept.name),
      imagery,
      costs: { unitCostMinor: costMinor, suggestedListMinor: listMinor, marginPct: mPct, currency: 'USD' },
      scores: { readiness, media: 0, supplier: sScore, margin: mPct, overall: gate.score },
      gate,
    });

    const res = await enqueueCandidate(paths, candidate);
    if (res.created) produced.push(candidate.id);
  }

  return { producedCandidateIds: produced, notes: `sourced ${produced.length} candidate(s)` };
}
