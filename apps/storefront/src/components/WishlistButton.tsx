'use client';

import { useWishlist } from '../context/wishlist';
import type { WishlistInput } from '../lib/wishlist';

/**
 * Heart toggle — saves/unsaves a product to the persistent wishlist. Used on the product card
 * (compact, floating over the image) and the PDP (inline). Accepts the minimal display data so it
 * works from both the shared Product shape and the raw Medusa product shape.
 *
 * Defensive: until the provider has hydrated we render in a neutral (un-filled) state so a saved
 * item never momentarily flashes as un-saved on first paint.
 */
export function WishlistButton({
  item,
  variant = 'overlay',
  className = '',
}: {
  item: WishlistInput;
  variant?: 'overlay' | 'inline';
  className?: string;
}) {
  const { has, toggle, ready } = useWishlist();
  const saved = ready && has(item.id);
  const label = saved ? 'Remove from wishlist' : 'Save to wishlist';

  const onClick = (e: React.MouseEvent) => {
    // The card wraps the heart in an <a>; never navigate when toggling.
    e.preventDefault();
    e.stopPropagation();
    toggle(item);
  };

  const base =
    variant === 'overlay'
      ? 'absolute right-3 bottom-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur transition'
      : 'inline-flex items-center gap-2 border px-4 py-3 text-micro uppercase tracking-[0.28em] transition';

  const tone = saved
    ? 'border-altar-gold/50 bg-altar-gold/[0.08] text-altar-goldlight'
    : 'border-white/15 bg-black/40 text-neutral-300 hover:border-altar-gold/40 hover:text-altar-goldlight';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      className={`${base} ${tone} ${className}`}
    >
      <Heart filled={saved} />
      {variant === 'inline' && <span>{saved ? 'Saved' : 'Save'}</span>}
    </button>
  );
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21s-7.5-4.6-10-9.2C.3 8.4 1.9 4.7 5.4 4.2 7.6 3.9 9.5 5 12 7.5 14.5 5 16.4 3.9 18.6 4.2c3.5.5 5.1 4.2 3.4 7.6C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}
