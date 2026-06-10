# Stripe Card Rail — End-to-End Test Plan (B1 verification)
> Run after: this patch is merged + STRIPE_API_KEY (sk_test), STRIPE_WEBHOOK_SECRET, and
> NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (pk_test) are set in the Cloud env and redeployed.
> All four legs must pass before Payments flips GREEN in LAUNCH_LEDGER.md.

## Preconditions
- [ ] Storefront /checkout shows the card form (not "Test Mode") for a real cart — proves both
      gates: pk set + backend provider enabled for the region.
- [ ] Stripe dashboard webhook endpoint registered at `{BACKEND_URL}/hooks/payment/stripe_stripe`,
      events: payment_intent.succeeded, payment_intent.amount_capturable_updated, payment_intent.payment_failed.

## Leg 1 — Authorize + capture (happy path)
Card: `4242 4242 4242 4242` (any future expiry, any CVC, any postal).
- [ ] Pay → order confirmation page with order id.
- [ ] Stripe dashboard: PaymentIntent **succeeded**, amount matches cart total **in cents**.
- [ ] Medusa admin: order exists; payment captured (capture-on-auth default).
- [ ] Webhook delivery: 2xx on `payment_intent.succeeded` in Stripe's webhook log.

## Leg 2 — Forced FAILURE (decline honesty)
Card: `4000 0000 0000 0002` (generic decline).
- [ ] Inline error shown ("card was not charged"); **no order created**; cart intact.
- [ ] Stripe dashboard: PaymentIntent shows last attempt failed; **no capture**.
- [ ] No order email sent.

## Leg 3 — 3DS challenge (authentication path)
Card: `4000 0027 6000 3184` (requires authentication).
- [ ] 3DS modal appears; complete it → order created. Cancel it → honest failure, no order.

## Leg 4 — Refund (money exits as cleanly as it enters)
- [ ] Refund Leg 1's payment **from Medusa admin** (not the Stripe dashboard) — full refund.
- [ ] Stripe dashboard shows the refund; Medusa order shows refunded status.
- [ ] Webhook 2xx on the refund event; no duplicate refund possible on retry (idempotency).

## Replay / idempotency spot-check
- [ ] Stripe dashboard → webhook → "Resend" the succeeded event → backend returns 2xx, order/payment
      state unchanged (no double-capture).

## Evidence to paste into LAUNCH_LEDGER.md
PaymentIntent ids for legs 1–3, refund id for leg 4, webhook delivery screenshots/ids, order ids.
