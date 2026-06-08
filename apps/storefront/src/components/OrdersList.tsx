'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCustomer } from '../context/customer';
import { listOrders, formatMoney, orderNumber, statusLabel, type Order } from '../lib/customer';
import { PageSignal } from './PageSignal';

/** Fetch the current session token from the httpOnly cookie via the route handler. */
async function sessionToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/session', { cache: 'no-store' });
    if (!res.ok) return null;
    const { token } = await res.json();
    return typeof token === 'string' && token ? token : null;
  } catch {
    return null;
  }
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Order history — number, date, total, status. Defensive across every state: auth loading,
 * signed-out (prompt to sign in), backend error (graceful message), and empty history.
 */
export function OrdersList() {
  const { customer, loading: authLoading } = useCustomer();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!customer) {
      setOrders([]);
      return;
    }
    let active = true;
    (async () => {
      const token = await sessionToken();
      if (!token) {
        if (active) setOrders([]);
        return;
      }
      try {
        const list = await listOrders(token);
        if (active) setOrders(list);
      } catch {
        if (active) setError(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [customer, authLoading]);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-20">
      <PageSignal type="page_view" context={{ surface: 'account_orders' }} trackBehavior={false} />
      <p className="text-micro uppercase text-neutral-600">Your Lumera</p>
      <h1 className="mt-3 font-serif text-4xl font-light tracking-[0.08em] text-foil md:text-5xl">Orders</h1>
      <Link
        href="/account"
        className="mt-4 inline-block text-micro uppercase tracking-[0.28em] text-neutral-500 transition-colors hover:text-foil"
      >
        ← Account
      </Link>

      <div className="mt-10">
        {authLoading || orders === null ? (
          <p className="text-sm text-neutral-600">Loading your orders…</p>
        ) : !customer ? (
          <SignedOut />
        ) : error ? (
          <p className="text-sm text-neutral-500">
            We couldn&apos;t reach your orders just now. Please try again in a moment.
          </p>
        ) : orders.length === 0 ? (
          <Empty />
        ) : (
          <ul className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/account/orders/${o.id}`}
                  className="flex items-center justify-between gap-4 py-5 transition-colors hover:bg-white/[0.02]"
                >
                  <div>
                    <p className="text-sm text-neutral-200">{orderNumber(o)}</p>
                    <p className="mt-1 text-xs text-neutral-500">{formatDate(o.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm tabular-nums text-neutral-200">
                      {formatMoney(o.total, o.currency_code)}
                    </p>
                    <p className="mt-1 text-micro uppercase tracking-[0.2em] text-altar-goldlight">
                      {statusLabel(o.fulfillment_status ?? o.status)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function SignedOut() {
  return (
    <div>
      <p className="text-sm leading-relaxed text-neutral-400">Sign in to see your order history and tracking.</p>
      <Link
        href="/login?redirect=/account/orders"
        className="mt-6 inline-block border border-altar-gold/40 px-6 py-3 text-micro uppercase tracking-[0.28em] text-altar-goldlight transition hover:border-altar-gold"
      >
        Sign in
      </Link>
    </div>
  );
}

function Empty() {
  return (
    <div>
      <p className="text-sm leading-relaxed text-neutral-400">No orders yet — the Broadcast is waiting.</p>
      <Link
        href="/drops"
        className="mt-6 inline-block text-micro uppercase tracking-[0.28em] text-altar-goldlight underline underline-offset-4 hover:text-foil"
      >
        Shop the drops
      </Link>
    </div>
  );
}
