import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';
import { Modules } from '@medusajs/framework/utils';
import { ensureLumeraTables, pool } from '../lib/lumera-db';

export default async function orderPlaced({ event, container }: SubscriberArgs<{ id: string }>) {
  const orderId = event.data?.id;
  if (!orderId) return;

  try {
    // Resolve order details to find product IDs
    const orderModule = container.resolve(Modules.ORDER) as any;
    const [order] = await orderModule.listOrders(
      { id: orderId },
      {
        relations: ['items'],
        select: [
          'id',
          'customer_id',
          'items.variant_id',
          'items.product_id',
          'items.quantity',
          'items.unit_price',
          'items.metadata',
          'metadata',
        ],
      }
    ).catch(() => [null]);

    if (!order) return;

    const drops = container.resolve('drops') as any;
    const allDrops = await drops.listDrops({ status: 'live' }).catch(() => []);

    // Decrement units_remaining for any live drop containing purchased products
    const productIds = (order.items ?? []).map((i: any) => i.product_id).filter(Boolean);
    for (const drop of allDrops as any[]) {
      const dropProducts: string[] = drop.product_ids ?? [];
      const overlap = productIds.filter((pid: string) => dropProducts.includes(pid));
      if (overlap.length > 0) {
        const totalQty = (order.items ?? [])
          .filter((i: any) => overlap.includes(i.product_id))
          .reduce((s: number, i: any) => s + (i.quantity ?? 1), 0);
        await drops.consumeUnits(drop.id, totalQty).catch((e: Error) =>
          console.warn(`[order-placed] consumeUnits failed for drop ${drop.id}:`, e.message?.slice(0, 60))
        );
        console.log(`[order-placed] Drop ${drop.name}: consumed ${totalQty} units`);
      }
    }

    // Luminance: grant credits for the purchase (Patron earns 2×). Keyed to the customer
    // if identified, else the anonymous visitor so guests still accrue toward their wallet.
    const orderTotalCents = (order.items ?? []).reduce(
      (s: number, i: any) => s + (i.unit_price ?? 0) * (i.quantity ?? 1),
      0
    );
    const account = order.customer_id ?? order.metadata?.visitor_id;
    if (account && orderTotalCents > 0) {
      try {
        const monetization = container.resolve('monetization') as any;
        const awarded = await monetization.awardForPurchase(account, orderTotalCents);
        console.log(`[order-placed] Luminance: granted ${awarded} credits to ${account}`);
      } catch (e: any) {
        console.warn('[order-placed] reward grant failed:', e.message?.slice(0, 60));
      }
    }

    await ensureLumeraTables();
    const grouped = new Map<string, any[]>();
    for (const item of order.items ?? []) {
      const vendor = item.metadata?.fulfillment_provider ?? item.metadata?.vendor ?? order.metadata?.fulfillment_provider ?? 'manual';
      grouped.set(vendor, [...(grouped.get(vendor) ?? []), item]);
    }
    for (const [vendor, items] of grouped.entries()) {
      const vendorOrderId = `VO-${vendor}-${orderId}-${Date.now()}`.slice(0, 120);
      const status = process.env.VENDOR_LIVE_MODE === 'true' && process.env.AUTO_SUBMIT_VENDOR_ORDERS === 'true'
        ? 'submitted'
        : 'staged_for_approval';
      await pool().query(
        `INSERT INTO lumera_vendor_order (id, order_id, vendor, vendor_order_id, status, payload)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, payload=EXCLUDED.payload, updated_at=now()`,
        [
          vendorOrderId,
          orderId,
          vendor,
          status === 'submitted' ? vendorOrderId : null,
          status,
          JSON.stringify({
            source: 'order.placed',
            live_submission_enabled: status === 'submitted',
            delay_consent_required_after_days: 30,
            items: items.map((item: any) => ({
              product_id: item.product_id,
              variant_id: item.variant_id,
              quantity: item.quantity ?? 1,
              unit_price: item.unit_price ?? 0,
              supplier_sku: item.metadata?.supplier_sku,
            })),
          }),
        ]
      );
      console.log(`[order-placed] Vendor order ${status}: ${vendorOrderId}`);
    }

    // Emit SIGNAL purchase event so ORACLE can attribute conversion reward
    const signalModule = container.resolve('signal') as any;
    await signalModule.ingest({
      visitor_id: order.metadata?.visitor_id ?? 'unknown',
      session_id: order.metadata?.session_id ?? 'unknown',
      type: 'purchase',
      entity_id: orderId,
      entity_type: 'order',
      value: (order.items ?? []).reduce((s: number, i: any) => s + (i.unit_price ?? 0) * (i.quantity ?? 1), 0) / 100,
      chapter: order.metadata?.chapter,
      ts: new Date().toISOString(),
    }).catch(() => {});

  } catch (e: any) {
    console.error('[order-placed] subscriber error:', e.message?.slice(0, 120));
  }
}

export const config: SubscriberConfig = { event: 'order.placed' };
