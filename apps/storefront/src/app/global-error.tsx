'use client';

/** Last-resort boundary if the root layout itself throws. Must render its own html/body. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: '#0B0B0D', color: '#F4EEDD', fontFamily: 'Georgia, serif', textAlign: 'center', padding: '20vh 1rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 300 }}>Lights out.</h1>
        <p style={{ color: '#8a8a90', marginTop: '0.5rem' }}>The broadcast will be right back.</p>
        <button
          onClick={() => reset()}
          style={{ marginTop: '2rem', color: '#E9D8A6', textTransform: 'uppercase', letterSpacing: '0.3em', fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
