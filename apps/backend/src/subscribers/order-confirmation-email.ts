import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';
import { Modules } from '@medusajs/framework/utils';

/**
 * Order confirmation email — Lumera voice, mock-until-keyed.
 *
 * Sends through Medusa's Notification module on `order.placed`, but ONLY once an email provider is
 * configured (env: NOTIFICATION_EMAIL_FROM + a provider key). Until then it logs and returns, so
 * order placement is never affected and boot stays clean — the same env-gated pattern used for
 * Redis / Stripe / S3 in medusa-config.ts. To turn on: register an email provider (Resend/SendGrid)
 * in medusa-config's `modules` and set the env (see LAUNCH_READINESS.md → "transactional email").
 *
 * Deliberately separate from order-placed.ts: the critical inventory + rewards path must never
 * depend on — or be broken by — email delivery.
 */
export default async function orderConfirmationEmail({ event, container }: SubscriberArgs<{ id: string }>) {
  const orderId = event.data?.id;
  if (!orderId) return;

  // Gate on a configured provider so we never attempt (and throw) until the founder keys email.
  const from = process.env.NOTIFICATION_EMAIL_FROM;
  const hasProvider = !!(
    process.env.RESEND_API_KEY ||
    process.env.SENDGRID_API_KEY ||
    process.env.NOTIFICATION_PROVIDER
  );
  if (!from || !hasProvider) {
    console.log('[order-email] order confirmation skipped — set NOTIFICATION_EMAIL_FROM + an email provider to enable.');
    return;
  }

  try {
    const orderModule = container.resolve(Modules.ORDER) as any;
    const [order] = await orderModule
      .listOrders(
        { id: orderId },
        {
          relations: ['items'],
          select: ['id', 'display_id', 'email', 'currency_code', 'items.title', 'items.quantity', 'items.unit_price'],
        }
      )
      .catch(() => [null]);
    if (!order?.email) return;

    const items = (order.items ?? []).map((i: any) => ({ title: i.title, quantity: i.quantity ?? 1 }));
    const notification = container.resolve(Modules.NOTIFICATION) as any;

    await notification.createNotifications({
      to: order.email,
      channel: 'email',
      from,
      // Provider maps this template id → its real email (SendGrid dynamic template / Resend react-email).
      template: process.env.NOTIFICATION_ORDER_TEMPLATE || 'order-placed',
      data: {
        brand: 'Lumera',
        experience: 'The Broadcast',
        headline: 'We have it. Your order is on its way.',
        order_id: order.id,
        display_id: order.display_id ?? order.id,
        currency_code: order.currency_code,
        items,
      },
      resource_id: order.id,
      resource_type: 'order',
    });
    console.log(`[order-email] confirmation queued for order ${order.display_id ?? orderId}`);
  } catch (e: any) {
    // Never break order placement on an email issue (e.g. provider not registered yet).
    console.warn('[order-email] send skipped/failed:', e.message?.slice(0, 100));
  }
}

export const config: SubscriberConfig = { event: 'order.placed' };
