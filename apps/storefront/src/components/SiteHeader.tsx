'use client';
import Link from 'next/link';
import { useCart } from '../context/cart';
import { signal } from '../lib/signal';
import { BRAND } from '../lib/brand';

const CHAPTERS = ['stillness', 'armor', 'signal', 'altar', 'relentless'] as const;

export function SiteHeader() {
  const { lineCount } = useCart();
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-void/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-sans text-2xl font-medium lowercase tracking-[0.1em] text-foil transition-opacity hover:opacity-80"
        >
          {BRAND}
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
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => {
              signal('page_view', undefined, undefined, { surface: 'search_open' });
              window.dispatchEvent(new Event('lumera:open-search'));
            }}
            aria-label="Search"
            className="group flex items-center gap-2 text-neutral-400 transition-colors hover:text-neutral-100"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="hidden text-micro uppercase md:inline">Search</span>
          </button>
          <Link
            href="/account"
            aria-label="Account"
            className="group flex items-center gap-2 text-neutral-400 transition-colors hover:text-neutral-100"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
            </svg>
            <span className="hidden text-micro uppercase md:inline">Account</span>
          </Link>
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
      </div>
    </header>
  );
}
