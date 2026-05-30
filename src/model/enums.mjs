/** Canonical enums. Frozen objects + value lists used by validators and guards. */

export const Lifecycle = Object.freeze({
  DRAFT: 'draft',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
  REJECTED: 'rejected',
});

export const Visibility = Object.freeze({
  HIDDEN: 'hidden',
  UNLISTED: 'unlisted',
  VISIBLE: 'visible',
});

export const StockState = Object.freeze({
  OUT: 'out-of-stock',
  LOW: 'low-stock',
  IN: 'in-stock',
  PREORDER: 'preorder',
});

export const Currency = Object.freeze({ USD: 'USD', EUR: 'EUR', GBP: 'GBP' });

export const QueueStatus = Object.freeze({
  PROPOSED: 'proposed',
  QUEUED: 'queued',
  IN_REVIEW: 'in_review',
  NEEDS_CHANGES: 'needs_changes',
  APPROVED: 'approved',
  PUBLISHING: 'publishing',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
});

export const CandidateKind = Object.freeze({
  PRODUCT: 'product',
  RESTOCK: 'restock',
  PRICE_CHANGE: 'price_change',
  SUPPLIER: 'supplier',
  MEDIA: 'media',
  TREND: 'trend',
});

export const OrderStatus = Object.freeze({
  INTAKE: 'intake',
  PAYMENT_PENDING: 'payment_pending',
  PAID: 'paid',
  ROUTED: 'routed',
  IN_FULFILLMENT: 'in_fulfillment',
  SHIPPED: 'shipped',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RETURN_REQUESTED: 'return_requested',
  RETURN_IN_TRANSIT: 'return_in_transit',
  RETURNED: 'returned',
  REFUNDED: 'refunded',
});

/** Who is performing an action. The human gate hinges on this distinction. */
export const ActorKind = Object.freeze({
  AGENT: 'agent',
  HUMAN: 'human',
  SYSTEM: 'system',
});

export const MediaRole = Object.freeze({
  HERO: 'hero',
  ANGLE: 'angle',
  DETAIL: 'detail',
  FLATLAY: 'flatlay',
  SCALE: 'scale',
  VIDEO: 'video',
});

export const MediaProvenance = Object.freeze({
  PLACEHOLDER: 'placeholder',
  IMAGEGEN: 'imagegen',
  UPLOAD: 'upload',
});

/** Frozen list of an enum's values — handy for validators. */
export function values(enumObj) {
  return Object.freeze(Object.values(enumObj));
}
