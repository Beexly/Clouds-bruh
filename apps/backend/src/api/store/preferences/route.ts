import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { PERSONALIZATION_MODULE } from '../../../modules/personalization';

const CHAPTERS = ['stillness', 'armor', 'signal', 'altar', 'relentless'];

/** GET ?visitor_id= — current Broadcast tuning (followed/muted chapters). */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const visitorId = req.query.visitor_id as string;
  if (!visitorId) return res.status(400).json({ error: 'visitor_id is required' });
  const mind: any = req.scope.resolve(PERSONALIZATION_MODULE);
  res.json({ visitor_id: visitorId, ...(await mind.getPreferences(visitorId)) });
};

/** POST { visitor_id, followed?, muted? } — tune the Broadcast (steers ORACLE via affinity). */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { visitor_id, followed = [], muted = [] } = (req.body as any) ?? {};
  if (!visitor_id) return res.status(400).json({ error: 'visitor_id is required' });
  // Cap array size before filtering (DoS guard) and only accept known chapter strings.
  const clean = (arr: any) =>
    Array.isArray(arr) ? arr.slice(0, 50).filter((c) => typeof c === 'string' && CHAPTERS.includes(c)) : [];
  try {
    const mind: any = req.scope.resolve(PERSONALIZATION_MODULE);
    const prefs = await mind.setPreferences(visitor_id, clean(followed), clean(muted));
    res.json({ visitor_id, ...prefs });
  } catch (e: any) {
    res.status(500).json({ error: e.message?.slice(0, 200) });
  }
};
