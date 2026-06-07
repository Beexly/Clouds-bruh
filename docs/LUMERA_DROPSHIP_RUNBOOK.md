# Lumera Dropship Runbook

This is the Claude Code operating path for Lumera dropshipping. The founder should only need to open the Cockpit, review verified product candidates, and pick items.

## Non-Negotiable Gates

- No product publishes without founder approval.
- No live supplier order submits unless `VENDOR_LIVE_MODE=true` and `AUTO_SUBMIT_VENDOR_ORDERS=true`.
- No live launch claim while `pnpm preflight`, `pnpm vendor:preflight`, tests, lint, and build are failing.
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
pnpm vendor:preflight
pnpm vendor:test
pnpm curate -- --force
pnpm curation:e2e
pnpm fulfillment:sandbox
pnpm launch:proof
```

## Founder Flow

1. Start backend and storefront.
2. Open `/cockpit`.
3. Run `Curate Now`.
4. Review every card for supplier, margin, stock, shipping, score, and blockers.
5. Use `Approve Draft` for candidates that should be staged only.
6. Use `Approve + Publish` only when the card is unblocked and the vendor lane is configured.
7. Use `Need Sample` for apparel, expensive items, new suppliers, or unknown quality.
8. Use `Design Variant` for founder-created Printify/Printful products.

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
- `pnpm preflight`: readiness percent and blockers.
- `pnpm vendor:preflight`: each provider status.
- `pnpm vendor:test`: health/search/order-draft proof per provider.
- Cockpit screenshot showing at least one ready candidate and one blocked candidate.
- PDP screenshot showing Product Truth.
- Checkout screenshot showing Fulfillment Promise.
