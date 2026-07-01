'use client';
import { useState, useEffect } from 'react';
import { useCart } from '../../context/cart';
import { DEMO } from '../../lib/demo';
import { signal } from '../../lib/signal';
import { PageSignal } from '../../components/PageSignal';
import { PayPalButtons } from '../../components/payment/PayPalButtons';
import { StripeCardForm } from '../../components/payment/StripeCardForm';
import {
  apiFetch, getShippingOptions, addShippingMethod,
  createPaymentCollection, initPaymentSession, completeCart, getShippingEstimate,
  paypalProviderAvailable, stripeProviderAvailable,
} from '../../lib/api';

type Step = 'shipping' | 'payment' | 'complete';

// Real-payment rails are gated on configured client-side keys AND backend provider availability.
// When neither rail is configured we keep the existing pp_system_default test flow exactly as-is.
const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

export default function CheckoutPage() {
  const { cart, refresh } = useCart();
  const [step, setStep] = useState<Step>('shipping');
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    address_1: '', city: '', postal_code: '', country_code: 'us',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [orderId, setOrderId] = useState('');
  const [shippingPromise, setShippingPromise] = useState<any>(null);
  // Whether the backend PayPal provider is actually enabled for this cart's region. Defaults false
  // so a misconfigured env (client id set, provider not wired) safely falls back to the test flow.
  const [paypalEnabled, setPaypalEnabled] = useState(false);
  // Same defensive default for the Stripe card rail: key set but provider not wired → test flow.
  const [stripeEnabled, setStripeEnabled] = useState(false);

  const items: any[] = cart?.items ?? [];
  const total = items.reduce((s: number, li: any) => s + (li.unit_price ?? 0) * (li.quantity ?? 1), 0);

  // Detect PayPal availability once a cart with a region exists. Defensive: any failure → test flow.
  useEffect(() => {
    let active = true;
    const regionId = cart?.region_id ?? cart?.region?.id;
    if (!PAYPAL_CLIENT_ID || !regionId) {
      setPaypalEnabled(false);
      return;
    }
    paypalProviderAvailable(regionId)
      .then((ok) => { if (active) setPaypalEnabled(ok); })
      .catch(() => { if (active) setPaypalEnabled(false); });
    return () => { active = false; };
  }, [cart?.region_id, cart?.region?.id]);

  // Detect Stripe availability the same way. Defensive: any failure → test flow.
  useEffect(() => {
    let active = true;
    const regionId = cart?.region_id ?? cart?.region?.id;
    if (!STRIPE_PUBLISHABLE_KEY || !regionId) {
      setStripeEnabled(false);
      return;
    }
    stripeProviderAvailable(regionId)
      .then((ok) => { if (active) setStripeEnabled(ok); })
      .catch(() => { if (active) setStripeEnabled(false); });
    return () => { active = false; };
  }, [cart?.region_id, cart?.region?.id]);

  const usePayPal = Boolean(PAYPAL_CLIENT_ID) && paypalEnabled;
  const useStripeRail = Boolean(STRIPE_PUBLISHABLE_KEY) && stripeEnabled;

  const handleRailSuccess = (newOrderId: string) => {
    signal('purchase', newOrderId, total / 100);
    localStorage.removeItem('axiv_cart');
    setOrderId(newOrderId);
    setStep('complete');
  };

  const handleShipping = async () => {
    if (!cart) return;
    setBusy(true); setError('');
    try {
      signal('checkout_step', undefined, 'shipping');

      // 1. Set email + shipping address on cart
      await apiFetch(`/store/carts/${cart.id}`, {
        method: 'POST',
        body: JSON.stringify({
          email: form.email,
          shipping_address: {
            first_name: form.first_name, last_name: form.last_name,
            address_1: form.address_1, city: form.city,
            postal_code: form.postal_code, country_code: form.country_code,
          },
        }),
      });

      // 2. Get available shipping options and pick the first one
      const options = await getShippingOptions(cart.id);
      if (options.length > 0) {
        await addShippingMethod(cart.id, options[0].id);
      }

      const promise = await getShippingEstimate(
        items.map((li: any) => ({
          lead_time_days: Number(li.variant?.product?.metadata?.lead_time_days ?? li.metadata?.lead_time_days ?? 0),
        }))
      ).catch(() => null);
      setShippingPromise(promise);

      await refresh();
      setStep('payment');
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  const handleComplete = async () => {
    if (!cart) return;
    setBusy(true); setError('');
    try {
      signal('checkout_step', undefined, 'payment');

      // 3. Create payment collection for cart
      const collection = await createPaymentCollection(cart.id);

      // 4. Initialize payment session with system provider (test mode)
      await initPaymentSession(collection.id, 'pp_system_default');

      // 5. Complete the cart → creates order
      const result = await completeCart(cart.id);
      const order = result.order ?? result;

      if (order?.id) {
        signal('purchase', order.id, total / 100);
        localStorage.removeItem('axiv_cart');
        setOrderId(order.id);
        setStep('complete');
      } else {
        setError('Order could not be completed. Please try again.');
      }
    } catch (e: any) {
      setError(e.message || 'Could not complete order. Try again.');
    }
    finally { setBusy(false); }
  };

  // Demo mode has no backend/payment rails — show an honest notice instead of a broken payment form.
  if (DEMO) {
    return (
      <main className="min-h-screen bg-void bg-sacred-grain px-6 py-24">
        <div className="mx-auto max-w-md text-center">
          <p className="text-micro uppercase tracking-sacred text-neutral-600">Preview</p>
          <h1 className="mt-3 font-serif text-3xl font-light text-neutral-100">Checkout is off in the preview</h1>
          <p className="mt-4 text-sm leading-relaxed text-neutral-400">
            This is a live preview of the Lumera storefront. Browsing, drops, search, and the cart all
            work — but taking payment needs the full store connected (backend + Stripe). See
            <span className="text-altar-goldlight"> docs/GO_LIVE.md</span> to switch it on.
          </p>
          <a href="/" className="mt-8 inline-block border border-neutral-700 px-6 py-3 text-micro uppercase tracking-wide text-neutral-300 transition hover:border-neutral-500 hover:text-neutral-100">
            Back to the Broadcast
          </a>
        </div>
      </main>
    );
  }

  if (!items.length && step !== 'complete') {
    return (
      <main className="min-h-screen bg-black px-6 py-12 text-center">
        <p className="text-neutral-600 text-sm">Your cart is empty.</p>
      </main>
    );
  }

  if (step === 'complete') {
    return (
      <main className="min-h-screen bg-black px-6 py-20 text-center">
        <h1 className="font-serif text-4xl text-neutral-100">Order Received</h1>
        <p className="mt-4 text-xs uppercase tracking-widest text-neutral-500">
          We've got it. Your order is on its way.
        </p>
        {orderId && (
          <p className="mt-2 text-[10px] text-neutral-700 font-mono">{orderId}</p>
        )}
        <a href="/" className="mt-10 block text-xs uppercase tracking-widest text-neutral-500 hover:text-neutral-300">
          ← Return to The Broadcast
        </a>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-12">
      <PageSignal type="page_view" context={{ page: 'checkout' }} />
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 font-serif text-3xl text-neutral-100">Checkout</h1>

        {/* Order summary */}
        <div className="mb-8 border border-neutral-900 p-4">
          <p className="mb-3 text-[10px] uppercase tracking-widest text-neutral-600">Order Summary</p>
          {items.map((li: any) => (
            <div key={li.id} className="flex justify-between py-1 text-xs text-neutral-400">
              <span>{li.title} × {li.quantity}</span>
              <span>${((li.unit_price * li.quantity) / 100).toFixed(2)}</span>
            </div>
          ))}
          <div className="mt-3 flex justify-between border-t border-neutral-900 pt-3 text-sm text-neutral-200">
            <span>Total</span><span>${(total / 100).toFixed(2)}</span>
          </div>
        </div>

        {step === 'shipping' && (
          <div className="space-y-4">
            <p className="text-[10px] uppercase tracking-widest text-neutral-600">Shipping Details</p>
            {([
              ['Email', 'email', 'email'],
              ['First Name', 'first_name', 'given-name'],
              ['Last Name', 'last_name', 'family-name'],
              ['Address', 'address_1', 'address-line1'],
              ['City', 'city', 'address-level2'],
              ['Postal Code', 'postal_code', 'postal-code'],
            ] as [string, string, string][]).map(([label, key, auto]) => (
              <div key={key}>
                <label className="mb-1 block text-[10px] uppercase tracking-widest text-neutral-600">{label}</label>
                <input
                  autoComplete={auto}
                  value={(form as any)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 outline-none focus:border-neutral-600"
                />
              </div>
            ))}
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              onClick={handleShipping}
              disabled={busy}
              className="mt-4 w-full border border-neutral-700 py-4 text-xs uppercase tracking-[0.3em] text-neutral-300 transition hover:border-neutral-500 disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Continue to Payment'}
            </button>
          </div>
        )}

        {step === 'payment' && (
          <div className="space-y-4">
            <p className="text-[10px] uppercase tracking-widest text-neutral-600">
              {useStripeRail || usePayPal ? 'Payment' : 'Payment (Test Mode)'}
            </p>

            <div className="space-y-2 border border-amber-700/20 bg-amber-900/5 p-4">
              <p className="text-[10px] uppercase tracking-widest text-amber-300/80">Fulfillment Promise</p>
              <p className="text-xs text-neutral-400">
                {shippingPromise?.message ?? 'Estimated delivery window: 8-12 business days.'}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-neutral-700">
                Orders that exceed the promised ship window require delay consent or refund handling.
              </p>
            </div>

            <div className="border border-neutral-900 p-3 text-[10px] text-neutral-700">
              <p className="mb-1 uppercase tracking-widest">Order Total</p>
              <p className="text-sm text-neutral-400">${(total / 100).toFixed(2)} USD</p>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            {/* Real payment rails when configured + enabled; otherwise the test flow below.
                Card rail (Stripe Elements; Apple/Google Pay ride the same PaymentElement) is primary;
                PayPal renders alongside it. */}
            {useStripeRail && cart && (
              <StripeCardForm
                cartId={cart.id}
                publishableKey={STRIPE_PUBLISHABLE_KEY}
                onSuccess={handleRailSuccess}
                onError={(msg) => setError(msg)}
              />
            )}
            {useStripeRail && usePayPal && (
              <p className="text-center text-[10px] uppercase tracking-widest text-neutral-700">— or —</p>
            )}
            {usePayPal && cart && (
              <PayPalButtons
                cartId={cart.id}
                clientId={PAYPAL_CLIENT_ID}
                totalCents={total}
                currency={(cart?.region?.currency_code ?? cart?.currency_code ?? 'USD').toUpperCase()}
                onSuccess={handleRailSuccess}
                onError={(msg) => setError(msg)}
              />
            )}
            {!useStripeRail && !usePayPal && (
              <>
                <div className="border border-neutral-800 p-4 space-y-2">
                  <p className="text-xs text-neutral-500">
                    This is a test-mode order — no real payment is processed.
                  </p>
                  <p className="text-[10px] text-neutral-700 uppercase tracking-widest">
                    Provider: pp_system_default
                  </p>
                  <p className="text-[10px] text-neutral-600">
                    Real payment requires a configured provider (set NEXT_PUBLIC_PAYPAL_CLIENT_ID and
                    enable the PayPal provider on the backend).
                  </p>
                </div>
                <button
                  onClick={handleComplete}
                  disabled={busy}
                  className="w-full border border-amber-700/50 py-4 text-xs uppercase tracking-[0.3em] text-amber-300 transition hover:border-amber-600 disabled:opacity-50"
                >
                  {busy ? 'Processing…' : 'Complete Order'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
