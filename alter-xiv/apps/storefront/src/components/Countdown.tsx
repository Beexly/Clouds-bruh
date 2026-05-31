'use client';
import { useEffect, useState } from 'react';

/**
 * A reverent countdown to a drop's open/close. Renders nothing until mounted
 * (avoids hydration drift), then ticks once a second.
 */
export function Countdown({ to, label }: { to: string; label?: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (now == null) return null;
  const target = new Date(to).getTime();
  const diff = Math.max(0, target - now);
  if (diff === 0) return <span className="text-micro uppercase text-altar-gold">now</span>;

  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  const parts = d > 0 ? [`${d}d`, `${h}h`, `${m}m`] : [`${h}h`, `${m}m`, `${s}s`];

  return (
    <span className="tabular-nums text-micro uppercase tracking-wide text-altar-goldlight">
      {label ? `${label} ` : ''}
      {parts.join(' : ')}
    </span>
  );
}
