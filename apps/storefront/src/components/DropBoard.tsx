'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { signal } from '../lib/signal';
import { Countdown } from './Countdown';
import type { Drop } from '@alterxiv/shared';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * THE BROADCAST — a live, cinematic departure board (the brand's home metaphor). Real drops, ticking
 * countdowns, scarcity bars that fill on view, open-drop glow. Reduced-motion safe.
 */
export function DropBoard({ drops }: { drops: Drop[] }) {
  const reduce = useReducedMotion();

  useEffect(() => {
    drops.forEach((d) => signal('drop_view', d.id, undefined, { chapter: d.chapter }));
  }, [drops]);

  if (!drops.length) return null;
  const liveCount = drops.filter((d) => d.status === 'live').length;

  return (
    <section className="px-6 pt-16">
      <div className="mx-auto max-w-7xl">
        {/* cinematic header */}
        <div className="mb-6 flex items-end justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              {!reduce && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E9D8A6] opacity-70" />
              )}
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#E9D8A6]" />
            </span>
            <h2 className="font-sans text-2xl font-medium lowercase tracking-[0.08em] text-[#F4EEDD] md:text-3xl">
              the broadcast
            </h2>
          </div>
          <span className="text-micro uppercase tracking-[0.3em] text-neutral-600">
            {liveCount > 0 ? `${liveCount} live now` : 'Season Zero'}
          </span>
        </div>

        <div className="overflow-hidden rounded-sm border border-white/[0.07] bg-white/[0.01]">
          {drops.map((d, i) => {
            const total = d.units_total || 1;
            const remaining = d.units_remaining ?? total;
            const sold = Math.max(0, total - remaining);
            const pctSold = Math.min(100, Math.round((sold / total) * 100));
            const scarce = remaining / total <= 0.15;
            const live = d.status === 'live';
            return (
              <motion.div
                key={d.id}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.55, delay: Math.min(i * 0.06, 0.4), ease: EASE }}
                className="group relative border-b border-white/[0.05] last:border-0"
              >
                {/* open-drop accent rail */}
                <span
                  className={`absolute left-0 top-0 h-full w-0.5 ${live ? 'bg-[#E9D8A6]' : 'bg-transparent'}`}
                  aria-hidden
                />
                <Link
                  href={`/drop/${d.id}`}
                  onClick={() => signal('countdown_view', d.id, undefined, { chapter: d.chapter })}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-6 py-6 transition-colors hover:bg-white/[0.03] sm:gap-8"
                >
                  {/* status */}
                  <span className="flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${live ? 'animate-pulse-scarce bg-[#E9D8A6]' : 'bg-neutral-700'}`}
                    />
                    <span className="hidden w-20 text-micro uppercase tracking-wide text-neutral-500 sm:inline">
                      {live ? 'Open' : 'Scheduled'}
                    </span>
                  </span>

                  {/* name + scarcity */}
                  <span className="min-w-0">
                    <span className="block truncate font-serif text-xl text-neutral-50 transition-colors group-hover:text-[#F4EEDD] md:text-2xl">
                      {d.name}
                    </span>
                    <span className="mt-2 flex items-center gap-3">
                      <span className="text-micro uppercase tracking-wide text-altar-goldlight/70">{d.chapter}</span>
                      <span className="hidden h-1 w-28 overflow-hidden rounded-full bg-white/10 sm:block">
                        <motion.span
                          className={`block h-full rounded-full ${scarce ? 'bg-chapter-relentless' : 'bg-[#E9D8A6]/80'}`}
                          initial={reduce ? false : { width: 0 }}
                          whileInView={{ width: `${pctSold}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.2, ease: EASE }}
                        />
                      </span>
                      <span
                        className={`text-micro tabular-nums ${scarce ? 'animate-pulse-scarce text-chapter-relentless' : 'text-neutral-500'}`}
                      >
                        {scarce ? 'almost gone · ' : ''}
                        {remaining}/{total} left
                      </span>
                    </span>
                  </span>

                  {/* countdown + enter cue */}
                  <span className="flex items-center gap-4 text-right">
                    <span>
                      {live ? <Countdown to={d.ends_at} label="closes" /> : <Countdown to={d.starts_at} label="opens" />}
                    </span>
                    <span className="hidden text-altar-goldlight opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100 md:inline">
                      →
                    </span>
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
