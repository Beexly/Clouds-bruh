'use client';
import { useEffect } from 'react';
import { signal } from '../lib/signal';
import type { EventType } from '@alterxiv/shared';

export function PageSignal({ type, context }: { type: EventType; context?: any }) {
  useEffect(() => {
    signal(type, undefined, undefined, context);
  }, [type, context]);
  return null;
}
