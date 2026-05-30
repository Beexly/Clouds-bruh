/**
 * Stripe seam. v1 builds INTENT objects only — it never calls Stripe and never
 * captures funds (`live: false`). Phase 4 swaps these for real test-mode calls
 * via the Stripe MCP, behind ALTAR_LIVE=1 + STRIPE_MODE=test. No secrets here.
 */
export function buildPaymentLinkIntent(order) {
  return {
    provider: 'stripe',
    live: false,
    mode: 'intent-only',
    lineItems: order.items.map((i) => ({
      sku: i.sku,
      quantity: i.qty,
      amountMinor: i.unitPriceMinor,
      currency: i.currency,
    })),
    amountMinor: order.totals.grandMinor,
    currency: order.totals.currency,
    note: 'v1 intent only — no Stripe call, no capture.',
  };
}

export function buildRefundIntent(order, amountMinor) {
  return {
    provider: 'stripe',
    live: false,
    mode: 'intent-only',
    orderNumber: order.number,
    amountMinor: Number.isFinite(amountMinor) ? amountMinor : order.totals.grandMinor,
    currency: order.totals.currency,
    note: 'Refund is human-gated; v1 builds the intent only.',
  };
}
