'use client';
import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_MEDUSA_URL || 'http://localhost:9000';
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';

type State = 'idle' | 'loading' | 'done' | 'error';

/** Email-list capture — the top-of-funnel front door. Posts to /store/newsletter; on-brand, quiet. */
export function NewsletterSignup({ source = 'footer' }: { source?: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value || state === 'loading') return;
    setState('loading');
    try {
      const res = await fetch(`${API}/store/newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(PK ? { 'x-publishable-api-key': PK } : {}) },
        body: JSON.stringify({ email: value, source }),
      });
      setState(res.ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
  }

  if (state === 'done') {
    return <p className="text-sm text-altar-goldlight">You&rsquo;re on the Broadcast. Watch your inbox.</p>;
  }

  return (
    <form onSubmit={submit} className="w-full">
      <div className="flex items-stretch gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@domain.com"
          aria-label="Email address"
          className="min-w-0 flex-1 rounded-sm border border-white/10 bg-transparent px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-altar-gold/40 focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === 'loading'}
          className="shrink-0 rounded-sm border border-altar-gold/40 px-4 py-2 text-micro uppercase text-altar-goldlight transition hover:border-altar-gold disabled:opacity-50"
        >
          {state === 'loading' ? '…' : 'Join'}
        </button>
      </div>
      {state === 'error' && <p className="mt-2 text-micro text-chapter-relentless">Something slipped — try again.</p>}
      <p className="mt-2 text-micro text-neutral-700">First access to drops. No noise. Unsubscribe anytime.</p>
    </form>
  );
}
