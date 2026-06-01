'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { visitorId, signal } from '../lib/signal';
import { CHAPTERS, chapterLabel } from '../lib/chapters';

const BASE = process.env.NEXT_PUBLIC_MEDUSA_URL || 'http://localhost:9000';
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';
const EASE = [0.22, 1, 0.36, 1] as const;
type State = 'neutral' | 'followed' | 'muted';

// Constellation coordinates (% of the field) — a gentle night-sky scatter, one star per chapter.
const POS: Record<string, { x: number; y: number }> = {
  stillness: { x: 11, y: 58 },
  armor: { x: 31, y: 26 },
  signal: { x: 50, y: 64 },
  altar: { x: 69, y: 30 },
  relentless: { x: 89, y: 52 },
};

/**
 * YOUR LIGHT — the visitor's taste, rendered as a tunable constellation. Following a chapter ignites
 * its star (and boosts it across every rail); muting dims it. Personalization made *visible + steerable*
 * — the signature 2026 move (RESEARCH_2026 §2). Wired to /store/preferences; reduced-motion safe.
 */
export function TuneBroadcast() {
  const router = useRouter();
  const reduce = useReducedMotion();
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
    signal('filter_apply', ch, next, { surface: 'your_light', chapter: ch });
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

  const followedLabels = CHAPTERS.filter((c) => state[c] === 'followed').map(chapterLabel);
  const read = followedLabels.length
    ? `Tuned toward ${followedLabels.join(' · ')}`
    : 'Your sky is open — touch a star to draw your light';
  const points = CHAPTERS.map((c) => `${POS[c].x},${POS[c].y}`).join(' ');

  return (
    <section className="px-6 pb-4 pt-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-xl italic text-firstlight md:text-2xl">Your Light</h2>
        <p className="mt-1 text-micro uppercase tracking-[0.3em] text-neutral-600">{read}</p>

        <div className="relative mx-auto mt-6 h-44 w-full max-w-2xl">
          {/* the constellation thread */}
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <motion.polyline
              points={points}
              fill="none"
              stroke="#6E5BD6"
              strokeOpacity="0.25"
              strokeWidth="0.4"
              vectorEffect="non-scaling-stroke"
              initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.6, ease: EASE }}
            />
          </svg>

          {/* the stars — one per chapter, brightness = your taste */}
          {CHAPTERS.map((ch, i) => {
            const s = state[ch] ?? 'neutral';
            const followed = s === 'followed';
            const muted = s === 'muted';
            const color = followed ? '#E9D8A6' : muted ? '#54545A' : '#F4EEDD';
            const size = followed ? 16 : muted ? 7 : 10;
            return (
              <button
                key={ch}
                onClick={() => cycle(ch)}
                aria-label={`${chapterLabel(ch)}: ${s}. Tap to tune.`}
                className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
                style={{ left: `${POS[ch].x}%`, top: `${POS[ch].y}%` }}
              >
                <motion.span
                  className="relative block rounded-full"
                  style={{
                    width: size,
                    height: size,
                    backgroundColor: color,
                    boxShadow: muted ? 'none' : `0 0 ${followed ? 16 : 8}px ${color}`,
                  }}
                  initial={reduce ? false : { scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: muted ? 0.45 : 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.08, ease: EASE }}
                  whileHover={{ scale: 1.25 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {followed && !reduce && (
                    <span className="absolute inset-0 animate-ping rounded-full" style={{ backgroundColor: '#E9D8A6', opacity: 0.5 }} />
                  )}
                </motion.span>
                <span
                  className={`text-micro uppercase tracking-wide transition-colors ${
                    followed
                      ? 'text-altar-goldlight'
                      : muted
                        ? 'text-neutral-700 line-through'
                        : 'text-neutral-500 group-hover:text-neutral-300'
                  }`}
                >
                  {chapterLabel(ch)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
