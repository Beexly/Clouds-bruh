'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '../../context/cart';
import { signal } from '../../lib/signal';
import { PageSignal } from '../../components/PageSignal';
import { apiFetch } from '../../lib/api';

export default function CheckoutPage() {
  const { cart, refresh } = useCart();
  const router = useRouter();
  const [step, setStep] = useState<'shipping' | 'payment' | 'complete'>('shipping');
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    address_1: '', city: '', postal_code: '', country_code: 'us',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const items: any[] = cart?.items ?? [];
  const total = items.reduce((s: number, li: any) => s + (li.unit_price ?? 0) * (li.quantity ?? 1), 0);

  const handleShipping = async () => {
    if (!cart) return;
    setBusy(true); setError('');
    try {
      signal('checkout_step', undefined, 'shipping');
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
      const { order } = await apiFetch(`/store/carts/${cart.id}/complete`, { method: 'POST' });
      if (order?.id) {
        signal('purchase', order.id, total / 100);
        localStorage.removeItem('axiv_cart');
        setStep('complete');
      }
    } catch (e: any) { setError(e.message || 'Could not complete order. Try again.'); }
    finally { setBusy(false); }
  };

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
          Be still. The armor is being prepared.
        </p>
        <p className="mt-2 text-[10px] text-neutral-700">Exodus 14:14</p>
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
            {[
              ['Email', 'email', 'email'],
              ['First Name', 'first_name', 'given-name'],
              ['Last Name', 'last_name', 'family-name'],
              ['Address', 'address_1', 'address-line1'],
              ['City', 'city', 'address-level2'],
              ['Postal Code', 'postal_code', 'postal-code'],
            ].map(([label, key, auto]) => (
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
            <p className="text-[10px] uppercase tracking-widest text-neutral-600">Payment (Test Mode)</p>
            <div className="border border-neutral-800 p-4 text-xs text-neutral-500">
              This is test mode — no real payment is processed.<br />
              Click Complete to place a test order.
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              onClick={handleComplete}
              disabled={busy}
              className="w-full border border-amber-700/50 py-4 text-xs uppercase tracking-[0.3em] text-amber-300 transition hover:border-amber-600 disabled:opacity-50"
            >
              {busy ? 'Processing…' : 'Complete Order'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
