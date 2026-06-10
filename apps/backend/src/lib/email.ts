/**
 * Email + lifecycle messaging — Resend (transactional) and Klaviyo (events), env-gated.
 *
 * No SDK: both providers are hit via their REST APIs with global fetch, and both no-op cleanly
 * when their key is absent. The order path must never break on a messaging failure, so callers
 * should treat a `{ sent: false }` result as benign.
 */

import { marketingFooter } from './email-compliance';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface SendEmailResult {
  sent: boolean;
  id?: string;
  reason?: string;
}

/** Send a transactional email through Resend. No-op ({ sent:false, reason:'no_api_key' }) when unkeyed. */
export async function sendEmail({ to, subject, html, from }: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, reason: 'no_api_key' };

  const sender = from || process.env.NOTIFICATION_EMAIL_FROM || 'Lumera <no-reply@lumeralabel.com>';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from: sender, to, subject, html }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) return { sent: false, reason: `resend_${res.status}${body.message ? `:${body.message}` : ''}` };
    return { sent: true, id: body.id };
  } catch (e: any) {
    return { sent: false, reason: `resend_error:${(e?.message ?? 'unknown').slice(0, 80)}` };
  }
}

/**
 * Track a customer event in Klaviyo (e.g. "Placed Order") for lifecycle flows.
 * No-op when KLAVIYO_API_KEY is unset. Fire-and-forget; resolves to whether it was sent.
 */
export async function trackKlaviyoEvent(
  event: string,
  email: string,
  props: Record<string, unknown> = {}
): Promise<SendEmailResult> {
  const apiKey = process.env.KLAVIYO_API_KEY;
  if (!apiKey) return { sent: false, reason: 'no_api_key' };
  if (!email) return { sent: false, reason: 'no_email' };

  try {
    const res = await fetch('https://a.klaviyo.com/api/events/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        revision: process.env.KLAVIYO_API_REVISION || '2024-10-15',
      },
      body: JSON.stringify({
        data: {
          type: 'event',
          attributes: {
            properties: props,
            metric: { data: { type: 'metric', attributes: { name: event } } },
            profile: { data: { type: 'profile', attributes: { email } } },
          },
        },
      }),
    });
    if (!res.ok) return { sent: false, reason: `klaviyo_${res.status}` };
    return { sent: true };
  } catch (e: any) {
    return { sent: false, reason: `klaviyo_error:${(e?.message ?? 'unknown').slice(0, 80)}` };
  }
}

interface OrderLike {
  id?: string;
  display_id?: string | number;
  email?: string;
  currency_code?: string;
  total?: number;
  items?: Array<{ title?: string; quantity?: number; unit_price?: number }>;
}

function money(cents: number, currency = 'USD'): string {
  const amount = (cents ?? 0) / 100;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: (currency || 'USD').toUpperCase() }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Brand-aligned order confirmation — dark luminous editorial luxury.
 * Names/voice mirror the storefront brand layer (apps/storefront/src/lib/brand.ts):
 * Lumera · The Broadcast. Palette: void #0B0B0D, luminous neutrals, a faint gold accent.
 */
export function renderOrderConfirmation(order: OrderLike): SendEmailInput {
  const currency = order.currency_code || 'USD';
  const items = order.items ?? [];
  const computedTotal =
    typeof order.total === 'number' && order.total > 0
      ? order.total
      : items.reduce((s, i) => s + (i.unit_price ?? 0) * (i.quantity ?? 1), 0);
  const displayId = order.display_id ?? order.id ?? '';

  const rows = items
    .map((i) => {
      const line = (i.unit_price ?? 0) * (i.quantity ?? 1);
      return `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #1c1c22;color:#ECECEE;font-size:15px;">
            ${escapeHtml(i.title ?? 'Item')} <span style="color:#7A7A82;">×${i.quantity ?? 1}</span>
          </td>
          <td style="padding:14px 0;border-bottom:1px solid #1c1c22;color:#ECECEE;font-size:15px;text-align:right;">
            ${money(line, currency)}
          </td>
        </tr>`;
    })
    .join('');

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#0B0B0D;">
    <div style="max-width:560px;margin:0 auto;padding:48px 32px;background:#0B0B0D;font-family:Inter,Helvetica,Arial,sans-serif;color:#ECECEE;">
      <p style="margin:0 0 4px;letter-spacing:0.32em;text-transform:uppercase;font-size:11px;color:#C7A24B;">Lumera</p>
      <p style="margin:0 0 32px;letter-spacing:0.18em;text-transform:uppercase;font-size:10px;color:#7A7A82;">The Broadcast</p>

      <h1 style="margin:0 0 12px;font-family:'Cormorant Garamond',Georgia,serif;font-weight:400;font-size:30px;line-height:1.2;color:#FFFFFF;">
        We have it. Your order is on its way.
      </h1>
      <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#9A9AA2;">
        Order <span style="color:#ECECEE;">#${escapeHtml(String(displayId))}</span> is confirmed. Some things only happen once — thank you for being here for this one.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 8px;">
        ${rows}
        <tr>
          <td style="padding:18px 0 0;font-size:14px;letter-spacing:0.04em;text-transform:uppercase;color:#7A7A82;">Total</td>
          <td style="padding:18px 0 0;font-size:18px;text-align:right;color:#FFFFFF;">${money(computedTotal, currency)}</td>
        </tr>
      </table>

      <p style="margin:36px 0 0;font-size:12px;line-height:1.6;color:#5C5C63;">
        Broadcast live, and shaped to you. — Lumera
      </p>
    </div>
  </body>
</html>`;

  return {
    to: order.email ?? '',
    subject: `Your Lumera order #${displayId} is confirmed`,
    html,
  };
}

