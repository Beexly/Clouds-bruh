'use client';

import Link from 'next/link';
import { useWishlist } from '../context/wishlist';
import { PageSignal } from './PageSignal';
import { BRAND } from '../lib/brand';

/**
 * Saved items surface. Reads from the WishlistProvider (localStorage-backed, best-effort synced to
 * the customer when signed in). Works fully signed-out and offline — there is no fetch here.
 */
export function WishlistView() {
  const { items, ready, remove } = useWishlist();

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-20">
      <PageSignal type="page_view" context={{ surface: 'wishlist' }} trackBehavior={false} />
      <p className="text-micro uppercase text-neutral-600">Your {BRAND}</p>
      <h1 className="mt-3 font-serif text-4xl font-light tracking-[0.08em] text-foil md:text-5xl">Wishlist</h1>

      {!ready ? (
        <p className="mt-10 text-sm text-neutral-600">Loading your saved offerings…</p>
      ) : items.length === 0 ? (
        <section className="mt-10">
          <p className="max-w-prose text-sm leading-relaxed text-neutral-400">
            Nothing saved yet. Tap the heart on any offering to keep it here — your wishlist follows you
            across devices when you are signed in.
          </p>
          <div className="mt-7">
            <Link
              href="/"
              className="border border-altar-gold/40 px-6 py-3 text-micro uppercase tracking-[0.28em] text-altar-goldlight transition hover:border-altar-gold"
            >
              Explore the Broadcast
            </Link>
          </div>
        </section>
      ) : (
        <>
          <p className="mt-4 text-sm text-neutral-500">
            {items.length} saved offering{items.length === 1 ? '' : 's'}.
          </p>
          <ul className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <li key={it.id} className="group relative">
                <Link href={`/p/${it.handle}`} className="block">
                  <div className="relative aspect-[3/4] overflow-hidden bg-neutral-950">
                    {it.image ? (
                      <img
                        src={it.image}
                        alt={it.title}
                        className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="h-full w-full bg-neutral-900" />
                    )}
                  </div>
                  <div className="mt-3">
                    {it.chapter && (
                      <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">{it.chapter}</p>
                    )}
                    <h3 className="font-serif text-neutral-100">{it.title}</h3>
                    {it.price && <p className="mt-1 text-sm text-neutral-400">{it.price}</p>}
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => remove(it.id)}
                  className="mt-3 text-micro uppercase tracking-[0.28em] text-neutral-500 underline underline-offset-4 transition-colors hover:text-foil"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
