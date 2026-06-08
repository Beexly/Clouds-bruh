import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { sendEmail, renderShipmentNotification, trackKlaviyoEvent } from '../lib/email';

/**
 * Shipment notification — "your order shipped", Lumera voice, mock-until-keyed.
 *
 * EVENT NAME: Medusa v2 emits `shipment.created` (FulfillmentWorkflowEvents.SHIPMENT_CREATED) from
 * createShipmentWorkflow when a shipment is registered against an order's fulfillment. The payload is
 * `{ id, no_notification }` where `id` is the FULFILLMENT id (not the order id), so we resolve the
 * owning order through the module-link graph (entity: 'order', filter on fulfillments.id) — the same
 * approach Medusa's own mark-as-delivered workflow uses. If a future Medusa version renames this to
 * `delivery.created` for delivery-time notices, add a second subscriber with that name.
 *
 * Mirrors order-confirmation-email.ts: always render the brand email; only deliver when RESEND_API_KEY
 * is set; never let a messaging failure affect fulfillment. `no_notification` is honored.
 */
export default async function shipmentCreated({ event, container }: SubscriberArgs<{ id: string; no_notification?: boolean }>) {
  const fulfillmentId = event.data?.id;
  if (!fulfillmentId) return;
  if (event.data?.no_notification) return; // operator suppressed customer notification

  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const { data: orders } = await query
      .graph({
        entity: 'order',
        filters: { fulfillments: { id: fulfillmentId } },
        fields: [
          'id',
          'display_id',
          'email',
          'currency_code',
          'items.title',
          'items.quantity',
          'fulfillments.id',
          'fulfillments.labels.tracking_number',
          'fulfillments.labels.tracking_url',
          'metadata',
        ],
      })
      .catch(() => ({ data: [] as any[] }));

    const order = orders?.[0];
    if (!order?.email) {
      console.log(`[shipment-email] no order/email resolved for fulfillment ${fulfillmentId} — skipping.`);
      return;
    }

    // Pull tracking from the shipped fulfillment's label, if present.
    const fulfillment = (order.fulfillments ?? []).find((f: any) => f.id === fulfillmentId);
    const label = (fulfillment?.labels ?? [])[0];

    const email = renderShipmentNotification({
      id: order.id,
      display_id: order.display_id,
      email: order.email,
      currency_code: order.currency_code,
      items: (order.items ?? []).map((i: any) => ({ title: i.title, quantity: i.quantity ?? 1 })),
      tracking_number: label?.tracking_number,
      tracking_url: label?.tracking_url,
    });

    const result = await sendEmail({ to: order.email, subject: email.subject, html: email.html });
    if (result.sent) {
      console.log(`[shipment-email] shipped notice sent for order ${order.display_id ?? order.id} (${result.id ?? 'no-id'})`);
    } else if (result.reason === 'no_api_key') {
      console.log(
        `[shipment-email] (mock) shipped notice for order ${order.display_id ?? order.id} → ${order.email} — set RESEND_API_KEY to send.`
      );
    } else {
      console.warn(`[shipment-email] send failed for order ${order.display_id ?? order.id}: ${result.reason}`);
    }

    // Lifecycle: feed Klaviyo so post-purchase "shipped" flows can trigger. No-ops without KLAVIYO_API_KEY.
    await trackKlaviyoEvent('Fulfilled Order', order.email, {
      order_id: order.id,
      display_id: order.display_id ?? order.id,
      fulfillment_id: fulfillmentId,
      tracking_number: label?.tracking_number,
      tracking_url: label?.tracking_url,
    });
  } catch (e: any) {
    // Never break fulfillment on a messaging issue.
    console.warn('[shipment-email] send skipped/failed:', e.message?.slice(0, 120));
  }
}

export const config: SubscriberConfig = { event: 'shipment.created' };
