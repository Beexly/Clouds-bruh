'use client';

import { useState } from 'react';
import { apiFetch } from '../../lib/api';
import { PageSignal } from '../../components/PageSignal';

type Status = 'idle' | 'submitting' | 'success' | 'error';

const REASONS = [
  'Wrong size or fit',
  'Not as described',
  'Arrived damaged',
  'Changed my mind',
  'Other',
];

/**
 * Self-serve returns — POSTs to /store/rma (Lumera return intake; /store/returns is a Medusa
 * built-in, so we namespace ours). Shepherd reconciles supplier policy, return
 * window, and refund path on the backend; this page just opens the case with warmth and clarity.
 * Dark luminous editorial luxury, in the house voice.
 */
export default function ReturnsPage() {
  const [form, setForm] = useState({ order_id: '', email: '', reason: REASONS[0], item_note: '' });
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [caseId, setCaseId] = useState('');

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.order_id.trim() && !form.email.trim()) {
      setError('Enter your order number or the email on the order.');
      return;
    }
    setStatus('submitting');
    try {
      const res = await apiFetch('/store/rma', {
        method: 'POST',
        body: JSON.stringify({
          order_id: form.order_id.trim() || undefined,
          email: form.email.trim() || undefined,
          reason: form.reason,
          item_note: form.item_note.trim() || undefined,
        }),
      });
      setCaseId(res?.return_case?.id ?? '');
      setStatus('success');
    } catch (err: any) {
      setError(err?.message?.includes('400') ? 'Enter your order number or the email on the order.' : 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <main className="min-h-screen bg-void bg-sacred-grain px-6 py-24 text-center">
        <PageSignal type="page_view" context={{ page: 'returns_success' }} />
        <p className="text-micro uppercase tracking-[0.32em] text-altar-goldlight">Return requested</p>
        <h1 className="mx-auto mt-4 max-w-xl font-serif text-3xl font-light text-neutral-100">
          We have it. Your return is in motion.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-neutral-500">
          A member of our team will reconcile the supplier policy and return window, then send the next step to
          the email on your order.
        </p>
        {caseId && <p className="mt-3 font-mono text-[10px] text-neutral-700">{caseId}</p>}
        <a href="/" className="mt-10 inline-block text-micro uppercase tracking-[0.28em] text-neutral-500 hover:text-neutral-300">
          ← Return to The Broadcast
        </a>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-void bg-sacred-grain px-6 py-16">
      <PageSignal type="page_view" context={{ page: 'returns' }} />
      <div className="mx-auto max-w-xl">
        <header className="mb-10 text-center">
          <p className="text-micro uppercase tracking-[0.32em] text-neutral-600">Returns &amp; Exchanges</p>
          <h1 className="mt-2 font-serif text-4xl font-light tracking-[0.06em] text-altar-goldlight">
            Start a Return
          </h1>
          <p className="mt-3 text-sm italic text-neutral-500">
            Some things only happen once. If this one wasn&apos;t right, we&apos;ll make it so.
          </p>
        </header>

        <form onSubmit={submit} className="space-y-5 rounded-sm border border-white/[0.07] bg-white/[0.02] p-6">
          <div>
            <label htmlFor="order_id" className="mb-1 block text-micro uppercase tracking-[0.28em] text-neutral-500">
              Order number
            </label>
            <input
              id="order_id"
              value={form.order_id}
              onChange={set('order_id')}
              autoComplete="off"
              placeholder="e.g. 1042"
              className="w-full border border-white/10 bg-void px-3 py-2.5 text-sm text-neutral-200 outline-none focus:border-altar-gold/40"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-micro uppercase tracking-[0.28em] text-neutral-500">
              Email on the order
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={set('email')}
              autoComplete="email"
              placeholder="you@domain.com"
              className="w-full border border-white/10 bg-void px-3 py-2.5 text-sm text-neutral-200 outline-none focus:border-altar-gold/40"
            />
          </div>

          <div>
            <label htmlFor="reason" className="mb-1 block text-micro uppercase tracking-[0.28em] text-neutral-500">
              Reason
            </label>
            <select
              id="reason"
              value={form.reason}
              onChange={set('reason')}
              className="w-full border border-white/10 bg-void px-3 py-2.5 text-sm text-neutral-200 outline-none focus:border-altar-gold/40"
            >
              {REASONS.map((r) => (
                <option key={r} value={r} className="bg-void">
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="item_note" className="mb-1 block text-micro uppercase tracking-[0.28em] text-neutral-500">
              Anything we should know
            </label>
            <textarea
              id="item_note"
              value={form.item_note}
              onChange={set('item_note')}
              rows={4}
              placeholder="Which item, and what happened."
              className="w-full resize-none border border-white/10 bg-void px-3 py-2.5 text-sm text-neutral-200 outline-none focus:border-altar-gold/40"
            />
          </div>

          {error && <p className="text-sm text-chapter-relentless">{error}</p>}

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="w-full border border-altar-gold/40 py-3.5 text-micro uppercase tracking-[0.28em] text-altar-goldlight transition hover:border-altar-gold disabled:opacity-50"
          >
            {status === 'submitting' ? 'Submitting…' : 'Request Return'}
          </button>

          <p className="text-center text-micro uppercase tracking-[0.2em] text-neutral-700">
            Enter your order number or the email on your order.
          </p>
        </form>
      </div>
    </main>
  );
}
