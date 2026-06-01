'use client';
import { useEffect, useRef } from 'react';
import { signal } from '../lib/signal';
import { useBehavior } from '../lib/useBehavior';
import type { EventType } from '@alterxiv/shared';

/**
 * Fires the page's primary signal once, and (when trackBehavior) emits dwell +
 * scroll_depth for the page/entity. Mount once at the top of a page.
 */
export function PageSignal({
  type,
  context,
  entityId,
  trackBehavior = true,
}: {
  type: EventType;
  context?: any;
  entityId?: string;
  trackBehavior?: boolean;
}) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    signal(type, entityId, undefined, context);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useBehavior(trackBehavior ? entityId : undefined, context ?? {});
  return null;
}
