'use client';
import { useEffect } from 'react';
import { signal } from '../lib/signal';
import type { Drop } from '@alterxiv/shared';

/** The departure board — the heart of The Broadcast. Live drops with countdown + scarcity. */
export function DropBoard({ drops }: { drops: Drop[] }) {
  useEffect(() => { drops.forEach((d) => signal('drop_view', d.id, undefined, { chapter: d.chapter })); }, [drops]);
  return (
    <section className="border-y border-neutral-800 font-mono text-sm">
      {drops.map((d) => (
        <div key={d.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-6 border-b border-neutral-900 px-4 py-4 text-neutral-300">
          <div><span className="text-neutral-100">{d.name}</span> <span className="text-neutral-600">— {d.series}</span></div>
          <span className="uppercase tracking-widest text-neutral-500">{d.chapter}</span>
          <span className="text-amber-200/70">{d.units_remaining}/{d.units_total} left</span>
          <span className="tabular-nums text-neutral-400">{d.status === 'live' ? 'LIVE' : new Date(d.starts_at).toLocaleString()}</span>
        </div>
      ))}
    </section>
  );
}
