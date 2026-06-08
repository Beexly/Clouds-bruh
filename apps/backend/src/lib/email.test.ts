import { describe, it, expect, afterEach } from 'vitest';
import { sendEmail, renderOrderConfirmation, trackKlaviyoEvent } from './email';

const savedResend = process.env.RESEND_API_KEY;
const savedKlaviyo = process.env.KLAVIYO_API_KEY;

describe('email — sendEmail gating', () => {
  afterEach(() => {
    if (savedResend === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = savedResend;
  });

  it('no-ops with reason "no_api_key" when RESEND_API_KEY is unset', async () => {
    delete process.env.RESEND_API_KEY;
    const result = await sendEmail({ to: 'a@b.com', subject: 'Hi', html: '<p>hi</p>' });
    expect(result.sent).toBe(false);
    expect(result.reason).toBe('no_api_key');
  });
});

describe('email — trackKlaviyoEvent gating', () => {
  afterEach(() => {
    if (savedKlaviyo === undefined) delete process.env.KLAVIYO_API_KEY;
    else process.env.KLAVIYO_API_KEY = savedKlaviyo;
  });

  it('no-ops with reason "no_api_key" when KLAVIYO_API_KEY is unset', async () => {
    delete process.env.KLAVIYO_API_KEY;
    const result = await trackKlaviyoEvent('Placed Order', 'a@b.com', { order_id: 'o_1' });
    expect(result.sent).toBe(false);
    expect(result.reason).toBe('no_api_key');
  });
});

describe('email — renderOrderConfirmation', () => {
  it('renders brand HTML containing the order total', () => {
    const out = renderOrderConfirmation({
      id: 'order_1',
      display_id: 42,
      email: 'patron@lumera.example',
      currency_code: 'usd',
      items: [
        { title: 'Eclipse Hoodie', quantity: 2, unit_price: 12000 },
        { title: 'Gold Pendant', quantity: 1, unit_price: 8000 },
      ],
    });

    expect(out.to).toBe('patron@lumera.example');
    expect(out.subject).toContain('42');
    // Total = 2*120 + 80 = $320.00 — must appear in the rendered HTML.
    expect(out.html).toContain('$320.00');
    expect(out.html).toContain('Lumera');
    expect(out.html).toContain('Eclipse Hoodie');
  });

  it('prefers an explicit order.total when provided', () => {
    const out = renderOrderConfirmation({
      id: 'order_2',
      display_id: 7,
      email: 'x@y.com',
      currency_code: 'usd',
      total: 5000,
      items: [{ title: 'Thing', quantity: 1, unit_price: 9999 }],
    });
    expect(out.html).toContain('$50.00');
  });
});
