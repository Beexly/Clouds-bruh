'use client';
import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-sacred-grain px-6 text-center">
      <div className="flex animate-fade-up flex-col items-center">
        <svg viewBox="0 0 120 120" className="mb-8 h-20 w-20 opacity-80" fill="none" aria-hidden>
          <circle cx="60" cy="60" r="50" stroke="#54545A" strokeOpacity="0.3" strokeWidth="1" />
          <circle
            cx="60"
            cy="60"
            r="50"
            stroke="#E9D8A6"
            strokeOpacity="0.4"
            strokeWidth="1.5"
            strokeDasharray="4 240"
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
          />
          <circle cx="60" cy="10" r="2.5" fill="#F4EEDD" className="animate-pulse-scarce" />
        </svg>
        <p className="text-micro uppercase tracking-[0.3em] text-neutral-600">Something broke</p>
        <h1 className="mt-4 font-serif text-4xl italic text-firstlight md:text-5xl">Lights out.</h1>
        <p className="mt-3 text-sm text-neutral-500">The Broadcast dropped for a moment.</p>
        <div className="mt-8 flex gap-6">
          <button
            onClick={reset}
            className="text-micro uppercase tracking-[0.3em] text-altar-goldlight underline underline-offset-4 transition hover:text-firstlight"
          >
            Try again
          </button>
          <Link href="/" className="text-micro uppercase tracking-[0.3em] text-neutral-400 underline underline-offset-4 transition hover:text-neutral-100">
            Return
          </Link>
        </div>
      </div>
    </main>
  );
}
