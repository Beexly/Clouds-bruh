'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { signal } from '../lib/signal';
import { Countdown } from './Countdown';
import type { Drop } from '@alterxiv/shared';

/** The departure board — the heart of The Broadcast. Live drops, countdowns, scarcity. */
export function DropBoard({ drops }: { drops: Drop[] }) {
  useEffect(() => {
    drops.forEach((d) => signal('drop_view', d.id, undefined, { chapter: d.chapter }));
  }, [drops]);

  if (!drops.length) return null;

  return (
    <section className="px-6 pt-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex items-baseline justify-between">
          <h2 className="text-label uppercase text-neutral-500">The Broadcast — Live</h2>
          <span className="text-micro uppercase text-neutral-700">Season Zero</span>
        </div>
        <div className="overflow-hidden rounded-sm border border-white/[0.07]">
          {drops.map((d, i) => {
            const total = d.units_total || 1;
            const sold = Math.max(0, total - (d.units_remaining ?? total));
            const pctSold = Math.min(100, Math.round((sold / total) * 100));
            const scarce = (d.units_remaining ?? total) / total <= 0.15;
            const live = d.status === 'live';
            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="group relative border-b border-white/[0.05] last:border-0"
              >
                <Link
                  href={`/chapter/${d.chapter}`}
                  onClick={() => signal('countdown_view', d.id, undefined, { chapter: d.chapter })}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-5 transition-colors hover:bg-white/[0.02] sm:gap-8"
                >
                  {/* status lamp */}
                  <span className="flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        live ? 'animate-pulse-scarce bg-altar-gold' : 'bg-neutral-700'
                      }`}
                    />
                    <span className="hidden w-20 text-micro uppercase tracking-wide text-neutral-500 sm:inline">
                      {live ? 'Open' : 'Scheduled'}
                    </span>
                  </span>

                  {/* name + scarcity bar */}
                  <span className="min-w-0">
                    <span className="block truncate font-serif text-lg text-neutral-100">
                      {d.name}
                    </span>
                    <span className="mt-1 flex items-center gap-3">
                      <span className="text-micro uppercase text-chapter-armor/80">{d.chapter}</span>
                      <span className="hidden h-px w-24 overflow-hidden bg-white/10 sm:block">
                        <span
                          className="block h-full bg-altar-gold/70"
                          style={{ width: `${pctSold}%` }}
                        />
                      </span>
                      <span
                        className={`text-micro tabular-nums ${
                          scarce ? 'animate-pulse-scarce text-chapter-relentless' : 'text-neutral-600'
                        }`}
                      >
                        {d.units_remaining}/{d.units_total} left
                      </span>
                    </span>
                  </span>

                  {/* countdown / time */}
                  <span className="text-right">
                    {live ? (
                      <Countdown to={d.ends_at} label="closes" />
                    ) : (
                      <Countdown to={d.starts_at} label="opens" />
                    )}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
