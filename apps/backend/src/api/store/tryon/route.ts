import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { virtualTryOn, tryOnConfigured } from '../../../lib/tryon';

/**
 * AR virtual try-on. POST a customer photo URL + a garment image URL; returns the rendered image
 * (or a job id to poll). Gated: with no provider configured it returns 501 `unconfigured` so the
 * storefront can hide/disable the feature cleanly rather than showing a broken button. See lib/tryon.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const personImageUrl = typeof b.person_image_url === 'string' ? b.person_image_url : '';
  const garmentImageUrl = typeof b.garment_image_url === 'string' ? b.garment_image_url : '';
  const category = typeof b.category === 'string' ? (b.category as any) : undefined;
  if (!personImageUrl || !garmentImageUrl) {
    res.status(400).json({ error: 'person_image_url and garment_image_url are required' });
    return;
  }
  const result = await virtualTryOn({ personImageUrl, garmentImageUrl, category });
  if (result.status === 'unconfigured') {
    res.status(501).json(result);
    return;
  }
  if (result.status === 'error') {
    res.status(502).json(result);
    return;
  }
  res.json(result);
}

/** Feature-detection: lets the storefront decide whether to render the try-on affordance. */
export async function GET(_req: MedusaRequest, res: MedusaResponse): Promise<void> {
  res.json({ configured: tryOnConfigured() });
}
