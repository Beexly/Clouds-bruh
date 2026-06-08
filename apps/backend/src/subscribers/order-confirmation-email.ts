import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';
import { Modules } from '@medusajs/framework/utils';
import { sendEmail, renderOrderConfirmation, trackKlaviyoEvent } from '../lib/email';

/**
 * Order confirmation email — Lumera voice, mock-until-keyed.
 *
 * Fires on `order.placed`. We always build the order summary and render the brand email; we only
 * actually deliver once RESEND_API_KEY is set. Until then it logs a mock and returns, so order
 * placement is never affected and boot stays clean — the same env-gated pattern used for
 * Redis / Stripe / S3 in medusa-config.ts. Klaviyo's "Placed Order" event fires too, but only
 * when KLAVIYO_API_KEY is present (trackKlaviyoEvent no-ops otherwise).
 *
 * Deliberately separate from order-placed.ts: the critical inventory + rewards path must never
 * depend on — or be broken by — email delivery.
 */
export default async function orderConfirmationEmail({ event, container }: SubscriberArgs<{ id: string }>) {
  const orderId = event.data?.id;
  if (!orderId) return;

  try {
    const orderModule = container.resolve(Modules.ORDER) as any;
    const [order] = await orderModule
      .listOrders(
        { id: orderId },
        {
          relations: ['items'],
          select: [
            'id',
            'display_id',
            'email',
            'currency_code',
            'total',
            'items.title',
            'items.quantity',
            'items.unit_price',
          ],
        }
      )
      .catch(() => [null]);
    if (!order?.email) return;

    // Build the brand-aligned confirmation (dark luminous editorial — see lib/email.ts).
    const email = renderOrderConfirmation({
      id: order.id,
      display_id: order.display_id,
      email: order.email,
      currency_code: order.currency_code,
      total: order.total,
      items: (order.items ?? []).map((i: any) => ({
        title: i.title,
        quantity: i.quantity ?? 1,
        unit_price: i.unit_price ?? 0,
      })),
    });

    const result = await sendEmail({ to: order.email, subject: email.subject, html: email.html });
    if (result.sent) {
      console.log(`[order-email] confirmation sent for order ${order.display_id ?? orderId} (${result.id ?? 'no-id'})`);
    } else if (result.reason === 'no_api_key') {
      // Mock-until-keyed: set RESEND_API_KEY (+ NOTIFICATION_EMAIL_FROM) to deliver for real.
      console.log(
        `[order-email] (mock) confirmation for order ${order.display_id ?? orderId} → ${order.email} — set RESEND_API_KEY to send.`
      );
    } else {
      console.warn(`[order-email] send failed for order ${order.display_id ?? orderId}: ${result.reason}`);
    }

    // Lifecycle: feed Klaviyo for post-purchase flows. No-ops cleanly when KLAVIYO_API_KEY is unset.
    await trackKlaviyoEvent('Placed Order', order.email, {
      order_id: order.id,
      display_id: order.display_id ?? order.id,
      currency: order.currency_code,
      total: order.total,
      items: (order.items ?? []).map((i: any) => ({ title: i.title, quantity: i.quantity ?? 1 })),
    });
  } catch (e: any) {
    // Never break order placement on an email issue.
    console.warn('[order-email] send skipped/failed:', e.message?.slice(0, 100));
  }
}

export const config: SubscriberConfig = { event: 'order.placed' };
