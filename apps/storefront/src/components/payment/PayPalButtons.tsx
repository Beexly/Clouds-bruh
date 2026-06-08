'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import {
  createPaymentCollection,
  initPaymentSession,
  completeCart,
  paypalOrderIdFromCollection,
  PAYPAL_PROVIDER_ID,
} from '../../lib/api';

/**
 * PayPal Smart Buttons for Lumera checkout.
 *
 * Real-payment rail, gated by NEXT_PUBLIC_PAYPAL_CLIENT_ID (the parent only renders this when the id
 * is set AND the backend PayPal provider is enabled for the region). We load the PayPal JS SDK from
 * the CDN via next/script (no npm dep) and drive the Medusa flow:
 *
 *   1. createPaymentCollection(cart)              — Medusa payment collection
 *   2. initPaymentSession(collection, paypal)     — our custom provider creates a PayPal Orders v2 order
 *   3. button.createOrder → return the PayPal order id stored on the Medusa session
 *   4. button.onApprove → completeCart → Medusa authorizes/captures via the provider, creating the order
 *
 * Money note: amounts are integer CENTS everywhere in Lumera; the PayPal amount string (decimal major
 * units) is produced by the BACKEND provider at the boundary (formatPayPalAmount). The browser never
 * computes the charge amount — it only references the server-created order id — so there is no
 * client-side money-unit hazard here.
 */

declare global {
  interface Window {
    paypal?: any;
  }
}

interface PayPalButtonsProps {
  cartId: string;
  clientId: string;
  /** Total in integer cents — display only; the charge amount comes from the server session. */
  totalCents: number;
  currency?: string;
  onSuccess: (orderId: string) => void;
  onError: (message: string) => void;
}

export function PayPalButtons({
  cartId,
  clientId,
  currency = 'USD',
  onSuccess,
  onError,
}: PayPalButtonsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.paypal) setSdkReady(true);
  }, []);

  useEffect(() => {
    if (!sdkReady || renderedRef.current || !containerRef.current || !window.paypal?.Buttons) return;
    renderedRef.current = true;

    try {
      window.paypal
        .Buttons({
          style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },

          // Create the PayPal order on OUR backend (via the Medusa payment session), then hand its id
          // to the PayPal SDK. We never create the order client-side, so the amount stays server-trusted.
          createOrder: async () => {
            setWorking(true);
            try {
              const collection = await createPaymentCollection(cartId);
              const updated = await initPaymentSession(collection.id, PAYPAL_PROVIDER_ID);
              const orderId = paypalOrderIdFromCollection(updated) ?? paypalOrderIdFromCollection(collection);
              if (!orderId) {
                throw new Error('PayPal order could not be initialized on the server.');
              }
              return orderId;
            } catch (e) {
              setWorking(false);
              const msg = e instanceof Error ? e.message : 'Could not start PayPal payment.';
              onError(msg);
              throw e;
            }
          },

          // PayPal approved the order; complete the Medusa cart. The backend provider authorizes/
          // captures the PayPal order during completion, producing the Medusa order.
          onApprove: async () => {
            try {
              const result = await completeCart(cartId);
              const order = result?.order ?? result;
              if (order?.id) {
                onSuccess(String(order.id));
              } else {
                onError('Payment captured but the order could not be finalized. Contact support.');
              }
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Could not complete your order after payment.';
              onError(msg);
            } finally {
              setWorking(false);
            }
          },

          onCancel: () => {
            setWorking(false);
          },

          onError: (err: unknown) => {
            setWorking(false);
            const msg = err instanceof Error ? err.message : 'PayPal encountered an error.';
            onError(msg);
          },
        })
        .render(containerRef.current);
    } catch (e) {
      renderedRef.current = false;
      onError(e instanceof Error ? e.message : 'Could not render PayPal buttons.');
    }
  }, [sdkReady, cartId, onSuccess, onError]);

  const sdkSrc = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
    clientId
  )}&currency=${encodeURIComponent(currency)}&intent=capture`;

  return (
    <div className="space-y-3">
      <Script
        src={sdkSrc}
        strategy="afterInteractive"
        onLoad={() => setSdkReady(true)}
        onError={() => onError('PayPal could not load. Please retry or use another method.')}
      />
      <div className="border border-neutral-800 p-4">
        <p className="text-[10px] uppercase tracking-widest text-neutral-600">Pay with PayPal</p>
        <p className="mt-1 text-[10px] text-neutral-700">
          Secure checkout via PayPal. You can pay with your balance or a card.
        </p>
      </div>
      {!sdkReady && (
        <p className="text-xs text-neutral-600">Loading secure PayPal checkout…</p>
      )}
      <div ref={containerRef} aria-busy={working} />
      {working && <p className="text-xs text-neutral-500">Processing payment…</p>}
    </div>
  );
}

export default PayPalButtons;
