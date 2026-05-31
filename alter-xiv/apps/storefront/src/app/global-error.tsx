'use client';

/** Last-resort boundary if the root layout itself throws. Must render its own html/body. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: '#000', color: '#f5f5f5', fontFamily: 'Georgia, serif', textAlign: 'center', padding: '20vh 1rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 300 }}>Be still.</h1>
        <p style={{ color: '#888', marginTop: '0.5rem' }}>The sanctuary is being restored.</p>
        <button
          onClick={() => reset()}
          style={{ marginTop: '2rem', color: '#C9A96E', textTransform: 'uppercase', letterSpacing: '0.3em', fontSize: '11px' }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
