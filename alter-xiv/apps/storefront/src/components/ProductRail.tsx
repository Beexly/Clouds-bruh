'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { signal } from '../lib/signal';
import { useCart } from '../context/cart';

const RAIL_LABELS: Record<string, string> = {
  for_you: 'For You',
  trending_in_chapter: 'Trending',
  complete_the_set: 'Complete the Set',
  because_you_viewed: 'Because You Viewed',
  new_in_signal: 'New in Signal',
  live_drops: 'Live Drops',
};

interface Props {
  blockName: string;
  products: any[];
}

export function ProductRail({ blockName, products }: Props) {
  const { add } = useCart();

  useEffect(() => {
    if (products.length > 0) {
      signal('recommendation_impression', undefined, products.length, { block: blockName });
    }
  }, [blockName, products.length]);

  if (!products.length) return null;

  return (
    <section className="px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-6 text-[11px] uppercase tracking-[0.3em] text-neutral-500">
          {RAIL_LABELS[blockName] ?? blockName}
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
          {products.slice(0, 8).map((p: any) => (
            <ProductCard key={p.id} p={p} onAddToCart={() => add(p.variants?.[0]?.id, p.id, p.metadata?.chapter)} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductCard({ p, onAddToCart }: { p: any; onAddToCart: () => void }) {
  const img = p.thumbnail || p.images?.[0]?.url || p.metadata?.main_image || '';
  const chapter = p.metadata?.chapter ?? '';
  const price = p.variants?.[0]?.prices?.[0]?.amount;
  const priceStr = price != null ? `$${(price / 100).toFixed(2)}` : '';

  return (
    <div className="group">
      <Link
        href={`/p/${p.handle}`}
        onClick={() => signal('recommendation_click', p.id, undefined, { chapter })}
        className="block"
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-neutral-950">
          {img ? (
            <img
              src={img}
              alt={p.title}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full bg-neutral-900" />
          )}
          {chapter && (
            <span className="absolute left-2 top-2 text-[9px] uppercase tracking-widest text-amber-200/60">
              {chapter}
            </span>
          )}
        </div>
        <div className="mt-2 px-0.5">
          <h3 className="line-clamp-2 text-xs text-neutral-300">{p.title}</h3>
          {priceStr && <p className="mt-1 text-xs text-neutral-500">{priceStr}</p>}
        </div>
      </Link>
      {p.variants?.[0]?.id && (
        <button
          onClick={onAddToCart}
          className="mt-2 w-full border border-neutral-800 py-1.5 text-[10px] uppercase tracking-widest text-neutral-500 transition hover:border-neutral-600 hover:text-neutral-300"
        >
          Add
        </button>
      )}
    </div>
  );
}
