'use client';

import { useEffect, useRef, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import {
  completeCart,
  createPaymentCollection,
  initPaymentSession,
  STRIPE_PROVIDER_ID,
  stripeClientSecretFromCollection,
} from '../../lib/api';

/**
 * Stripe Elements card form for Lumera checkout (closes TODO(stripe) — ledger B1; express wallets
 * ride the same PaymentElement, covering D3).
 *
 * The parent gates rendering exactly like PayPal: only when NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is
 * set AND the backend Stripe provider is enabled for the cart's region. Flow:
 *
 *   1. createPaymentCollection(cart)                    — Medusa payment collection
 *   2. initPaymentSession(collection, pp_stripe_stripe) — provider creates the PaymentIntent server-side
 *   3. <PaymentElement> renders card + wallets against the server-issued client_secret
 *   4. stripe.confirmPayment (redirect: 'if_required')  → completeCart → Medusa order
 *
 * Money note: amounts are integer CENTS everywhere in Lumera; the PaymentIntent amount is produced
 * by the BACKEND provider. The browser only references the server-created client_secret — it never
 * computes or transmits the charge amount — so there is no client-side money-unit hazard here.
 */

interface StripeCardFormProps {
  cartId: string;
  publishableKey: string;
  onSuccess: (orderId: string) => void;
  onError: (message: string) => void;
}

function InnerForm({ cartId, onSuccess, onError }: Omit<StripeCardFormProps, 'publishableKey'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);

  const handlePay = async () => {
    if (!stripe || !elements || paying) return;
    setPaying(true);
    onError('');
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: `${window.location.origin}/checkout` },
        redirect: 'if_required',
      });
      if (error) {
        // Declines land here (e.g. Stripe test card 4000 0000 0000 0002). Honest failure: no order.
        onError(error.message || 'Payment failed. Your card was not charged.');
        return;
      }
      const status = paymentIntent?.status;
      if (status !== 'succeeded' && status !== 'requires_capture' && status !== 'processing') {
        onError(`Payment not completed (status: ${status ?? 'unknown'}). Your card was not charged.`);
        return;
      }
      // Payment is in. Completing the cart converts it into a Medusa order.
      const result = await completeCart(cartId);
      const order = result.order ?? result;
      if (order?.id) {
        onSuccess(order.id);
      } else {
        // Money honesty: the charge went through but order creation did not return an id.
        // Never tell the shopper to retry payment here.
        onError(
          'Your payment was received but the order confirmation failed. Do NOT retry payment — ' +
            'contact support and we will confirm your order.'
        );
      }
    } catch (e: any) {
      onError(e?.message || 'Payment failed.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      <button
        onClick={handlePay}
        disabled={!stripe || !elements || paying}
        className="w-full border border-amber-700/50 py-4 text-xs uppercase tracking-[0.3em] text-amber-300 transition hover:border-amber-600 disabled:opacity-50"
      >
        {paying ? 'Processing…' : 'Pay Now'}
      </button>
    </div>
  );
}

export function StripeCardForm({ cartId, publishableKey, onSuccess, onError }: StripeCardFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // loadStripe must be called once per key — keep the promise stable across renders.
  const stripePromiseRef = useRef<ReturnType<typeof loadStripe> | null>(null);
  if (!stripePromiseRef.current && publishableKey) {
    stripePromiseRef.current = loadStripe(publishableKey);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const collection = await createPaymentCollection(cartId);
        const updated = await initPaymentSession(collection.id, STRIPE_PROVIDER_ID);
        const secret = stripeClientSecretFromCollection(updated);
        if (!secret) throw new Error('Stripe session did not return a client secret.');
        if (active) setClientSecret(secret);
      } catch (e: any) {
        if (active) {
          setFailed(true);
          onError(e?.message || 'Could not start card payment.');
        }
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartId]);

  if (failed) return null; // parent shows the error; test flow remains available on reload
  if (!clientSecret || !stripePromiseRef.current) {
    return (
      <p className="text-[10px] uppercase tracking-widest text-neutral-600">Loading secure card form…</p>
    );
  }

  return (
    <Elements
      stripe={stripePromiseRef.current}
      options={{
        clientSecret,
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary: '#fbbf24',
            colorBackground: '#0a0a0a',
            colorText: '#e5e5e5',
            borderRadius: '0px',
          },
        },
      }}
    >
      <InnerForm cartId={cartId} onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
}
