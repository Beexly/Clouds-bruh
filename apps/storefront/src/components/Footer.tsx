import Link from 'next/link';
import { BRAND, EXPERIENCE, PARENT, LEGAL_ENTITY } from '../lib/brand';
import { CHAPTERS, chapterLabel } from '../lib/chapters';

/** Site footer — brand, shop nav, and the legal surface every storefront needs. */
export function Footer() {
  return (
    <footer className="mt-24 border-t border-white/[0.06] bg-void/60">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-4">
        <div>
          <div className="font-sans text-xl font-medium lowercase tracking-[0.1em] text-foil">{BRAND}</div>
          <p className="mt-2 text-micro uppercase text-neutral-600">{EXPERIENCE} · a {PARENT} company</p>
        </div>
        <nav className="space-y-2 text-sm text-neutral-400">
          <div className="text-micro uppercase text-neutral-600">Shop</div>
          <Link href="/drops" className="block transition-colors hover:text-foil">Drops</Link>
          {CHAPTERS.map((c) => (
            <Link key={c} href={`/chapter/${c}`} className="block transition-colors hover:text-foil">{chapterLabel(c)}</Link>
          ))}
        </nav>
        <nav className="space-y-2 text-sm text-neutral-400">
          <div className="text-micro uppercase text-neutral-600">Legal</div>
          <Link href="/legal/privacy" className="block transition-colors hover:text-foil">Privacy</Link>
          <Link href="/legal/terms" className="block transition-colors hover:text-foil">Terms of Service</Link>
          <Link href="/legal/returns" className="block transition-colors hover:text-foil">Returns &amp; Shipping</Link>
        </nav>
        <div className="space-y-2 text-sm text-neutral-500">
          <div className="text-micro uppercase text-neutral-600">Contact</div>
          <a href="mailto:hello@lumera.example" className="block transition-colors hover:text-foil">hello@lumera.example</a>
        </div>
      </div>
      <div className="border-t border-white/[0.04] px-6 py-5 text-center text-micro uppercase text-neutral-700">
        © {new Date().getFullYear()} {BRAND} · owned and operated by {LEGAL_ENTITY}. All rights reserved.
      </div>
    </footer>
  );
}
