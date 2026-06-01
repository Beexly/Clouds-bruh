import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center">
      <p className="text-[9px] uppercase tracking-[0.4em] text-neutral-600">404</p>
      <h1 className="mt-4 font-serif text-4xl text-neutral-100">Not Found</h1>
      <p className="mt-4 text-sm text-neutral-500">This object has passed beyond the broadcast.</p>
      <Link
        href="/"
        className="mt-8 text-xs uppercase tracking-[0.3em] text-neutral-400 underline underline-offset-4 hover:text-neutral-100"
      >
        Return to The Broadcast
      </Link>
    </main>
  );
}
