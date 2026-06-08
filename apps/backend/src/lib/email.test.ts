import { describe, it, expect, afterEach } from 'vitest';
import {
  sendEmail,
  renderOrderConfirmation,
  renderShipmentNotification,
  renderAbandonedCart,
  trackKlaviyoEvent,
} from './email';

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

describe('email — renderShipmentNotification', () => {
  it('renders a shipped notice with the order number, items, and tracking', () => {
    const out = renderShipmentNotification({
      id: 'order_3',
      display_id: 99,
      email: 'patron@lumera.example',
      currency_code: 'usd',
      items: [{ title: 'Eclipse Hoodie', quantity: 1, unit_price: 12000 }],
      tracking_number: '1Z999AA10123456784',
      tracking_url: 'https://track.example/1Z999AA10123456784',
      carrier: 'UPS',
    });

    expect(out.to).toBe('patron@lumera.example');
    expect(out.subject).toContain('99');
    expect(out.subject.toLowerCase()).toContain('shipped');
    expect(out.html).toContain('Eclipse Hoodie');
    expect(out.html).toContain('1Z999AA10123456784');
    expect(out.html).toContain('https://track.example/1Z999AA10123456784');
    expect(out.html).toContain('UPS');
  });

  it('omits the tracking block when no tracking is present', () => {
    const out = renderShipmentNotification({
      id: 'order_4',
      display_id: 100,
      email: 'x@y.com',
      items: [{ title: 'Thing', quantity: 1 }],
    });
    expect(out.html).not.toContain('Tracking');
    expect(out.html).toContain('Thing');
  });
});

describe('email — renderAbandonedCart', () => {
  it('renders brand HTML with items and the subtotal', () => {
    const out = renderAbandonedCart({
      email: 'patron@lumera.example',
      currency_code: 'usd',
      url: 'https://lumera.example/cart',
      items: [
        { title: 'Eclipse Hoodie', quantity: 2, unit_price: 12000 },
        { title: 'Gold Pendant', quantity: 1, unit_price: 8000 },
      ],
    });

    expect(out.to).toBe('patron@lumera.example');
    expect(out.subject.toLowerCase()).toContain('left something behind');
    // Subtotal = 2*120 + 80 = $320.00
    expect(out.html).toContain('$320.00');
    expect(out.html).toContain('Lumera');
    expect(out.html).toContain('Eclipse Hoodie');
    expect(out.html).toContain('https://lumera.example/cart');
  });

  it('omits the CTA block when no recovery url is provided', () => {
    const out = renderAbandonedCart({
      email: 'x@y.com',
      items: [{ title: 'Thing', quantity: 1, unit_price: 5000 }],
    });
    expect(out.html).not.toContain('Return to your selection');
    expect(out.html).toContain('Thing');
    expect(out.html).toContain('$50.00');
  });
});
