import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { authorizeOps } from '../../../../lib/lumera-auth';
import { listCandidates, persistVendorConnections, seedCurationCandidates } from '../../../../lib/lumera-db';

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!authorizeOps(req, res)) return;
  const connections = await persistVendorConnections();
  let candidates = await listCandidates();
  if (!candidates.length) candidates = await seedCurationCandidates(false);
  res.json({
    generated_at: new Date().toISOString(),
    launch_mode: {
      vendor_live_mode: process.env.VENDOR_LIVE_MODE === 'true',
      auto_publish_approved: process.env.AUTO_PUBLISH_APPROVED !== 'false',
      auto_submit_vendor_orders: process.env.AUTO_SUBMIT_VENDOR_ORDERS === 'true',
      margin_floor: Number(process.env.SUPPLIER_MARGIN_FLOOR ?? 0.38),
      max_shipping_days: Number(process.env.MAX_SHIPPING_DAYS ?? 12),
    },
    connections,
    candidates,
  });
};
