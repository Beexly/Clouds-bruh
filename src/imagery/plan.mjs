import { loadQueue } from '../queue/store.mjs';
import { imageRequestsFor } from './prompts.mjs';

/**
 * Imagery plan (Phase 3). Export artifact: for every candidate whose imagery is
 * still placeholder/unapproved, emit the per-role generation requests. The Claude
 * agent fulfills these via the image-generation MCP, then records the resulting
 * URLs back (still approved:false until a human approves). Node never calls MCP.
 */
export async function buildImageryPlan(paths, opts = {}) {
  const items = await loadQueue(paths);
  const needsImagery = items.filter(
    (c) => c.kind === 'product' && (c.imagery || []).some((m) => !m.approved || m.provenance === 'placeholder')
  );
  const targets = needsImagery.map((c) => {
    const product = c.payload?.product || { title: c.title };
    const roles = (c.imagery || []).map((m) => m.role);
    return {
      candidateId: c.id,
      title: product.title || c.title,
      requests: imageRequestsFor(product, roles.length ? roles : undefined),
    };
  });
  return {
    note: 'Fulfill via the image-generation MCP. Generated media stays approved:false until a human approves it; only approved media counts toward the launch gate.',
    count: targets.length,
    targets: opts.limit ? targets.slice(0, opts.limit) : targets,
  };
}
