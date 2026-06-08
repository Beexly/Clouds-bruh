'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCustomer } from '../context/customer';
import { getOrder, trackingFor, formatMoney, orderNumber, statusLabel, type Order } from '../lib/customer';
import { PageSignal } from './PageSignal';

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
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

type State = 'loading' | 'signed_out' | 'error' | 'not_found' | 'ready';

/**
 * Order detail — items, totals, fulfillment status and tracking number/url when present.
 * Defensive across auth-loading, signed-out, backend-error, and not-found states.
 */
export function OrderDetail({ id }: { id: string }) {
  const { customer, loading: authLoading } = useCustomer();
  const [order, setOrder] = useState<Order | null>(null);
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    if (authLoading) return;
    if (!customer) {
      setState('signed_out');
      return;
    }
    let active = true;
    (async () => {
      const token = await sessionToken();
      if (!token) {
        if (active) setState('signed_out');
        return;
      }
      try {
        const o = await getOrder(token, id);
        if (!active) return;
        if (!o) {
          setState('not_found');
        } else {
          setOrder(o);
          setState('ready');
        }
      } catch {
        if (active) setState('error');
      }
    })();
    return () => {
      active = false;
    };
  }, [customer, authLoading, id]);

  const tracking = order ? trackingFor(order) : [];

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-20">
      <PageSignal type="page_view" context={{ surface: 'account_order_detail' }} trackBehavior={false} />
      <Link
        href="/account/orders"
        className="inline-block text-micro uppercase tracking-[0.28em] text-neutral-500 transition-colors hover:text-foil"
      >
        ← Orders
      </Link>

      {state === 'loading' ? (
        <p className="mt-10 text-sm text-neutral-600">Loading your order…</p>
      ) : state === 'signed_out' ? (
        <div className="mt-10">
          <p className="text-sm text-neutral-400">Sign in to view this order.</p>
          <Link
            href={`/login?redirect=/account/orders/${id}`}
            className="mt-6 inline-block border border-altar-gold/40 px-6 py-3 text-micro uppercase tracking-[0.28em] text-altar-goldlight transition hover:border-altar-gold"
          >
            Sign in
          </Link>
        </div>
      ) : state === 'not_found' ? (
        <p className="mt-10 text-sm text-neutral-500">We couldn&apos;t find that order on your account.</p>
      ) : state === 'error' || !order ? (
        <p className="mt-10 text-sm text-neutral-500">
          We couldn&apos;t reach this order just now. Please try again in a moment.
        </p>
      ) : (
        <>
          <header className="mt-6">
            <h1 className="font-serif text-4xl font-light tracking-[0.08em] text-foil">Order {orderNumber(order)}</h1>
            <p className="mt-2 text-xs text-neutral-500">{formatDate(order.created_at)}</p>
            <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-micro uppercase tracking-[0.2em]">
              <span className="text-neutral-500">
                Fulfillment · <span className="text-altar-goldlight">{statusLabel(order.fulfillment_status)}</span>
              </span>
              {order.payment_status && (
                <span className="text-neutral-500">
                  Payment · <span className="text-neutral-300">{statusLabel(order.payment_status)}</span>
                </span>
              )}
            </div>
          </header>

          {tracking.length > 0 && (
            <section className="mt-8 rounded-sm border border-altar-gold/20 bg-altar-gold/[0.04] p-5">
              <p className="text-micro uppercase tracking-[0.28em] text-altar-goldlight">Tracking</p>
              <ul className="mt-3 space-y-2">
                {tracking.map((t) => (
                  <li key={t.number} className="text-sm">
                    {t.url ? (
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-neutral-200 underline underline-offset-4 hover:text-foil"
                      >
                        {t.number}
                      </a>
                    ) : (
                      <span className="font-mono text-neutral-200">{t.number}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-10">
            <h2 className="text-micro uppercase text-neutral-500">Items</h2>
            <ul className="mt-4 divide-y divide-white/[0.06] border-y border-white/[0.06]">
              {(order.items ?? []).map((li) => (
                <li key={li.id} className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="text-sm text-neutral-200">{li.title}</p>
                    {li.variant_title && <p className="mt-0.5 text-xs text-neutral-500">{li.variant_title}</p>}
                    <p className="mt-1 text-xs text-neutral-600">Qty {li.quantity}</p>
                  </div>
                  <p className="text-sm tabular-nums text-neutral-300">
                    {formatMoney((li.unit_price ?? 0) * li.quantity, order.currency_code)}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-8 flex justify-between border-t border-white/10 pt-4">
            <span className="text-sm text-neutral-300">Total</span>
            <span className="text-sm tabular-nums text-foil">{formatMoney(order.total, order.currency_code)}</span>
          </section>
        </>
      )}
    </main>
  );
}
