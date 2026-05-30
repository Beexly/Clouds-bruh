'use client';
import { signal } from '../lib/signal';
import type { Product } from '@alterxiv/shared';

/** The conversion primitives, mined from the Amazon/Walmart/Shein datasets, made tasteful. */
export function ProductCard({ p }: { p: Product }) {
  const lowStock = (p.merch.units_remaining ?? 99) <= 10;
  return (
    <a href={`/p/${p.handle}`} onClick={() => signal('product_view', p.id, undefined, { chapter: p.chapter })}
       className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-neutral-950">
        <img src={p.media.main_image} alt={p.title} className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
        {p.social.badge && <span className="absolute left-3 top-3 text-[10px] tracking-widest uppercase text-amber-200/80">{p.social.badge}</span>}
        {lowStock && <span className="absolute right-3 top-3 text-[10px] tracking-widest text-red-300/80">{p.merch.units_remaining} left</span>}
      </div>
      <div className="mt-3">
        <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">{p.chapter}</p>
        <h3 className="font-serif text-neutral-100">{p.title}</h3>
        <div className="mt-1 flex items-center justify-between text-sm text-neutral-400">
          <span>${p.price.final}</span>
          {p.social.reviews_count ? <span>★ {p.social.rating} · {p.social.reviews_count}</span> : null}
        </div>
      </div>
    </a>
  );
}
