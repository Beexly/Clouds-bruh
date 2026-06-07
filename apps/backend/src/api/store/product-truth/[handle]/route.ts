import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { productTruthByHandle } from '../../../../lib/lumera-db';

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const handle = (req.params as any)?.handle;
  const truth = await productTruthByHandle(handle);
  if (!truth) return res.status(404).json({ error: `Product truth not found for ${handle}` });
  res.json({ truth });
};
