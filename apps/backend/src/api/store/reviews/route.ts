import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import {
  createReview,
  listReviews,
  productReviewStats,
  validateReviewInput,
  reviewsRequireVerifiedPurchase,
  decideReviewAcceptance,
  verifyReviewPurchase,
  type ReviewInput,
} from '../../../lib/reviews-db';

/**
 * Store reviews API.
 *
 * GET  /store/reviews?product_id=...  → { reviews, stats }
 * POST /store/reviews                 → { review } (validates rating 1..5 + body length)
 *
 * Every handler is wrapped so a thrown error returns a JSON body (no unhandled 500 HTML page).
 */

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const productId = String((req.query?.product_id as string) ?? '').trim();
    if (!productId) {
      return res.status(400).json({ error: 'product_id is required' });
    }
    const [reviews, stats] = await Promise.all([listReviews(productId), productReviewStats(productId)]);
    return res.status(200).json({ reviews, stats });
  } catch (e) {
    return res.status(500).json({ error: 'Could not load reviews', detail: (e as Error)?.message?.slice(0, 200) });
  }
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const body = (req.body ?? {}) as Partial<ReviewInput>;
    const validated = validateReviewInput(body);
    if (!validated.ok) {
      return res.status(400).json({ error: validated.error });
    }

    // Verified-purchase gate: confirm the reviewer actually bought this product before publishing,
    // so the AggregateRating can never be inflated by reviews from non-buyers.
    const requireVerified = reviewsRequireVerifiedPurchase();
    const purchaseVerified = await verifyReviewPurchase(
      validated.value.email,
      validated.value.order_id,
      validated.value.product_id
    );
    const decision = decideReviewAcceptance({ requireVerified, purchaseVerified });
    if (!decision.accept) {
      return res.status(403).json({ error: decision.error });
    }

    const review = await createReview({ ...validated.value, verified: decision.verified });
    return res.status(201).json({ review });
  } catch (e) {
    return res.status(500).json({ error: 'Could not submit review', detail: (e as Error)?.message?.slice(0, 200) });
  }
};
