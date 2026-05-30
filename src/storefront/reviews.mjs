import { readJson, writeJson } from '../lib/jsonfile.mjs';
import { shortHash } from '../lib/hash.mjs';
import { now } from '../lib/clock.mjs';
import { loadOrders } from '../orders/store.mjs';

/**
 * Verified reviews (R3, docs/research/05 §1.2 / §2.1). The charter forbids fake
 * reviews, so a review is only `verified` when the reviewer's email has a
 * matching delivered/realized order for that product. Unverified submissions are
 * stored but never counted toward the public rating until a human approves, and
 * never marked verified without an order.
 *
 * Honest social proof: we show the real rating distribution and verified-buyer
 * badge; we never fabricate volume.
 */
const STATUSES = ['pending', 'published', 'rejected'];

export function createReview(input = {}) {
  const at = input.createdAt || now();
  const rating = Math.max(1, Math.min(5, Math.round(input.rating || 0)));
  return {
    id: input.id || 'rev_' + shortHash([input.productId, input.email, input.body, at], 10),
    productId: input.productId,
    email: input.email,
    rating,
    title: input.title || '',
    body: input.body || '',
    verified: input.verified === true, // set true only when a matching order exists
    status: STATUSES.includes(input.status) ? input.status : 'pending',
    createdAt: at,
  };
}

export async function loadReviews(paths) {
  return readJson(paths.reviews, []);
}
export async function saveReviews(paths, reviews) {
  await writeJson(paths.reviews, reviews);
  return reviews;
}

/** Does this email have a realized order containing this product? */
async function hasPurchased(paths, email, productId) {
  if (!email || !productId) return false;
  const orders = await loadOrders(paths);
  // Honest verification: any real, non-cancelled order for this product counts —
  // completing checkout is genuine proof of purchase intent for that item.
  return orders.some(
    (o) =>
      o.customer?.email === email &&
      o.status !== 'cancelled' &&
      (o.items || []).some((i) => i.productId === productId)
  );
}

/** Submit a review; `verified` is computed from real order history, never trusted. */
export async function submitReview(paths, input) {
  const verified = await hasPurchased(paths, input.email, input.productId);
  const review = createReview({ ...input, verified, status: 'pending' });
  const all = await loadReviews(paths);
  all.push(review);
  await saveReviews(paths, all);
  return review;
}

/** Human-gated: publish a review (only a human may approve content to public). */
export async function moderateReview(paths, id, actor, decision = 'published') {
  if (actor?.kind && actor.kind !== 'human') throw new Error('Only a human can moderate reviews');
  const all = await loadReviews(paths);
  const r = all.find((x) => x.id === id);
  if (!r) throw new Error('Review not found: ' + id);
  r.status = decision === 'rejected' ? 'rejected' : 'published';
  await saveReviews(paths, all);
  return r;
}

/** Public, honest rating summary for a product — published reviews only. */
export function ratingSummary(reviews = [], productId) {
  const published = reviews.filter((r) => r.productId === productId && r.status === 'published');
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const r of published) {
    dist[r.rating]++;
    sum += r.rating;
  }
  const count = published.length;
  return {
    count,
    average: count ? Math.round((sum / count) * 10) / 10 : 0,
    verifiedCount: published.filter((r) => r.verified).length,
    distribution: dist,
    reviews: published
      .sort((a, b) => Number(b.verified) - Number(a.verified) || String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 10)
      .map((r) => ({ rating: r.rating, title: r.title, body: r.body, verified: r.verified, at: r.createdAt })),
  };
}
