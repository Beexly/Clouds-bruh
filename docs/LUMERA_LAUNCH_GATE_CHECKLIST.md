# Lumera Launch Gate Checklist

Each proof layer must be reported separately. Do not blend local code health with live commerce readiness.

## Code Health

- `pnpm test` passes.
- `pnpm lint` passes.
- `pnpm build` passes.

## Commerce Environment

- `pnpm preflight` passes all blockers.
- `pnpm owner:actions` shows zero missing owner-only launch actions.
- Publishable key is copied to the storefront.
- Region, sales channel, shipping profile, shipping option, and payment provider are configured.
- Redis and S3 are configured for production intelligence/media durability.

## Vendor Readiness

- `pnpm vendor:preflight` shows configured vendors.
- `pnpm vendor:test` proves health and fixture/live search behavior.
- At least one provider has sandbox order-draft proof after `VENDOR_DRAFT_ORDER_PROOF=true` is explicitly approved for that proof run.
- Live order submission remains disabled until founder approval.

## Curation Board

- `/cockpit` loads with `COCKPIT_KEY`.
- `Curate Now` creates candidates idempotently.
- Cards show supplier, cost, retail, margin, stock, lead time, score, and blockers.
- Approve/reject/sample/design actions create auditable records.

## Publishing

- Product payload validates against Medusa Admin API.
- Existing products update by `lumera_candidate_id` instead of duplicating.
- Product is attached to sales channel and has variants, images, metadata, and Product Truth.

## Fulfillment

- Paid orders create staged vendor orders.
- Live flags create `ready_for_vendor_submission`, not `submitted`, until the provider connector returns an accepted vendor order ID.
- Vendor webhooks are recorded and verified.
- Tracking, cancel, retry, return, and delay-consent states are visible in fulfillment admin.

## Legal and Trust

- Terms, privacy, and returns pages are final, not placeholders.
- No fake reviews are rendered or emitted as structured data.
- Product Truth shows supplier, region, ship estimate, returns, quality checks, and price logic.

## Launch Verdict

Launch is blocked if any of these are true:

- Missing commerce env blocker.
- Vendor live mode enabled with missing vendor credentials.
- Stripe is still test mode while vendor live mode is true.
- Legal placeholder text is detected.
- Products use fixture-only supplier data.
- Sandbox fulfillment proof is missing.
