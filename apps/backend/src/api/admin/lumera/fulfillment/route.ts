import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { authorizeOps } from '../../../../lib/lumera-auth';
import { ensureLumeraTables, pool, vendorConnections } from '../../../../lib/lumera-db';

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!authorizeOps(req, res)) return;
  await ensureLumeraTables();
  const [orders, webhooks, returns] = await Promise.all([
    pool().query(`SELECT * FROM lumera_vendor_order ORDER BY created_at DESC LIMIT 50`),
    pool().query(`SELECT id, vendor, event_type, received_at, processed_at FROM lumera_vendor_webhook_event ORDER BY received_at DESC LIMIT 50`),
    pool().query(`SELECT id, order_id, email, status, reason, created_at FROM lumera_return_case ORDER BY created_at DESC LIMIT 50`),
  ]);
  res.json({
    generated_at: new Date().toISOString(),
    live_mode: {
      vendor_live_mode: process.env.VENDOR_LIVE_MODE === 'true',
      auto_submit_vendor_orders: process.env.AUTO_SUBMIT_VENDOR_ORDERS === 'true',
    },
    connections: vendorConnections(),
    vendor_orders: orders.rows,
    recent_webhooks: webhooks.rows,
    return_cases: returns.rows,
  });
};
