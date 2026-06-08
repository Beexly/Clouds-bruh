'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCustomer } from '../context/customer';
import { PageSignal } from './PageSignal';
import { BRAND, CURRENCY } from '../lib/brand';
import {
  GIFT_CARD_PRESETS,
  dollarsToCents,
  centsToUsd,
  issueGiftCard,
  redeemGiftCard,
  type IssueResult,
  type RedeemResult,
} from '../lib/gift-cards';

type Tab = 'buy' | 'redeem';

/**
 * Gift-card surface — purchase + redeem against the existing /store/monetization/gift-cards
 * endpoint. Fully defensive: works signed-out (redeem prompts for sign-in, since redemption needs a
 * customer), and every request renders an explicit success/error state. No assumptions about the
 * backend being up — a failed call simply shows the error copy.
 */
export function GiftCards() {
  const [tab, setTab] = useState<Tab>('buy');

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-20">
      <PageSignal type="page_view" context={{ surface: 'gift_cards' }} trackBehavior={false} />
      <p className="text-micro uppercase text-neutral-600">Give {BRAND}</p>
      <h1 className="mt-3 font-serif text-4xl font-light tracking-[0.08em] text-foil md:text-5xl">Gift Cards</h1>
      <p className="mt-4 max-w-prose text-sm leading-relaxed text-neutral-400">
        A sealed offering that redeems into {CURRENCY} — spendable across the entire Broadcast, never
        expiring.
      </p>

      <div className="mt-10 flex gap-2" role="tablist" aria-label="Gift card actions">
        <TabButton active={tab === 'buy'} onClick={() => setTab('buy')}>
          Purchase
        </TabButton>
        <TabButton active={tab === 'redeem'} onClick={() => setTab('redeem')}>
          Redeem
        </TabButton>
      </div>

      <div className="mt-8">{tab === 'buy' ? <BuyForm /> : <RedeemForm />}</div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`border px-5 py-2.5 text-micro uppercase tracking-[0.28em] transition ${
        active
          ? 'border-altar-gold/50 bg-altar-gold/[0.06] text-altar-goldlight'
          : 'border-white/10 text-neutral-400 hover:border-white/25 hover:text-foil'
      }`}
    >
      {children}
    </button>
  );
}

function BuyForm() {
  const { customer } = useCustomer();
  const [amount, setAmount] = useState('100');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'working'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IssueResult | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    const cents = dollarsToCents(amount);
    if (cents == null) {
      setError('Enter a valid amount (e.g. 100 or 49.99).');
      return;
    }
    setStatus('working');
    try {
      const res = await issueGiftCard(cents, customer?.id, message.trim() || undefined);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not issue the gift card. Please try again.');
    } finally {
      setStatus('idle');
    }
  };

  if (result) {
    return (
      <div className="rounded-sm border border-altar-gold/30 bg-altar-gold/[0.04] p-6">
        <p className="text-micro uppercase tracking-[0.28em] text-altar-goldlight">Gift card issued</p>
        <p className="mt-4 text-sm text-neutral-300">Share this code with the recipient:</p>
        <p className="mt-2 select-all font-mono text-2xl tracking-[0.1em] text-foil">{result.code}</p>
        <p className="mt-4 text-sm text-neutral-400">
          Balance <span className="text-neutral-200">{centsToUsd(result.balance)}</span>
        </p>
        <button
          type="button"
          onClick={() => setResult(null)}
          className="mt-6 text-micro uppercase tracking-[0.28em] text-neutral-500 underline underline-offset-4 transition-colors hover:text-foil"
        >
          Buy another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <label htmlFor="gc-amount" className="text-micro uppercase tracking-[0.28em] text-neutral-500">
          Amount (USD)
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          {GIFT_CARD_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(String(p))}
              className={`border px-4 py-2 text-sm transition ${
                amount === String(p)
                  ? 'border-altar-gold/50 bg-altar-gold/[0.06] text-altar-goldlight'
                  : 'border-white/10 text-neutral-400 hover:border-white/25 hover:text-foil'
              }`}
            >
              ${p}
            </button>
          ))}
        </div>
        <input
          id="gc-amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Custom amount"
          className="mt-3 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-altar-gold/40"
        />
      </div>

      <div>
        <label htmlFor="gc-message" className="text-micro uppercase tracking-[0.28em] text-neutral-500">
          Message (optional)
        </label>
        <textarea
          id="gc-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={300}
          placeholder="A note for the recipient…"
          className="mt-3 w-full resize-none border border-white/10 bg-transparent px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-altar-gold/40"
        />
      </div>

      {error && <p className="text-sm text-red-300/90">{error}</p>}

      <button
        type="submit"
        disabled={status === 'working'}
        className="w-full border border-altar-gold/40 py-4 text-micro uppercase tracking-[0.3em] text-altar-goldlight transition hover:border-altar-gold disabled:opacity-50"
      >
        {status === 'working' ? 'Issuing…' : 'Purchase gift card'}
      </button>
    </form>
  );
}

function RedeemForm() {
  const { customer, loading } = useCustomer();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'working'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RedeemResult | null>(null);

  if (loading) {
    return <p className="text-sm text-neutral-600">Checking your session…</p>;
  }

  if (!customer) {
    return (
      <div className="rounded-sm border border-white/[0.07] bg-white/[0.02] p-6">
        <p className="text-sm leading-relaxed text-neutral-400">
          Sign in to redeem a gift card — the balance is added straight to your {CURRENCY} wallet.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
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
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!code.trim()) {
      setError('Enter a gift card code.');
      return;
    }
    setStatus('working');
    try {
      const res = await redeemGiftCard(code, customer.id);
      setResult(res);
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not redeem this code. Please check it and try again.');
    } finally {
      setStatus('idle');
    }
  };

  if (result) {
    return (
      <div className="rounded-sm border border-altar-gold/30 bg-altar-gold/[0.04] p-6">
        <p className="text-micro uppercase tracking-[0.28em] text-altar-goldlight">Redeemed</p>
        <p className="mt-4 text-sm text-neutral-300">
          Added <span className="text-foil">{centsToUsd(result.redeemed)}</span> to your {CURRENCY}.
        </p>
        <p className="mt-2 text-sm text-neutral-400">
          Wallet balance <span className="text-neutral-200">{centsToUsd(result.wallet_balance)}</span>
        </p>
        <Link
          href="/account"
          className="mt-6 inline-block text-micro uppercase tracking-[0.28em] text-neutral-500 underline underline-offset-4 transition-colors hover:text-foil"
        >
          View your account
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <label htmlFor="gc-code" className="text-micro uppercase tracking-[0.28em] text-neutral-500">
          Gift card code
        </label>
        <input
          id="gc-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="ALTAR-XXXXXX-XXXX"
          className="mt-3 w-full border border-white/10 bg-transparent px-4 py-3 font-mono text-sm uppercase tracking-[0.1em] text-neutral-100 outline-none transition focus:border-altar-gold/40"
        />
      </div>

      {error && <p className="text-sm text-red-300/90">{error}</p>}

      <button
        type="submit"
        disabled={status === 'working'}
        className="w-full border border-altar-gold/40 py-4 text-micro uppercase tracking-[0.3em] text-altar-goldlight transition hover:border-altar-gold disabled:opacity-50"
      >
        {status === 'working' ? 'Redeeming…' : `Redeem to ${CURRENCY}`}
      </button>
    </form>
  );
}
