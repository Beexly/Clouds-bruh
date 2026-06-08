'use client';

import { useState } from 'react';
import { submitReview } from '../lib/api';

/**
 * On-brand customer review form. Posts to /store/reviews (validated server-side: rating 1..5, body
 * length). On success it shows a thank-you and the page can be refreshed to surface the new review.
 */
export function ReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError('');
    if (body.trim().length < 4) {
      setError('Please write at least a few words.');
      return;
    }
    setBusy(true);
    try {
      const res = await submitReview({
        product_id: productId,
        rating,
        body: body.trim(),
        title: title.trim() || undefined,
        email: email.trim() || undefined,
      });
      if (res.error) {
        setError(res.error);
      } else {
        setDone(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit your review.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="mt-6 border border-altar-goldlight/20 bg-altar-goldlight/[0.03] p-5">
        <p className="text-sm text-neutral-200">Thank you — your review has been received.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 text-micro uppercase tracking-widest text-altar-goldlight/80 hover:text-altar-goldlight"
        >
          Refresh to see it
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 border border-white/[0.06] p-5">
      <p className="text-micro uppercase tracking-widest text-neutral-500">Write a review</p>

      {/* Star rating */}
      <div className="mt-3 flex items-center gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            className="text-2xl leading-none transition"
          >
            <span className={(hover || rating) >= n ? 'text-altar-goldlight' : 'text-neutral-700'}>★</span>
          </button>
        ))}
        <span className="ml-2 text-xs text-neutral-500">{rating} / 5</span>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (optional)"
        className="mt-4 w-full border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 outline-none focus:border-neutral-600"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share your experience with this piece"
        rows={4}
        className="mt-3 w-full resize-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 outline-none focus:border-neutral-600"
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        autoComplete="email"
        placeholder="Email (optional, not published)"
        className="mt-3 w-full border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 outline-none focus:border-neutral-600"
      />

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

      <button
        onClick={submit}
        disabled={busy}
        className="mt-4 w-full border border-neutral-700 py-3 text-xs uppercase tracking-[0.3em] text-neutral-300 transition hover:border-neutral-500 disabled:opacity-50"
      >
        {busy ? 'Submitting…' : 'Submit Review'}
      </button>
    </div>
  );
}

export default ReviewForm;
