'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { visitorId, signal } from '../lib/signal';

const BASE = process.env.NEXT_PUBLIC_MEDUSA_URL || 'http://localhost:9000';
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';
const CHAPTERS = ['stillness', 'armor', 'signal', 'altar', 'relentless'] as const;
type State = 'neutral' | 'followed' | 'muted';

/**
 * "Tune the Broadcast" — the visitor steers ORACLE. Following a chapter boosts it across
 * every rail; muting quiets it. Tap cycles neutral → follow → mute → neutral.
 * The signature 2026 move: agency over the algorithm.
 */
export function TuneBroadcast() {
  const router = useRouter();
  const [state, setState] = useState<Record<string, State>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const vid = visitorId();
    fetch(`${BASE}/store/preferences?visitor_id=${encodeURIComponent(vid)}`, {
      headers: { 'x-publishable-api-key': PK },
    })
      .then((r) => r.json())
      .then((d) => {
        const s: Record<string, State> = {};
        (d.followed ?? []).forEach((c: string) => (s[c] = 'followed'));
        (d.muted ?? []).forEach((c: string) => (s[c] = 'muted'));
        setState(s);
      })
      .catch(() => {});
  }, []);

  async function cycle(ch: string) {
    if (busy) return;
    const next: State = state[ch] === 'followed' ? 'muted' : state[ch] === 'muted' ? 'neutral' : 'followed';
    const updated = { ...state, [ch]: next };
    setState(updated);
    setBusy(true);
    const followed = Object.entries(updated).filter(([, v]) => v === 'followed').map(([k]) => k);
    const muted = Object.entries(updated).filter(([, v]) => v === 'muted').map(([k]) => k);
    signal('filter_apply', ch, next, { surface: 'tune_broadcast', chapter: ch });
    try {
      await fetch(`${BASE}/store/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-publishable-api-key': PK },
        body: JSON.stringify({ visitor_id: visitorId(), followed, muted }),
      });
      router.refresh(); // re-render the server Broadcast with the new tuning
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="px-6 pb-2 pt-4">
      <div className="mx-auto max-w-7xl">
        <p className="mb-3 text-center text-micro uppercase text-neutral-600">
          Tune the Broadcast — follow what draws you, quiet the rest
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {CHAPTERS.map((ch) => {
            const s = state[ch] ?? 'neutral';
            return (
              <motion.button
                key={ch}
                onClick={() => cycle(ch)}
                whileTap={{ scale: 0.95 }}
                aria-label={`${ch}: ${s}. Tap to change.`}
                className={`rounded-full border px-4 py-1.5 text-micro uppercase transition-all duration-300 ${
                  s === 'followed'
                    ? 'border-altar-gold/60 bg-altar-gold/15 text-altar-goldlight'
                    : s === 'muted'
                      ? 'border-white/5 text-neutral-700 line-through'
                      : 'border-white/10 text-neutral-400 hover:border-white/25 hover:text-neutral-200'
                }`}
              >
                {s === 'followed' ? '♥ ' : s === 'muted' ? '· ' : ''}
                {ch}
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
