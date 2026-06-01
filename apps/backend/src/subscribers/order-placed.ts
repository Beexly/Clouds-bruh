import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';
import { Modules } from '@medusajs/framework/utils';

export default async function orderPlaced({ event, container }: SubscriberArgs<{ id: string }>) {
  const orderId = event.data?.id;
  if (!orderId) return;

  try {
    // Resolve order details to find product IDs
    const orderModule = container.resolve(Modules.ORDER) as any;
    const [order] = await orderModule.listOrders(
      { id: orderId },
      { relations: ['items'], select: ['id', 'customer_id', 'items.variant_id', 'items.product_id', 'items.quantity', 'items.unit_price', 'metadata'] }
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
