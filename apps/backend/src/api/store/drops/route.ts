import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { Modules } from '@medusajs/framework/utils';

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const dropsModule = req.scope.resolve('drops') as any;
    const status = req.query.status as string | undefined;
    const filter: Record<string, any> = {};
    if (status) filter.status = status;
    const drops = await dropsModule.listDrops(filter, {
      order: { starts_at: 'DESC' },
    });
    res.json({ drops });
  } catch (e: any) {
    res.status(500).json({ error: e.message?.slice(0, 200) });
  }
};
