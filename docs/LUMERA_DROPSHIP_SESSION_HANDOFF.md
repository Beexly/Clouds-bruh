# Lumera Dropship — Session Handoff

What was built/polished in this autonomous session, what's verified, and how to turn it on.
Branch: `claude/affectionate-clarke-KJ8O1`. Everything is committed + pushed.

## What shipped this session

1. **Consolidation** — merged the Codex dropship lane (PR #6) onto the rebranded Lumera mainline
   (3-way merge; kept Brand Guidelines v2 + the real, data-wired PDP "Product Truth" panel).
2. **AliExpress / Alibaba / Shein radar sourcing** — `@alterxiv/shared/sourcing`: shared Oxylabs +
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
