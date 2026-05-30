import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tempPaths } from './helpers.mjs';
import { submitReview, moderateReview, ratingSummary, loadReviews } from '../src/storefront/reviews.mjs';
import { saveOrders } from '../src/orders/store.mjs';
import { createOrder } from '../src/model/order.mjs';
import { human, agent } from '../src/lib/actor.mjs';

test('a review is verified only when a matching realized order exists', async () => {
  const paths = await tempPaths();
  // buyer@ purchased prod_x; stranger@ did not.
  const order = createOrder({
    items: [{ productId: 'prod_x', variantId: 'v', sku: 'S', unitPriceMinor: 1000, qty: 1 }],
    customer: { email: 'buyer@example.com' },
    status: 'paid',
  });
  await saveOrders(paths, [order]);

  const r1 = await submitReview(paths, { productId: 'prod_x', email: 'buyer@example.com', rating: 5, body: 'Superb' });
  const r2 = await submitReview(paths, { productId: 'prod_x', email: 'stranger@example.com', rating: 1, body: 'Meh' });
  assert.equal(r1.verified, true);
  assert.equal(r2.verified, false);
  assert.equal(r1.status, 'pending'); // never public until moderated
});

test('reviews are not public until a human moderates; agents cannot moderate', async () => {
  const paths = await tempPaths();
  const r = await submitReview(paths, { productId: 'prod_y', email: 'a@example.com', rating: 4, body: 'Good' });

  // not visible while pending
  let summary = ratingSummary(await loadReviews(paths), 'prod_y');
  assert.equal(summary.count, 0);

  await assert.rejects(() => moderateReview(paths, r.id, agent('support')), /human/i);
  await moderateReview(paths, r.id, human('operator'), 'published');

  summary = ratingSummary(await loadReviews(paths), 'prod_y');
  assert.equal(summary.count, 1);
  assert.equal(summary.average, 4);
});

test('rating summary distribution and verified ordering', async () => {
  const paths = await tempPaths();
  const a = await submitReview(paths, { productId: 'p', email: 'x@example.com', rating: 5, body: 'A' });
  const b = await submitReview(paths, { productId: 'p', email: 'y@example.com', rating: 3, body: 'B' });
  await moderateReview(paths, a.id, human(), 'published');
  await moderateReview(paths, b.id, human(), 'published');
  const s = ratingSummary(await loadReviews(paths), 'p');
  assert.equal(s.count, 2);
  assert.equal(s.average, 4);
  assert.equal(s.distribution[5], 1);
  assert.equal(s.distribution[3], 1);
});
