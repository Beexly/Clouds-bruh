'use client';
import Link from 'next/link';
import { useCart } from '../context/cart';
import { signal } from '../lib/signal';

const CHAPTERS = ['stillness', 'armor', 'signal', 'altar', 'relentless'] as const;

export function SiteHeader() {
  const { lineCount } = useCart();
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-void/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-serif text-2xl font-light tracking-[0.2em] text-foil transition-opacity hover:opacity-80"
        >
          ALTER&nbsp;XIV
        </Link>
        <nav className="hidden items-center gap-7 text-micro uppercase text-neutral-500 md:flex">
          <Link href="/drops" className="py-1 transition-colors duration-300 hover:text-altar-goldlight">
            Drops
          </Link>
          {CHAPTERS.map((ch) => (
            <Link
              key={ch}
              href={`/chapter/${ch}`}
              onClick={() => signal('chapter_enter', ch, undefined, { chapter: ch })}
              className="relative py-1 transition-colors duration-300 hover:text-altar-goldlight"
            >
              {ch}
            </Link>
          ))}
        </nav>
        <Link
          href="/cart"
          className="group relative flex items-center gap-2 text-neutral-400 transition-colors hover:text-neutral-100"
        >
          <span className="text-micro uppercase">Cart</span>
          <span
            className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] tabular-nums transition ${
              lineCount > 0 ? 'bg-altar-gold text-black' : 'border border-white/10 text-neutral-600'
            }`}
          >
            {lineCount}
          </span>
        </Link>
      </div>
    </header>
  );
}
