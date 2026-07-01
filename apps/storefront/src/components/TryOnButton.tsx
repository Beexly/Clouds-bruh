'use client';
import { useEffect, useState } from 'react';

const BASE = process.env.NEXT_PUBLIC_MEDUSA_URL || '';
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';

interface TryOnResult {
  status: 'ok' | 'unconfigured' | 'error';
  imageUrl?: string;
  jobId?: string;
  note?: string;
}

/**
 * AR virtual try-on affordance. Feature-detects GET /store/tryon and renders NOTHING unless a
 * provider is configured on the backend — so it never shows a broken button (and stays hidden in
 * demo mode, which has no backend). When configured, the customer supplies a photo URL and we POST
 * to /store/tryon (IDM-VTON / Kolors / generic). See apps/backend/src/lib/tryon.ts.
 */
export function TryOnButton({ garmentImageUrl }: { garmentImageUrl?: string | null }) {
  const [configured, setConfigured] = useState(false);
  const [open, setOpen] = useState(false);
  const [personUrl, setPersonUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TryOnResult | null>(null);

  useEffect(() => {
    if (!BASE) return;
    let alive = true;
    fetch(`${BASE}/store/tryon`, { headers: { 'x-publishable-api-key': PK } })
      .then((r) => (r.ok ? r.json() : { configured: false }))
      .then((d) => alive && setConfigured(Boolean(d?.configured)))
      .catch(() => alive && setConfigured(false));
    return () => {
      alive = false;
    };
  }, []);

  if (!configured || !garmentImageUrl) return null;

  async function run() {
    if (!personUrl.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await fetch(`${BASE}/store/tryon`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-publishable-api-key': PK },
        body: JSON.stringify({ person_image_url: personUrl.trim(), garment_image_url: garmentImageUrl }),
      });
      setResult((await r.json()) as TryOnResult);
    } catch {
      setResult({ status: 'error', note: 'Try-on failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 w-full border border-altar-goldlight/30 py-3 text-micro uppercase tracking-wide text-altar-goldlight transition hover:border-altar-goldlight/60"
      >
        See it on you
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-sm border border-neutral-800 bg-eclipse p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-micro uppercase tracking-sacred text-neutral-500">Virtual try-on</p>
            <h3 className="mt-1 font-serif text-xl text-neutral-100">See it on you</h3>
            <p className="mt-2 text-sm text-neutral-400">
              Paste a public URL of a full-body photo. We render this piece onto you.
            </p>
            <input
              value={personUrl}
              onChange={(e) => setPersonUrl(e.target.value)}
              placeholder="https://…/your-photo.jpg"
              className="mt-4 w-full border border-neutral-800 bg-void px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600"
            />
            <button
              type="button"
              onClick={run}
              disabled={loading || !personUrl.trim()}
              className="mt-3 w-full bg-altar-goldlight py-3 text-micro uppercase tracking-wide text-black transition disabled:opacity-40"
            >
              {loading ? 'Rendering…' : 'Render'}
            </button>

            {result?.status === 'ok' && result.imageUrl && (
              <img src={result.imageUrl} alt="Virtual try-on preview" className="mt-4 w-full rounded-sm" />
            )}
            {result?.status === 'ok' && !result.imageUrl && (
              <p className="mt-4 text-sm text-neutral-400">Rendering started — your preview will be ready shortly.</p>
            )}
            {result && result.status !== 'ok' && (
              <p className="mt-4 text-sm text-red-300/80">{result.note ?? 'Something went wrong.'}</p>
            )}

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 w-full text-micro uppercase tracking-wide text-neutral-500 hover:text-neutral-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
