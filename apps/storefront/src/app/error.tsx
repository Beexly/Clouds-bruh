'use client';
import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-void px-6 text-center">
      <p className="text-micro uppercase text-neutral-600">Something broke</p>
      <h1 className="mt-4 font-serif text-4xl text-neutral-100">Lights out.</h1>
      <p className="mt-3 text-sm text-neutral-500">The Broadcast dropped for a moment.</p>
      <div className="mt-8 flex gap-4">
        <button
          onClick={reset}
          className="text-micro uppercase tracking-[0.3em] text-altar-goldlight underline underline-offset-4"
        >
          Try again
        </button>
        <Link href="/" className="text-micro uppercase tracking-[0.3em] text-neutral-400 underline underline-offset-4 hover:text-neutral-100">
          Return
        </Link>
      </div>
    </main>
  );
}
