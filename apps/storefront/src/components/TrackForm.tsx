'use client';
import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_MEDUSA_URL || 'http://localhost:9000';
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';

interface Result {
  found: boolean;
  order_no?: string;
  placed_at?: string;
  items?: Array<{ title: string; quantity: number }>;
  message?: string;
}

const inputCls =
  'w-full rounded-sm border border-white/10 bg-transparent px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-altar-gold/40 focus:outline-none';

/** Guest order-tracking form — posts to /store/order-lookup, shows a safe status summary. */
export function TrackForm() {
  const [orderNo, setOrderNo] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderNo.trim() || !email.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API}/store/order-lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(PK ? { 'x-publishable-api-key': PK } : {}) },
        body: JSON.stringify({ order_no: orderNo.trim(), email: email.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as Result;
      setResult(res.ok ? data : { found: false, message: (data as any)?.error || 'Something slipped — try again.' });
    } catch {
      setResult({ found: false, message: 'Something slipped — try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={submit} className="space-y-3">
        <input
          value={orderNo}
          onChange={(e) => setOrderNo(e.target.value)}
          placeholder="Order number (e.g. 1042)"
          aria-label="Order number"
          inputMode="numeric"
          className={inputCls}
          required
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email used at checkout"
          aria-label="Email"
          className={inputCls}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-sm border border-altar-gold/40 py-3 text-micro uppercase tracking-[0.2em] text-altar-goldlight transition hover:border-altar-gold disabled:opacity-50"
        >
          {loading ? 'Checking…' : 'Find my order'}
        </button>
      </form>

      {result && (
        <div className="mt-6 rounded-sm border border-white/[0.08] bg-white/[0.02] p-5">
          {result.found ? (
            <>
              <p className="text-micro uppercase text-altar-goldlight">Order #{result.order_no}</p>
              {result.placed_at && (
                <p className="mt-1 text-micro uppercase text-neutral-600">
                  Placed {new Date(result.placed_at).toLocaleDateString()}
                </p>
              )}
              {result.items && result.items.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-neutral-300">
                  {result.items.map((i, n) => (
                    <li key={n}>
                      {i.title} <span className="text-neutral-600">×{i.quantity}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-sm leading-relaxed text-neutral-400">{result.message}</p>
            </>
          ) : (
            <p className="text-sm text-neutral-400">{result.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
