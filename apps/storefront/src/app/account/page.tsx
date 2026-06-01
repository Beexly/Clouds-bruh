import type { Metadata } from 'next';
import Link from 'next/link';
import { RewardsPanel } from '../../components/RewardsPanel';
import { PageSignal } from '../../components/PageSignal';
import { BRAND, LOYALTY, CURRENCY } from '../../lib/brand';

export const metadata: Metadata = { title: 'Account' };

/** Account hub — Luminance standing + how orders reach you. The header's prototypical "account" cue. */
export default function AccountPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-20">
      <PageSignal type="page_view" context={{ surface: 'account' }} trackBehavior={false} />
      <p className="text-micro uppercase text-neutral-600">Your {BRAND}</p>
      <h1 className="mt-3 font-serif text-4xl font-light tracking-[0.08em] text-foil md:text-5xl">Account</h1>

      <section className="mt-10">
        <h2 className="text-micro uppercase text-neutral-500">{LOYALTY}</h2>
        <div className="mt-3">
          <RewardsPanel />
        </div>
        <p className="mt-3 text-sm text-neutral-500">
          {CURRENCY} accrue on every order and never expire — reach the next tier to earn faster.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-micro uppercase text-neutral-500">Orders</h2>
        <p className="mt-3 text-sm leading-relaxed text-neutral-400">
          A confirmation with your order details is emailed the moment you check out. Need anything —
          status, a change, a return — ask Polaris, your guide, anytime.
        </p>
        <div className="mt-5 flex flex-wrap gap-5 text-micro uppercase tracking-[0.2em]">
          <Link href="/drops" className="text-altar-goldlight underline underline-offset-4 transition-colors hover:text-foil">
            Shop the drops
          </Link>
          <Link href="/legal/returns" className="text-neutral-400 underline underline-offset-4 transition-colors hover:text-foil">
            Returns &amp; shipping
          </Link>
        </div>
      </section>
    </main>
  );
}
