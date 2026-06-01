'use client';
import { useEffect, useState } from 'react';
import { visitorId } from '../lib/signal';

const BASE = process.env.NEXT_PUBLIC_MEDUSA_URL || 'http://localhost:9000';
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';

interface Rewards {
  balance: number;
  lifetime_earned: number;
  reward_tier: string;
  multiplier: number;
  next_tier: string | null;
  credits_to_next: number;
}

/**
 * Luminance — the loyalty surface. Shows balance, tier, and a Fogg-model nudge toward the
 * next blessing. `cartTotalCents` previews what this purchase will earn (motivation at the
 * highest-intent moment). Credits are cents (1 credit = 1¢).
 */
export function RewardsPanel({ cartTotalCents = 0 }: { cartTotalCents?: number }) {
  const [r, setR] = useState<Rewards | null>(null);

  useEffect(() => {
    fetch(`${BASE}/store/rewards?visitor_id=${encodeURIComponent(visitorId())}`, {
      headers: { 'x-publishable-api-key': PK },
    })
      .then((res) => res.json())
      .then(setR)
      .catch(() => {});
  }, []);

  if (!r) return null;
  const willEarn = Math.round(cartTotalCents * 0.05 * (r.multiplier ?? 1));
  const pctToNext =
    r.next_tier && r.credits_to_next > 0
      ? Math.min(100, Math.round((r.lifetime_earned / (r.lifetime_earned + r.credits_to_next)) * 100))
      : 100;

  return (
    <div className="rounded-sm border border-altar-gold/20 bg-altar-gold/[0.04] p-5">
      <div className="flex items-center justify-between">
        <span className="text-micro uppercase text-altar-goldlight">Luminance · {r.reward_tier}</span>
        <span className="text-sm tabular-nums text-neutral-200">{r.balance.toLocaleString()} Lumens</span>
      </div>

      {r.next_tier && (
        <>
          <div className="mt-3 h-px w-full overflow-hidden bg-white/10">
            <div className="h-full bg-altar-gold/70" style={{ width: `${pctToNext}%` }} />
          </div>
          <p className="mt-2 text-micro uppercase text-neutral-500">
            {r.credits_to_next.toLocaleString()} Lumens to {r.next_tier}
          </p>
        </>
      )}

      {willEarn > 0 && (
        <p className="mt-3 text-xs text-neutral-400">
          This order earns{' '}
          <span className="text-altar-goldlight">{willEarn.toLocaleString()}</span> Lumens
          {r.multiplier > 1 ? ` (×${r.multiplier} Luminary)` : ''}.
        </p>
      )}
    </div>
  );
}
