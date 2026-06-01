import Link from 'next/link';

/** 404 — on the Eclipse, with the corona mark. Copy unchanged; styled to the luminous bar. */
export default function NotFound() {
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
            strokeOpacity="0.45"
            strokeWidth="1.5"
            strokeDasharray="6 230"
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
          />
          <circle cx="60" cy="10" r="2.5" fill="#F4EEDD" className="animate-pulse-scarce" />
        </svg>
        <p className="text-[9px] uppercase tracking-[0.4em] text-neutral-600">404</p>
        <h1 className="mt-4 font-serif text-4xl italic text-firstlight md:text-5xl">Not Found</h1>
        <p className="mt-4 text-sm text-neutral-500">This object has passed beyond the broadcast.</p>
        <Link
          href="/"
          className="mt-8 text-micro uppercase tracking-[0.3em] text-altar-goldlight underline underline-offset-4 transition hover:text-firstlight"
        >
          Return to The Broadcast
        </Link>
      </div>
    </main>
  );
}
