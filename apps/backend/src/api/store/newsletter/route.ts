import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { normalizeEmail, saveSubscriber } from '../../../lib/newsletter';
import { trackKlaviyoEvent } from '../../../lib/email';

/**
 * POST /store/newsletter — capture an email-list subscriber.
 * Owns the list first (best-effort DB write), then notifies the ESP (Klaviyo, no-op unkeyed).
 * Always 200 on a valid email so the capture UX never breaks on a storage/ESP blip, and so we never
 * leak whether the address already existed (no enumeration).
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const email = normalizeEmail(body.email);
  if (!email) return res.status(400).json({ error: 'A valid email is required.' });
  const source = typeof body.source === 'string' ? body.source.slice(0, 40) : 'storefront';

  const stored = await saveSubscriber(email, source);
  await trackKlaviyoEvent('Subscribed to Newsletter', email, { source }).catch(() => undefined);

  return res.json({ ok: true, stored });
};
