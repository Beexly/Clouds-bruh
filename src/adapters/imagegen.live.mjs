import { imageRequestsFor } from '../imagery/prompts.mjs';

/**
 * Live imagery adapter (Phase 3). The Node runtime cannot call MCP tools, so the
 * "live" path does not generate images itself — it returns the generation request
 * descriptors (brand-consistent prompts per role) for the Claude agent to fulfill
 * via the image-generation MCP. The agent then records resulting URLs back with
 * `attachCandidateImagery` (which forces approved:false).
 *
 * Shape-compatible with imagegen.mock.generateImagery: returns MediaRef-like
 * objects, but each carries a `prompt`/`size` and an empty `url` so callers can
 * see it still needs fulfillment.
 */
export function generateImagery(name, roles = ['hero', 'angle', 'detail']) {
  return imageRequestsFor({ title: name }, roles).map((r) => ({
    role: r.role,
    url: '',
    alt: `${name} — ${r.role}`,
    provenance: 'imagegen',
    approved: false,
    prompt: r.prompt,
    size: r.size,
    pendingFulfillment: true,
  }));
}