interface ShipmentLike extends OrderLike {
  tracking_number?: string;
  tracking_url?: string;
  carrier?: string;
}

/**
 * Brand-aligned shipment ("your order shipped") notification — same dark luminous editorial
 * palette as the confirmation. Tracking is optional; the body adapts when it's absent.
 */
export function renderShipmentNotification(order: ShipmentLike): SendEmailInput {
  const displayId = order.display_id ?? order.id ?? '';
  const items = order.items ?? [];

  const rows = items
    .map(
      (i) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #1c1c22;color:#ECECEE;font-size:15px;">
            ${escapeHtml(i.title ?? 'Item')} <span style="color:#7A7A82;">×${i.quantity ?? 1}</span>
          </td>
        </tr>`
    )
    .join('');

  const trackingBlock = order.tracking_number
    ? `
      <div style="margin:28px 0 0;padding:18px 20px;border:1px solid #2a2a32;border-radius:2px;">
        <p style="margin:0 0 6px;letter-spacing:0.18em;text-transform:uppercase;font-size:10px;color:#7A7A82;">
          Tracking${order.carrier ? ` · ${escapeHtml(order.carrier)}` : ''}
        </p>
        <p style="margin:0;font-size:15px;color:#ECECEE;">${escapeHtml(order.tracking_number)}</p>
        ${
          order.tracking_url
            ? `<p style="margin:14px 0 0;"><a href="${escapeHtml(order.tracking_url)}" style="color:#C7A24B;text-decoration:none;font-size:13px;letter-spacing:0.04em;">Track your shipment →</a></p>`
            : ''
        }
      </div>`
    : '';

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#0B0B0D;">
    <div style="max-width:560px;margin:0 auto;padding:48px 32px;background:#0B0B0D;font-family:Inter,Helvetica,Arial,sans-serif;color:#ECECEE;">
      <p style="margin:0 0 4px;letter-spacing:0.32em;text-transform:uppercase;font-size:11px;color:#C7A24B;">Lumera</p>
      <p style="margin:0 0 32px;letter-spacing:0.18em;text-transform:uppercase;font-size:10px;color:#7A7A82;">The Broadcast</p>

      <h1 style="margin:0 0 12px;font-family:'Cormorant Garamond',Georgia,serif;font-weight:400;font-size:30px;line-height:1.2;color:#FFFFFF;">
        It&rsquo;s on the way.
      </h1>
      <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#9A9AA2;">
        Order <span style="color:#ECECEE;">#${escapeHtml(String(displayId))}</span> has shipped. The wait is the smallest part — what arrives is yours.
      </p>

      ${rows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0;">${rows}</table>` : ''}
      ${trackingBlock}

      <p style="margin:36px 0 0;font-size:12px;line-height:1.6;color:#5C5C63;">
        Broadcast live, and shaped to you. — Lumera
      </p>
    </div>
  </body>
</html>`;

  return {
    to: order.email ?? '',
    subject: `Your Lumera order #${displayId} has shipped`,
    html,
  };
}

interface AbandonedCartLike {
  email?: string;
  currency_code?: string;
  url?: string;
  items?: Array<{ title?: string; quantity?: number; unit_price?: number }>;
}

/**
 * Brand-aligned abandoned-cart recovery — same dark luminous editorial palette as the order
 * notices. Leans on the drop-culture motto ("Some things only happen once.") and Lumera's
 * reverent, sharp voice. Money is integer cents ÷100 via the shared money() helper. The CTA
 * link is optional; the body adapts when no recovery URL is supplied.
 */
