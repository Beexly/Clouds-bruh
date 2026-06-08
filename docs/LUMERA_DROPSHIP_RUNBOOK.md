# Lumera Dropship Runbook

This is the Claude Code operating path for Lumera dropshipping. The founder should only need to open the Cockpit, review verified product candidates, and pick items.

## Non-Negotiable Gates

- No product publishes without founder approval.
- No live supplier order submits unless `VENDOR_LIVE_MODE=true` and `AUTO_SUBMIT_VENDOR_ORDERS=true`.
- No live launch claim while `pnpm preflight -- --live`, `pnpm vendor:preflight`, tests, lint, and build are failing.
- Fixtures are allowed for local demo and tests only. They are not launch evidence.
- Missing credentials are owner actions, not code guesses.

## Setup Sequence

1. Install and verify local code health.

```bash
pnpm install
pnpm test
pnpm lint
pnpm build
```

2. Configure required commerce environment.

```env
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
COOKIE_SECRET=
STORE_CORS=
ADMIN_CORS=
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=
MEDUSA_ADMIN_API_TOKEN=
LUMERA_SALES_CHANNEL_ID=
LUMERA_SHIPPING_PROFILE_ID=
COCKPIT_KEY=
```

3. Configure vendor environment.

```env
PRINTIFY_TOKEN=
PRINTIFY_SHOP_ID=
PRINTFUL_TOKEN=
PRINTFUL_STORE_ID=
CJ_API_KEY=
CJ_ACCESS_TOKEN=
CJ_SANDBOX=true
VENDOR_LIVE_MODE=false
AUTO_SUBMIT_VENDOR_ORDERS=false
VENDOR_DRAFT_ORDER_PROOF=false
```

4. Run gates in order.

```bash
pnpm preflight
pnpm preflight -- --live
pnpm vendor:preflight
pnpm vendor:test
pnpm owner:actions
pnpm owner:actions -- --live
pnpm curate -- --force
pnpm curation:e2e
pnpm fulfillment:sandbox
pnpm vendor-orders:submit
pnpm launch:proof
```

Use `pnpm preflight -- --live` and `pnpm owner:actions -- --live` only when proving live production readiness. The default commands are code-readiness ledgers and should not block local push readiness just because production secrets are not loaded in the shell.

## Founder Flow

1. Start backend and storefront.
2. Open `/cockpit`.
3. Run `Curate Now`.
4. Review every card for supplier, margin, stock, shipping, score, and blockers.
5. Use `Approve Draft` for candidates that should be staged only.
6. Use `Approve + Publish` only when the card is unblocked and the vendor lane is configured.
7. Use `Need Sample` for apparel, expensive items, new suppliers, or unknown quality.
8. Use `Design Variant` for founder-created Printify/Printful products.

## Paid Order Routing

- `order.placed` creates deterministic `lumera_vendor_order` records grouped by vendor.
- `staged_for_approval` means live vendor submission is disabled.
- `ready_for_vendor_submission` means live flags are enabled, but no supplier order has been accepted yet.
- `blocked_missing_supplier_sku` means the product was not publish-ready for vendor fulfillment.
- Only a provider connector response may set a real submitted/confirmed status and vendor order ID.
- `pnpm vendor-orders:submit` processes only `ready_for_vendor_submission` and `retry_staged` records, and exits without submitting anything unless `VENDOR_LIVE_MODE=true` and `AUTO_SUBMIT_VENDOR_ORDERS=true`.

## Claude Code Recovery Rules

- If `pnpm vendor:preflight` fails, do not edit code unless the failure is a code exception. Return exact missing env keys.
- If candidate publishing returns `blocked`, fix only the blocker named by the payload.
- If vendor APIs return 401/403, stop and ask for credential/account correction.
- If sandbox order creation fails, do not enable live vendor order submission.
- Do not set `VENDOR_DRAFT_ORDER_PROOF=true` unless the owner has approved creating provider-side sandbox/draft orders.
- If legal placeholder checks fail, update legal content or keep launch blocked.

## Launch Evidence To Capture

- `pnpm test`: pass/fail and first failure.
- `pnpm lint`: pass/fail and first failure.
- `pnpm build`: pass/fail and affected package.
- `pnpm preflight`: local code-push readiness percent and live-readiness debt.
- `pnpm preflight -- --live`: production go/no-go blockers.
- `pnpm vendor:preflight`: each provider status.
- `pnpm vendor:test`: health/search/order-draft proof per provider.
- Cockpit screenshot showing at least one ready candidate and one blocked candidate.
- PDP screenshot showing Product Truth.
- Checkout screenshot showing Fulfillment Promise.
