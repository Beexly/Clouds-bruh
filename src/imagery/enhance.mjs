/**
 * Enhancement request artifacts (R4, docs/research/03 §1). Eclipse's dep-free
 * core cannot run the HDR/ISP finishing chain (black/white-level → white balance
 * → demosaic → chroma denoise → color-correct → tonemap → sharpen → contrast →
 * gamma) or a learned auto-enhance. So it EXPORTS the finishing recipe per asset
 * for a real enhancement MCP to fulfill, then records measured metrics back.
 * No pixels are processed here; no spend.
 */

// The finishing chain, named after the real ISP stages, with brand-tuned intent.
export const FINISH_CHAIN = Object.freeze([
  { stage: 'white_balance', intent: 'neutral, slightly cool for dark-luxe' },
  { stage: 'chroma_denoise', intent: 'clean shadows without smearing texture' },
  { stage: 'color_correct', intent: 'restrained, accurate; no oversaturation' },
  { stage: 'tonemap', intent: 'deep blacks, controlled highlights, rich local contrast' },
  { stage: 'sharpen', intent: 'micro-detail on material/hardware, no halos' },
  { stage: 'contrast', intent: 'gallery-grade separation on a matte black backdrop' },
]);

/** Build an enhancement request for one media ref. */
export function enhancementRequest(media, product = {}) {
  return {
    role: media.role,
    sourceUrl: media.url || null,
    target: { minLongEdge: 3000, colorProfile: 'srgb' },
    chain: FINISH_CHAIN,
    note:
      `Finish ${product.title || 'product'} ${media.role} to Eclipse gallery grade, then return measured metrics ` +
      `(width,height,clippingPct,colorProfile,sharpness,noise,brandSafe) for the quality gate.`,
  };
}

/** Build enhancement requests for a candidate's full imagery set. */
export function buildEnhancementPlan(candidate = {}) {
  const product = candidate.payload?.product || { title: candidate.title };
  const imagery = candidate.imagery || [];
  return {
    candidateId: candidate.id,
    title: product.title || candidate.title,
    requests: imagery.map((m) => enhancementRequest(m, product)),
    note: 'Fulfill via the image-enhancement MCP; record measured metrics back onto each MediaRef. Stays approved:false until a human approves.',
  };
}