export function renderAbandonedCart(cart: AbandonedCartLike): SendEmailInput {
  const currency = cart.currency_code || 'USD';
  const items = cart.items ?? [];
  const subtotal = items.reduce((s, i) => s + (i.unit_price ?? 0) * (i.quantity ?? 1), 0);

  const rows = items
    .map((i) => {
      const line = (i.unit_price ?? 0) * (i.quantity ?? 1);
      return `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #1c1c22;color:#ECECEE;font-size:15px;">
            ${escapeHtml(i.title ?? 'Item')} <span style="color:#7A7A82;">×${i.quantity ?? 1}</span>
          </td>
          <td style="padding:14px 0;border-bottom:1px solid #1c1c22;color:#ECECEE;font-size:15px;text-align:right;">
            ${money(line, currency)}
          </td>
        </tr>`;
    })
    .join('');

  const ctaBlock = cart.url
    ? `
      <p style="margin:32px 0 0;">
        <a href="${escapeHtml(cart.url)}" style="display:inline-block;padding:14px 28px;border:1px solid #C7A24B;border-radius:2px;color:#C7A24B;text-decoration:none;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;">
          Return to your selection &rarr;
        </a>
      </p>`
    : '';

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#0B0B0D;">
    <div style="max-width:560px;margin:0 auto;padding:48px 32px;background:#0B0B0D;font-family:Inter,Helvetica,Arial,sans-serif;color:#ECECEE;">
      <p style="margin:0 0 4px;letter-spacing:0.32em;text-transform:uppercase;font-size:11px;color:#C7A24B;">Lumera</p>
      <p style="margin:0 0 32px;letter-spacing:0.18em;text-transform:uppercase;font-size:10px;color:#7A7A82;">The Broadcast</p>

      <h1 style="margin:0 0 12px;font-family:'Cormorant Garamond',Georgia,serif;font-weight:400;font-size:30px;line-height:1.2;color:#FFFFFF;">
        You left something behind.
      </h1>
      <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#9A9AA2;">
        Some things only happen once. What you chose is still here &mdash; held, for now. Pick up where you left off before the moment passes.
      </p>

      ${rows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 8px;">
        ${rows}
        <tr>
          <td style="padding:18px 0 0;font-size:14px;letter-spacing:0.04em;text-transform:uppercase;color:#7A7A82;">Subtotal</td>
          <td style="padding:18px 0 0;font-size:18px;text-align:right;color:#FFFFFF;">${money(subtotal, currency)}</td>
        </tr>
      </table>` : ''}

      ${ctaBlock}

      <p style="margin:36px 0 0;font-size:12px;line-height:1.6;color:#5C5C63;">
        Broadcast live, and shaped to you. &mdash; Lumera
      </p>
      ${marketingFooter({ email: cart.email ?? '', reason: 'You’re receiving this because you started a checkout at Lumera.' })}
    </div>
  </body>
</html>`;

  return {
    to: cart.email ?? '',
    subject: 'You left something behind — your Lumera selection',
    html,
  };
}

interface ReviewRequestLike {
  email?: string;
  display_id?: string | number;
  /** Optional link to leave a review (or back to the order). */
  url?: string;
  items?: Array<{ title?: string }>;
}

/**
 * Brand-aligned post-purchase review request — same dark luminous editorial palette. Sent ONCE,
 * after the customer has had time to live with the piece. Asks for an honest word; never bribed or
 * incentivized (the Warden's no-fake-review gate is absolute — we want truth, not stars). CTA optional.
 */
export function renderReviewRequest(order: ReviewRequestLike): SendEmailInput {
  const items = order.items ?? [];
  const displayId = order.display_id ?? '';
  const lead = items[0]?.title ? escapeHtml(items[0].title as string) : 'your piece';

  const ctaBlock = order.url
    ? `
      <p style="margin:32px 0 0;">
        <a href="${escapeHtml(order.url)}" style="display:inline-block;padding:14px 28px;border:1px solid #C7A24B;border-radius:2px;color:#C7A24B;text-decoration:none;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;">
          Share a word &rarr;
        </a>
      </p>`
    : '';

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#0B0B0D;">
    <div style="max-width:560px;margin:0 auto;padding:48px 32px;background:#0B0B0D;font-family:Inter,Helvetica,Arial,sans-serif;color:#ECECEE;">
      <p style="margin:0 0 4px;letter-spacing:0.32em;text-transform:uppercase;font-size:11px;color:#C7A24B;">Lumera</p>
      <p style="margin:0 0 32px;letter-spacing:0.18em;text-transform:uppercase;font-size:10px;color:#7A7A82;">The Broadcast</p>

      <h1 style="margin:0 0 12px;font-family:'Cormorant Garamond',Georgia,serif;font-weight:400;font-size:30px;line-height:1.2;color:#FFFFFF;">
        How did it land?
      </h1>
      <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#9A9AA2;">
        You&rsquo;ve had ${lead} a little while now. If it earned its place, a few honest words would mean
        a great deal &mdash; and help the next person find what&rsquo;s worth having. No stars required, just the truth.
      </p>

      ${ctaBlock}

      <p style="margin:36px 0 0;font-size:12px;line-height:1.6;color:#5C5C63;">
        Broadcast live, and shaped to you. &mdash; Lumera
      </p>
      ${marketingFooter({ email: order.email ?? '', reason: 'You’re receiving this because you placed an order with Lumera.' })}
    </div>
  </body>
</html>`;

  return {
    to: order.email ?? '',
    subject: `How did it land? — your Lumera ${displayId ? `order #${displayId}` : 'piece'}`,
    html,
  };
}
