import type { Tool } from './index';

/**
 * Voice-of-Customer — agent-native review analysis. UPGRADE to INTROSPECTION + Curator + Shepherd:
 * drop in an ASIN/CSV (or our own reviews) → sentiment, ranked pain points, and copy-ready listing
 * improvements. Feeds: what to make next (Curator), what to fix (INTROSPECTION), what hurts (Shepherd).
 */
export const voc: Tool = {
  name: 'voc_reviews',
  description: 'Analyze product reviews (ASIN, CSV, or our own) → sentiment, ranked pain points, and copy-ready listing improvements.',
  inputSchema: {
    type: 'object',
    properties: { source: { type: 'string' }, productId: { type: 'string' } },
    required: ['source'],
  },
  run: async ({ source, productId }) => {
    // TODO: run the review-analyzer pipeline (sentiment + pain-point extraction + copy suggestions).
    return { source, productId, sentiment: null, pain_points: [], copy_improvements: [] };
  },
};
