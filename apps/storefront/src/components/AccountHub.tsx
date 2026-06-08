'use client';

import Link from 'next/link';
import { useCustomer } from '../context/customer';
import { RewardsPanel } from './RewardsPanel';
import { PageSignal } from './PageSignal';
import { BRAND, LOYALTY, CURRENCY } from '../lib/brand';

const ACCOUNT_LINKS: Array<{ href: string; label: string; tone?: 'gold'; soon?: boolean }> = [
  { href: '/account/orders', label: 'Orders & tracking', tone: 'gold' },
  { href: '/returns', label: 'Returns & exchanges' },
  { href: '/account/wishlist', label: 'Wishlist' },
];

/**
 * Account hub — signed-in profile + Luminance standing + the surfaces a customer reaches for.
 * Signed-out: a warm prompt to sign in or create an account. Defensive: while the session loads
 * we render a quiet placeholder; if the backend is down we simply show the signed-out state.
 */
export function AccountHub() {
  const { customer, loading, logout } = useCustomer();

  const greeting = customer?.first_name ? `Welcome back, ${customer.first_name}.` : 'Your account';

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-20">
      <PageSignal type="page_view" context={{ surface: 'account' }} trackBehavior={false} />
      <p className="text-micro uppercase text-neutral-600">Your {BRAND}</p>
      <h1 className="mt-3 font-serif text-4xl font-light tracking-[0.08em] text-foil md:text-5xl">
        {loading ? 'Account' : greeting}
      </h1>

      {loading ? (
        <p className="mt-10 text-sm text-neutral-600">Loading your account…</p>
      ) : customer ? (
        <>
          <section className="mt-8">
            <div className="rounded-sm border border-white/[0.07] bg-white/[0.02] p-5">
              <p className="text-micro uppercase tracking-[0.28em] text-neutral-500">Signed in as</p>
              <p className="mt-2 text-sm text-neutral-200">
                {[customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.email}
              </p>
              <p className="mt-1 text-xs text-neutral-500">{customer.email}</p>
              <button
                type="button"
                onClick={() => logout()}
                className="mt-4 text-micro uppercase tracking-[0.28em] text-neutral-500 underline underline-offset-4 transition-colors hover:text-foil"
              >
                Sign out
              </button>
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-micro uppercase text-neutral-500">{LOYALTY}</h2>
            <div className="mt-3">
              <RewardsPanel />
            </div>
            <p className="mt-3 text-sm text-neutral-500">
              {CURRENCY} accrue on every order and never expire — reach the next tier to earn faster.
            </p>
          </section>

          <section className="mt-12">
            <h2 className="text-micro uppercase text-neutral-500">Your surfaces</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {ACCOUNT_LINKS.map((l) =>
                l.soon ? (
                  <div
                    key={l.label}
                    className="flex items-center justify-between rounded-sm border border-white/[0.05] bg-white/[0.01] px-4 py-4 text-sm text-neutral-600"
                  >
                    <span>{l.label}</span>
                    <span className="text-micro uppercase tracking-[0.2em] text-neutral-700">Soon</span>
                  </div>
                ) : (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`rounded-sm border px-4 py-4 text-sm transition-colors ${
                      l.tone === 'gold'
                        ? 'border-altar-gold/25 bg-altar-gold/[0.04] text-altar-goldlight hover:border-altar-gold/50'
                        : 'border-white/[0.07] bg-white/[0.02] text-neutral-300 hover:border-white/20 hover:text-foil'
                    }`}
                  >
                    {l.label}
                  </Link>
                ),
              )}
            </div>
          </section>
        </>
      ) : (
        <section className="mt-10">
          <p className="max-w-prose text-sm leading-relaxed text-neutral-400">
            Sign in to see your orders, track shipments, and carry your {LOYALTY} standing with you. Your guest
            cart comes with you when you do.
          </p>
          <div className="mt-7 flex flex-wrap gap-4">
            <Link
              href="/login"
              className="border border-altar-gold/40 px-6 py-3 text-micro uppercase tracking-[0.28em] text-altar-goldlight transition hover:border-altar-gold"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="border border-white/10 px-6 py-3 text-micro uppercase tracking-[0.28em] text-neutral-300 transition hover:border-white/30 hover:text-foil"
            >
              Create an account
            </Link>
          </div>

          <div className="mt-12">
            <h2 className="text-micro uppercase text-neutral-500">Looking for an order?</h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-400">
              A confirmation with your order details is emailed the moment you check out. You can also start a{' '}
              <Link href="/returns" className="text-altar-goldlight underline underline-offset-4 hover:text-foil">
                return
              </Link>{' '}
              with just your order number.
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
