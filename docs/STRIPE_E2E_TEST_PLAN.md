# Stripe Card Rail — End-to-End Test Plan (B1 verification)
> Run after: this patch is merged + STRIPE_API_KEY, STRIPE_WEBHOOK_SECRET, and
> NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY are set in the Cloud env and redeployed.
> All four legs must pass before Payments flips GREEN in LAUNCH_LEDGER.md.
>
> **Director code review (f48ca0d): PASS.** Provider id `pp_stripe_stripe` correct + unit-tested;
> server-created PaymentIntent (browser never computes the amount); honest failure paths incl. the
> charged-but-no-order "do NOT retry — contact support" guard. CI green (run #70/#71). What remains is
> this live money-path run — code correctness is verified; money behavior is not, until these legs pass.
>
> **Key mode:** founder currently has `pk_live`/`sk_live` in Cloud. Either run these legs on **test**
> keys first (recommended — Stripe test cards below only work in test mode) and flip to live at go-live,
> OR run on live with a real card you refund immediately (Leg 4). Test cards will NOT work against live keys.

## Preconditions
- [ ] Storefront /checkout shows the card form (not "Test Mode") for a real cart — proves both
      gates: pk set + backend provider enabled for the region.
- [ ] Stripe dashboard webhook endpoint registered at the **native** route
      `https://lumeralabel.medusajs.app/hooks/payment/stripe_stripe` (NOT the audit-only `/hooks/stripe`,
      and NOT the retired `gegege` host), events: payment_intent.succeeded,
      payment_intent.amount_capturable_updated, payment_intent.payment_failed.

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

### Leg 3b — 3DS **redirect-return** (KNOWN GAP — must verify before taking real 3DS/SCA cards)
Card: `4000 0000 0000 3220` (forces a full-page redirect authentication).
- [ ] After authenticating, the browser returns to `/checkout?payment_intent=…&redirect_status=succeeded`
      and an **order is created** for that succeeded intent.
> **Director-flagged gap (StripeCardForm.tsx):** `confirmPayment({ redirect: 'if_required' })` resolves
> inline for most US cards (Legs 1/3 pass), but a card that triggers a *full redirect* leaves the page;
> on return, the component's `useEffect` unconditionally creates a NEW payment collection and never
> completes the cart for the already-succeeded intent → **paid, no order**. Low risk for a US-first
> launch (`if_required` rarely redirects domestic cards); real for EU/SCA. **Fix (not yet shipped —
> would be unverified money-path code):** on mount, read `payment_intent_client_secret` from the URL,
> `stripe.retrievePaymentIntent` → if `succeeded`, call `completeCart` instead of creating a new
> collection. Land + verify this leg before enabling non-US card traffic.

## Leg 4 — Refund (money exits as cleanly as it enters)
- [ ] Refund Leg 1's payment **from Medusa admin** (not the Stripe dashboard) — full refund.
- [ ] Stripe dashboard shows the refund; Medusa order shows refunded status.
- [ ] Webhook 2xx on the refund event; no duplicate refund possible on retry (idempotency).

## Replay / idempotency spot-check
- [ ] Stripe dashboard → webhook → "Resend" the succeeded event → backend returns 2xx, order/payment
      state unchanged (no double-capture).

## Evidence to paste into LAUNCH_LEDGER.md
PaymentIntent ids for legs 1–3, refund id for leg 4, webhook delivery screenshots/ids, order ids.
