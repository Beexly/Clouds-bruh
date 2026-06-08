import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';

export function authorizeOps(req: MedusaRequest, res: MedusaResponse): boolean {
  const required = process.env.COCKPIT_KEY;
  const provided = (req.query.key as string) || (req.headers['x-cockpit-key'] as string);
  if (required && provided !== required) {
    res.status(401).json({ error: 'unauthorized' });
    return false;
  }
  if (!required && process.env.NODE_ENV === 'production') {
    res.status(401).json({ error: 'unauthorized - set COCKPIT_KEY to expose Lumera ops APIs' });
    return false;
  }
  return true;
}
