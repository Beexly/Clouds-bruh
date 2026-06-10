import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { verifyUnsubscribeToken } from '../../lib/email-compliance';
import { recordUnsubscribe } from '../../lib/newsletter';

/**
 * GET /unsubscribe?token=… — one-click CAN-SPAM unsubscribe from marketing email links.
 *
 * Top-level (not under /store or /admin) so an email-client GET needs no publishable key and no login.
 * The token is an HMAC-signed copy of the recipient's address (see lib/email-compliance), so we verify
 * it and record suppression without a lookup — and it can't be forged to opt out someone else.
 */

function page(message: string, ok: boolean): string {
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" /><title>Lumera</title></head>
  <body style="margin:0;background:#0B0B0D;font-family:Inter,Helvetica,Arial,sans-serif;color:#ECECEE;">
    <div style="max-width:480px;margin:0 auto;padding:80px 32px;text-align:center;">
      <p style="margin:0 0 4px;letter-spacing:0.32em;text-transform:uppercase;font-size:11px;color:#C7A24B;">Lumera</p>
      <p style="margin:0 0 32px;letter-spacing:0.18em;text-transform:uppercase;font-size:10px;color:#7A7A82;">The Broadcast</p>
      <h1 style="margin:0 0 12px;font-family:'Cormorant Garamond',Georgia,serif;font-weight:400;font-size:26px;color:${ok ? '#FFFFFF' : '#E8C9C9'};">
        ${ok ? 'You’re unsubscribed.' : 'This link didn’t work.'}
      </h1>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#9A9AA2;">${message}</p>
    </div>
  </body>
</html>`;
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const email = verifyUnsubscribeToken(req.query?.token);
  if (!email) {
    res.status(400).set('Content-Type', 'text/html; charset=utf-8');
    return res.send(page('This unsubscribe link is invalid or has expired. If you keep getting emails, reply to one and we’ll remove you.', false));
  }
  await recordUnsubscribe(email).catch(() => {});
  res.status(200).set('Content-Type', 'text/html; charset=utf-8');
  return res.send(page('You won’t receive marketing emails from Lumera. Order and shipping notices will still reach you.', true));
};
