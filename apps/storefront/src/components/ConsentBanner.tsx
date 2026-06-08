'use client';

import { useEffect, useState } from 'react';

/**
 * Cookie consent / GDPR gate — dark luminous editorial luxury.
 *
 * Persists the visitor's choice in localStorage under CONSENT_STORAGE_KEY. Analytics
 * (components/Analytics.tsx) only mounts its scripts once consent === 'accepted'. The
 * banner dispatches a `lumera:consent` window event on change so the same-tab Analytics
 * component re-reads consent without a reload.
 *
 * No third-party SDK, no network — pure client state. Essential cookies (cart, session)
 * are exempt and always allowed; this gate governs analytics/measurement only.
 */
export const CONSENT_STORAGE_KEY = 'lumera_consent';
export const CONSENT_EVENT = 'lumera:consent';
export type ConsentValue = 'accepted' | 'declined';

/** Read the stored consent decision (client-only). Returns null if not yet chosen. */
export function readConsent(): ConsentValue | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return v === 'accepted' || v === 'declined' ? v : null;
  } catch {
    return null;
  }
}

export function ConsentBanner() {
  // null until we've read localStorage on mount, then 'accepted' | 'declined' | 'unset'.
  const [decision, setDecision] = useState<ConsentValue | 'unset' | null>(null);

  useEffect(() => {
    setDecision(readConsent() ?? 'unset');
  }, []);

  const choose = (value: ConsentValue) => {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
    } catch {
      /* storage may be blocked; the banner still dismisses for this session */
    }
    setDecision(value);
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
  };

  // Don't render until mounted (avoids hydration flash) or once a choice exists.
  if (decision === null || decision === 'accepted' || decision === 'declined') return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-altar-gold/20 bg-void/95 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-micro uppercase tracking-[0.32em] text-altar-goldlight">A note on cookies</p>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">
            Essential cookies keep your cart and session working. With your consent, we also use analytics to
            understand how the Broadcast is used and make it better. You can change your mind anytime.{' '}
            <a href="/legal/privacy" className="text-neutral-300 underline underline-offset-4 hover:text-altar-goldlight">
              Privacy Policy
            </a>
            .
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => choose('declined')}
            className="border border-white/10 px-4 py-2.5 text-micro uppercase tracking-[0.28em] text-neutral-400 transition hover:border-white/30 hover:text-neutral-200"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => choose('accepted')}
            className="border border-altar-gold/40 px-4 py-2.5 text-micro uppercase tracking-[0.28em] text-altar-goldlight transition hover:border-altar-gold"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConsentBanner;
