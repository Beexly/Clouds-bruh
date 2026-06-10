import Link from 'next/link';
import { BRAND, EXPERIENCE } from '../lib/brand';
import { NewsletterSignup } from './NewsletterSignup';

const CHAPTERS = ['stillness', 'armor', 'signal', 'altar', 'relentless'] as const;

/** Site footer — brand, shop nav, and the legal surface every storefront needs. */
export function Footer() {
  return (
    <footer className="mt-24 border-t border-white/[0.06] bg-void/60">
      <div className="mx-auto max-w-7xl px-6 pt-12">
        <div className="flex flex-col gap-4 rounded-sm border border-white/[0.06] bg-white/[0.02] p-6 md:flex-row md:items-center md:justify-between md:gap-10">
          <div>
            <p className="text-micro uppercase text-neutral-600">The Broadcast</p>
            <p className="mt-1 font-serif text-xl text-neutral-100">First access to every drop.</p>
          </div>
          <div className="w-full md:w-96"><NewsletterSignup source="footer" /></div>
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-4">
        <div>
          <div className="font-sans text-xl font-medium lowercase tracking-[0.1em] text-foil">{BRAND}</div>
          <p className="mt-2 text-micro uppercase text-neutral-600">{EXPERIENCE} · a Galaxy company</p>
        </div>
        <nav className="space-y-2 text-sm text-neutral-400">
          <div className="text-micro uppercase text-neutral-600">Shop</div>
          <Link href="/drops" className="block transition-colors hover:text-foil">Drops</Link>
          {CHAPTERS.map((c) => (
            <Link key={c} href={`/chapter/${c}`} className="block capitalize transition-colors hover:text-foil">{c}</Link>
          ))}
        </nav>
        <nav className="space-y-2 text-sm text-neutral-400">
          <div className="text-micro uppercase text-neutral-600">Legal</div>
          <Link href="/legal/privacy" className="block transition-colors hover:text-foil">Privacy</Link>
          <Link href="/legal/terms" className="block transition-colors hover:text-foil">Terms of Service</Link>
          <Link href="/legal/returns" className="block transition-colors hover:text-foil">Returns &amp; Shipping</Link>
        </nav>
        <div className="space-y-2 text-sm text-neutral-400">
          <div className="text-micro uppercase text-neutral-600">Help</div>
          <Link href="/faq" className="block transition-colors hover:text-foil">FAQ</Link>
          <Link href="/track" className="block transition-colors hover:text-foil">Track order</Link>
          <Link href="/returns" className="block transition-colors hover:text-foil">Start a return</Link>
          <a href="mailto:hello@lumeralabel.com" className="block transition-colors hover:text-foil">hello@lumeralabel.com</a>
        </div>
      </div>
      <div className="border-t border-white/[0.04] px-6 py-5 text-center text-micro uppercase text-neutral-700">
        © {new Date().getFullYear()} {BRAND}. All rights reserved.
      </div>
    </footer>
  );
}
