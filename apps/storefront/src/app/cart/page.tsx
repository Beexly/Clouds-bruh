'use client';
import Link from 'next/link';
import { useCart } from '../../context/cart';
import { PageSignal } from '../../components/PageSignal';
import { RewardsPanel } from '../../components/RewardsPanel';
import { shippingLadder } from '../../lib/shipping-ladder';

export default function CartPage() {
  const { cart, remove } = useCart();
  const items: any[] = cart?.items ?? [];
  const total = items.reduce((s: number, li: any) => s + (li.unit_price ?? 0) * (li.quantity ?? 1), 0);

  return (
    <main className="min-h-screen bg-black px-6 py-12">
      <PageSignal type="page_view" context={{ page: 'cart' }} />
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-10 font-serif text-3xl text-neutral-100">Your Cart</h1>

        {items.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-neutral-600">Nothing here yet.</p>
            <Link href="/" className="mt-4 block text-xs uppercase tracking-widest text-neutral-500 hover:text-neutral-300">
              ← The Broadcast
            </Link>
          </div>
        ) : (
          <>
            <div className="divide-y divide-neutral-900">
              {items.map((item: any) => (
                <div key={item.id} className="flex items-start gap-4 py-6">
                  {item.thumbnail && (
                    <img src={item.thumbnail} alt={item.title} className="h-20 w-16 object-cover bg-neutral-950" />
                  )}
                  <div className="flex-1">
                    <h3 className="text-sm text-neutral-200">{item.title}</h3>
                    {item.variant_title && item.variant_title !== 'Standard' && (
                      <p className="text-xs text-neutral-600">{item.variant_title}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-neutral-500">
                        {item.quantity} × ${((item.unit_price ?? 0) / 100).toFixed(2)}
                      </span>
                      <button
                        onClick={() => remove(item.id)}
                        className="text-[10px] uppercase tracking-widest text-neutral-700 hover:text-red-400"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-neutral-900 pt-6 flex items-center justify-between">
              <span className="text-sm text-neutral-400">Total</span>
              <span className="font-serif text-xl text-neutral-100">${(total / 100).toFixed(2)}</span>
            </div>

            {(() => {
              const ladder = shippingLadder(total);
              if (!ladder.enabled) return null;
              return (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className={ladder.remainingCents === 0 ? 'text-altar-goldlight' : 'text-neutral-400'}>
                      {ladder.message}
                    </span>
                    <span className="text-neutral-600">${(ladder.thresholdCents / 100).toFixed(0)}</span>
                  </div>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-neutral-900">
                    <div
                      className="h-full rounded-full bg-altar-gold/70 transition-all"
                      style={{ width: `${Math.round(ladder.progress * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })()}

            <div className="mt-6">
              <RewardsPanel cartTotalCents={total} />
            </div>

            <Link
              href="/checkout"
              className="mt-6 block w-full border border-neutral-700 py-4 text-center text-xs uppercase tracking-[0.3em] text-neutral-300 hover:border-neutral-500 hover:text-neutral-100 transition"
            >
              Proceed to Checkout
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
