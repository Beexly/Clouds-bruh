'use client';
import { useState } from 'react';
import { useCart } from '../context/cart';

export function AddToCartButton({
  variantId,
  productId,
  chapter,
}: {
  variantId: string;
  productId: string;
  chapter?: string;
}) {
  const { add } = useCart();
  const [state, setState] = useState<'idle' | 'adding' | 'added'>('idle');

  const handleAdd = async () => {
    setState('adding');
    try {
      await add(variantId, productId, chapter);
      setState('added');
      setTimeout(() => setState('idle'), 2000);
    } catch { setState('idle'); }
  };

  return (
    <button
      onClick={handleAdd}
      disabled={state !== 'idle'}
      className="w-full border border-neutral-700 py-4 text-xs uppercase tracking-[0.3em] text-neutral-300 transition hover:border-neutral-500 hover:text-neutral-100 disabled:opacity-50"
    >
      {state === 'idle' ? 'Add to Cart' : state === 'adding' ? 'Adding…' : 'Added ✓'}
    </button>
  );
}
