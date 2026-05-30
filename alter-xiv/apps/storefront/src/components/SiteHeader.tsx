'use client';
import Link from 'next/link';
import { useCart } from '../context/cart';

export function SiteHeader() {
  const { lineCount } = useCart();
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-900 bg-black/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-serif text-xl tracking-wide text-neutral-100">
          ALTER XIV
        </Link>
        <nav className="flex items-center gap-6 text-xs uppercase tracking-[0.2em] text-neutral-500">
          {(['stillness', 'armor', 'signal', 'altar', 'relentless'] as const).map((ch) => (
            <Link key={ch} href={`/chapter/${ch}`} className="hover:text-neutral-300 transition-colors">
              {ch}
            </Link>
          ))}
        </nav>
        <Link href="/cart" className="relative text-neutral-400 hover:text-neutral-100 transition-colors">
          <span className="text-xs uppercase tracking-widest">Cart</span>
          {lineCount > 0 && (
            <span className="ml-1 text-[10px] text-amber-300">{lineCount}</span>
          )}
        </Link>
      </div>
    </header>
  );
}
