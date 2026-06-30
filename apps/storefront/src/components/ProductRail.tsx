'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { signal } from '../lib/signal';
import { priceStr } from '../lib/catalog';
import { useCart } from '../context/cart';
import { ProductImage } from './ProductImage';

const RAIL_LABELS: Record<string, string> = {
  the_drop: 'The Pieces',
  your_chapters: 'Your Chapters',
  for_you: 'For You',
  trending_in_chapter: 'Trending in Chapter',
  complete_the_set: 'Complete the Set',
  because_you_viewed: 'Because You Viewed',
  graph_rec: 'Worn Together',
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
    <section className="px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center gap-4">
          <h2 className="text-label uppercase text-neutral-400">
            {RAIL_LABELS[blockName] ?? blockName}
          </h2>
          <span className="h-px flex-1 rule-sacred" />
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4">
          {products.slice(0, 8).map((p: any, i: number) => (
            <RailCard
              key={p.id}
              p={p}
              index={i}
              block={blockName}
              onAdd={() => add(p.variants?.[0]?.id, p.id, p.metadata?.chapter)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function RailCard({ p, index, block, onAdd }: { p: any; index: number; block: string; onAdd: () => void }) {
  const img = p.thumbnail || p.images?.[0]?.url || p.metadata?.main_image || '';
  const chapter = p.metadata?.chapter ?? '';
  const price = priceStr(p);
  const remaining = p.metadata?.units_remaining;
  const lowStock = remaining != null && Number(remaining) <= 10;
  const rating = p.metadata?.rating;
  const reviews = p.metadata?.reviews_count;
  const badge = p.metadata?.badge;
  const [added, setAdded] = useState(false);
  const [wished, setWished] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay: (index % 4) * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="group"
    >
      <Link
        href={`/p/${p.handle}`}
        onClick={() => signal('recommendation_click', p.id, undefined, { chapter, block })}
        className="block"
      >
        <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-obsidian">
          <ProductImage
            src={img}
            alt={p.title}
            chapter={chapter}
            imgClassName="h-full w-full object-cover transition-transform duration-700 ease-sacred group-hover:scale-[1.05]"
            loading="lazy"
          />
          {/* veil for legibility */}
          <span className="pointer-events-none absolute inset-0 bg-altar-veil opacity-60" />
          {chapter && (
            <span className="absolute left-3 top-3 text-micro uppercase text-altar-goldlight/80">
              {chapter}
            </span>
          )}
          {badge && (
            <span className="absolute right-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-[9px] uppercase tracking-wide text-altar-cream backdrop-blur">
              {badge}
            </span>
          )}
          {lowStock && (
            <span className="absolute bottom-3 left-3 animate-pulse-scarce text-micro uppercase text-chapter-relentless">
              {remaining} left
            </span>
          )}
          {/* wishlist */}
          <button
            aria-label="Save to wishlist"
            onClick={(e) => {
              e.preventDefault();
              setWished((w) => !w);
              signal('wishlist_add', p.id, undefined, { chapter });
            }}
            className="absolute bottom-3 right-3 text-base leading-none opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          >
            <span className={wished ? 'text-altar-gold' : 'text-white/70'}>{wished ? '♥' : '♡'}</span>
          </button>
        </div>
        <div className="mt-3 px-0.5">
          <h3 className="line-clamp-1 font-serif text-base text-neutral-100">{p.title}</h3>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-sm tabular-nums text-neutral-300">{price}</p>
            {reviews ? (
              <p className="text-micro tabular-nums text-neutral-500">★ {rating} · {reviews}</p>
            ) : null}
          </div>
        </div>
      </Link>
      {p.variants?.[0]?.id && (
        <button
          onClick={() => {
            onAdd();
            setAdded(true);
            setTimeout(() => setAdded(false), 1400);
          }}
          className="mt-2 w-full rounded-sm border border-white/10 py-2 text-micro uppercase text-neutral-400 transition-all duration-300 hover:border-altar-gold/50 hover:text-altar-goldlight"
        >
          {added ? 'Added ✓' : 'Add'}
        </button>
      )}
    </motion.div>
  );
}
