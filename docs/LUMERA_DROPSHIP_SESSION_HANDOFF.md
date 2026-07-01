# Lumera Dropship — Session Handoff

What was built/polished in this autonomous session, what's verified, and how to turn it on.
Branch: `claude/affectionate-clarke-KJ8O1`. Everything is committed + pushed.

## What shipped this session

1. **Consolidation** — merged the Codex dropship lane (PR #6) onto the rebranded Lumera mainline
   (3-way merge; kept Brand Guidelines v2 + the real, data-wired PDP "Product Truth" panel).
2. **AliExpress / Alibaba / Shein radar sourcing** — `@lumera/shared/sourcing`: shared Oxylabs +
   Apify transport and a normalizer adapting the common OSS scraper field shapes into scored
   `ProductCandidate`s. `supplier_radar` agent tool; backend `curation/run` layers live discovery
   over the fixture seed; `pnpm radar` preview + `/lumera-radar`. Discovery-only by design (must
   assign a fulfilment route + re-shoot media before publish; never auto-publishes).
3. **Native Medusa fulfillment provider** (`lumera_dropship`) — real `AbstractFulfillmentProviderService`
   contract; `createFulfillment` stages a vendor order per supplier via the gated routing; opt-in via
   `LUMERA_NATIVE_FULFILLMENT=true` (manual stays default).
4. **SaaS-bridge connectors** — Spocket (US/EU) + Syncee (Alibaba-backed) behind the one
   `VendorConnector` interface; honest bridge-managed order status (never a fabricated "submitted").
5. **Vendor routing intelligence** — `rankVendorOptions` (margin/reliability/speed + failover) and
   `selectFulfillmentVendor`, wired into order routing for unassigned items; `vendor_select` tool for
   Quartermaster. Explicit vendor assignments are always respected.
6. **Supplier-health + margin-guard self-audit** — INTROSPECTION now flags vendors that would stall
   live fulfilment and products that fell below the margin floor.
7. **Correctness/security fixes** (from a self-review pass) — safe vendor failover, honest CJ submit
   status, dollars-based scraped-price parsing, and **correct Stripe webhook verification**
   (real `t,v1` scheme over the raw body — the previous generic HMAC would have 401'd every real
   Stripe webhook).
8. **Docs** — `docs/LUMERA_SOURCING_STACK.md` (reference benefits → integration → what key turns each
   on), PROGRESS Phase 13, README pointers.

## Verification status (honest)

- ✅ **120 unit tests** pass · `tsc --noEmit` clean (all 4 packages) · full `pnpm build` green
  (backend + storefront; storefront needs network for Google Fonts).
- ✅ Gated proof scripts pass: `vendor:preflight`, `vendor:test`, `curation:e2e`,
  `fulfillment:sandbox`, `launch:proof`, `radar` (all safe with no creds).
- ✅ New CI regression checks added for `shipping-estimate`, `product-truth`, `returns`.
- ⚠️ **Not verified here** (environment can't): the DB-backed `verify:api` suite (no Docker / no CI
  dispatch permission — needs a PR to run), live vendor/Stripe calls (need real keys), and an actual
  Medusa boot with the new provider loaded (compiles + registers; boot proven only by CI/Cloud).
- 🔒 Integrity preserved throughout: no path moves money, publishes, or submits a supplier order
  without the gates (`VENDOR_LIVE_MODE`, `AUTO_SUBMIT_VENDOR_ORDERS`, `VENDOR_DRAFT_ORDER_PROOF`,
  founder approval). With no keys, everything runs safely on fixtures.

## Turn-on order (fastest path to a first real shipped order)

1. **Vendor:** `PRINTIFY_TOKEN` + `PRINTIFY_SHOP_ID` (fastest) and/or `CJ_API_KEY` + `CJ_ACCESS_TOKEN`.
2. **Discovery (optional):** `OXYLABS_USER`/`OXYLABS_PASS` and/or `APIFY_TOKEN` (+ `APIFY_ALIEXPRESS_ACTOR`).
3. **Publish:** `MEDUSA_ADMIN_API_TOKEN`, `LUMERA_SALES_CHANNEL_ID`, `LUMERA_SHIPPING_PROFILE_ID`.
4. **Payments:** live `STRIPE_API_KEY` + `STRIPE_WEBHOOK_SECRET` (raw-body required for the custom hook).
5. **Native fulfilment (optional):** `LUMERA_NATIVE_FULFILLMENT=true`, then re-run `pnpm bootstrap`.
6. **Go live (founder-gated):** `VENDOR_LIVE_MODE=true`, then per-step `VENDOR_DRAFT_ORDER_PROOF=true`
   and `AUTO_SUBMIT_VENDOR_ORDERS=true` only after a sandbox drill.
7. Prove it: `pnpm vendor:preflight` → `pnpm curate -- --force` → approve on `/cockpit` →
   `pnpm publish:approved` → test order → `pnpm fulfillment:sandbox`.

## Suggested next (need a DB/keys or a PR to verify)

- Open a PR from this branch so CI runs `verify:api` (boots Medusa with the new provider + DB suite).
- Complete the SaaS set (Modalyst, Dropified) and add the official AliExpress order API.
- Reconcile `lib/lumera-db.ts` raw SQL with the native `lumera` Medusa module/migration.
- Stripe custom hook: confirm Medusa preserves `req.rawBody` (or rely on the native payment-stripe webhook).

---

## Session 2 — Launch infrastructure (security, observability, email, fulfillment realism, multichannel)

Built as parallel agent workers + integrated, all gated/fixture-safe, **no new npm deps** (HTTP `fetch`
+ CDN scripts), **169 unit tests green · lint clean · full build green**.

- **Defensive security hardening** (OWASP): production refuses to boot without `JWT_SECRET`/`COOKIE_SECRET`;
  cockpit/ops auth is header-only; per-IP rate limiting on `/store/*` + `/admin/lumera/*` (tunable, off
  under test/CI); input validation on `/shepherd` + `/preferences`; SSRF guard + outbound timeouts;
  Stripe webhook raw-body via middleware; storefront security headers (HSTS, X-Frame-Options, nosniff,
  CSP Report-Only); CI `pnpm audit` + secret-scan; `SECURITY.md`.
- **Observability**: backend Sentry envelope (`captureException`) on key catches; storefront analytics
  (Plausible / PostHog / umami) + Sentry browser, env-gated.
- **Email**: order confirmations now send via **Resend** (mock-until-keyed) + **Klaviyo** "Placed Order".
- **Fulfillment realism**: **EasyPost/Shippo** live carrier rates in the fulfillment provider
  (flat-rate fallback, never throws); native **PayPal** Orders v2 payment provider (gated on
  `PAYPAL_CLIENT_ID`, alongside Stripe).
- **Outbound multichannel selling**: gated **channel-sync** for Shopify / WooCommerce / Etsy / Amazon
  (Amazon honestly gated as `requires_sp_api_auth`; no live listing without `CHANNEL_LIVE_MODE` + creds).

### Money convention (decided): integer cents end-to-end
Lumera stores **integer cents everywhere**; convert to decimal dollars only at external boundaries.
`formatPayPalAmount` now does cents→`"99.00"` (÷100) and the fulfillment `calculatePrice` returns
**cents** (storefront ÷100 for display). One non-charging confirmation remains before `PAYPAL_ENV=live`:
do a PayPal **sandbox** capture and check the captured total equals the displayed price (if your Medusa
build passes major units to providers instead of cents, it's a one-line flip in `formatPayPalAmount`).
See `SECURITY.md` → "Money convention".

### New env (all optional, no-op without keys)
Security: `RATE_LIMIT_*`. Observability: `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`,
`NEXT_PUBLIC_PLAUSIBLE_DOMAIN` / `NEXT_PUBLIC_POSTHOG_*` / `NEXT_PUBLIC_UMAMI_*`. Email: `RESEND_API_KEY`,
`NOTIFICATION_EMAIL_FROM`, `KLAVIYO_API_KEY`. Fulfillment: `EASYPOST_API_KEY` / `SHIPPO_API_KEY`,
`PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` / `PAYPAL_ENV`. Channels: `SHOPIFY_*`, `WOOCOMMERCE_*`,
`ETSY_*`, `AMAZON_SP_*`, `CHANNEL_LIVE_MODE`. (Full list in `.env.example`.)

---

## Session 3 — Audit-driven hardening + customer lifecycle + automation

A repo-wide audit (resilience/backup, code-quality/testing, product/automation) drove this round.
All gated/fixture-safe, **no new npm deps**, integrated via parallel workers. **276 unit tests · lint ·
full build green.**

**Resilience / data (the critical fixes)**
- `agent_run` + `audit` tables had **no DDL anywhere** → fixed (idempotent `ensureLedgerTables`); agent
  history now persists and the cockpit reads real data instead of silently falling back to memory.
- Vendor webhooks verify the **raw body** (preserveRawBody) + can't throw unhandled 500s; prod refuses
  to boot without `DATABASE_URL`.
- Learning loop **reward-dedup** (no bandit corruption on Redis redelivery) + orchestrator **XAUTOCLAIM**
  crash-recovery (reclaim pending on boot).
- **Backup/DR**: `scripts/backup.ts` (gated `pg_dump`), `DR_RUNBOOK.md`, `INCIDENT_RUNBOOK.md`,
  secret-rotation in `SECURITY.md`.

**Integrity / quality**
- `brand_audit` no longer rubber-stamps; stub tools return honest `unconfigured`/`mock`.
- Tests added for the previously-untested auth gate + data layer + webhook verify + reward math.
- CI: Dependabot, CODEOWNERS, PR template, CONTRIBUTING; corrected the false "Claude Agent SDK" doc claim.

**Customer lifecycle (the biggest product gap — now real)**
- **Accounts** (login/register, httpOnly session), **order history + tracking**, self-serve **/returns**,
  first-party **reviews** (drive the PDP rating), **wishlist**, **gift-card** purchase/redeem UX.
- **Real payment rails**: gated **PayPal** (CDN buttons, server-computed amount) with the test flow
  preserved as fallback. (Stripe Elements is the one follow-up — needs an npm SDK this env can't add.)

**Automation / agents**
- **Agent skills wired** (SKILLS.md → real, surfaced in prompts), **founder KPIs** in the cockpit,
  **GDPR cookie consent**, **shipment "shipped" email**, **abandoned-cart recovery** (hourly, gated).

## ✅ Go-live checklist (what's left — mostly your live keys, not code)
1. **Core secrets/env** (prod): `JWT_SECRET`, `COOKIE_SECRET`, `DATABASE_URL`, `STORE_CORS`,
   `ADMIN_CORS`, `COCKPIT_KEY`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`. (Prod now
   fail-fasts if the first three are missing.)
2. **Seed + pgvector** on the Cloud DB (`pnpm bootstrap`); migrations create all module tables.
3. **Agents live**: `ANTHROPIC_API_KEY` (Polaris + CONGREGATION flip mock→live).
4. **Payments**: a **PayPal sandbox capture** to confirm the cents↔decimal money unit (the one pre-live
   check), then `PAYPAL_CLIENT_ID`/`SECRET` + `NEXT_PUBLIC_PAYPAL_CLIENT_ID`; and/or take Stripe live.
5. **Email/analytics/monitoring** (optional, all gated): `RESEND_API_KEY`+`NOTIFICATION_EMAIL_FROM`,
   `KLAVIYO_API_KEY`, `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN`, one of Plausible/PostHog/umami.
6. **Dropship live** (founder-gated, after a sandbox drill): vendor keys (Printify/Printful/CJ/…),
   then `VENDOR_LIVE_MODE=true` → `VENDOR_DRAFT_ORDER_PROOF=true` → `AUTO_SUBMIT_VENDOR_ORDERS=true`.
7. **Discovery** (optional): `OXYLABS_*`/`APIFY_TOKEN` for AliExpress/Alibaba radar.
8. **Backups**: schedule `pnpm backup` (or confirm Medusa Cloud's cadence) + run one restore drill.
9. **Run CI** (`verify:api`) by opening a PR — boots Medusa against real Postgres+Redis and runs the
   migrate·seed·regression suite (the one verification that can't run in the dev sandbox).
