'use client';
import { useEffect, useRef } from 'react';
import { signal } from './signal';

/**
 * Emit `dwell` (ms on entity) on unmount/leave, and `scroll_depth` at 25/50/75/100%.
 * Mount once per page/product view. Quiet by design — fires at most a handful of events.
 */
export function useBehavior(entityId?: string, context: Record<string, unknown> = {}) {
  const start = useRef(Date.now());
  const marks = useRef<Set<number>>(new Set());

  useEffect(() => {
    start.current = Date.now();
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      if (max <= 0) return;
      const pct = Math.min(1, doc.scrollTop / max);
      for (const t of [0.25, 0.5, 0.75, 1]) {
        if (pct >= t && !marks.current.has(t)) {
          marks.current.add(t);
          signal('scroll_depth', entityId, t, context);
        }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    const flushDwell = () => {
      const ms = Date.now() - start.current;
      if (ms > 800) signal('dwell', entityId, ms, context);
    };
    window.addEventListener('pagehide', flushDwell);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', flushDwell);
      flushDwell();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId]);
}
