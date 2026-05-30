# Eclipse R&D — Findings 01: E-commerce Templates & Patterns

Mining open-source projects under `/home/user/eclipse-research/sources/` for patterns to evolve Eclipse
(`/home/user/Clouds-bruh`) into a superior marketplace + POS + checkout system.

**Lens (hard constraints carried into every recommendation):** Eclipse is dependency-free (Node built-ins +
`node:test`), ESM `.mjs`, money in **integer minor units + currency**, **append-only event log** (`data/events.ndjson`,
`queue/candidates.ndjson`; `index.json`/`catalog.json` are projections), **safe-by-default** (every product is born
draft/hidden/out-of-stock and only a human can publish). Every external integration follows the **"export request
artifact → Claude agent fulfills via MCP → record result back"** pattern, because the Node runtime cannot call MCP
tools. So heavy framework code is mined for *shape and semantics*, never for direct import.

**Eclipse baseline confirmed by reading the code (so we don't reinvent what exists):**
- Product/variant/media model: `src/model/product.mjs` — variant has hard-coded `color`/`size`, per-variant `priceMinor`
  + `inventory{onHand,reserved,restockThreshold}`, product has `pricing{listMinor,currency,floorMinor,marginPct}`,
  flat `category` string + `tags[]` + `specs{}` + `collectionId` + `tier`.
- Order model + lifecycle: `src/model/order.mjs` (line-item `unitPriceMinor`/`lineTotalMinor`, `computeTotals` with
  subtotal/shipping/tax/grand, `payment.live` flag, `statusHistory[]`), state machine `src/orders/lifecycle.mjs`
  (INTAKE→PAYMENT_PENDING→PAID→ROUTED→…→DELIVERED/REFUNDED, forward-only, terminal states).
- Checkout: `src/orders/checkout.mjs` — resolves prices only from LIVE products (`isLive`), reserves inventory
  atomically per call (anti-oversell), payment **intent-only** (`live:false`, no Stripe call).
- Guardrails (do not weaken): queue state machine `src/queue/transitions.mjs` (agent can never reach
  approved/publishing/published; `approved` needs `gate.passed===true`); default-deny projection
  `src/storefront/projection.mjs` (`isLive` = published ∧ visible ∧ in/low-stock); launch gate
  `src/scoring/launch-gate.mjs` (`human_approved` required); Stripe groundwork `src/orders/stripe-sync.mjs`
  (TEST-mode `create_product`/`create_price` artifacts, idempotency-keyed, never live).

---

## Per-project takeaways (from reading the actual code)

### 1. Relivator (`0f990d45-relivatormain/relivator-main`) — Next.js 15 + Drizzle + Postgres. THE most relevant, but smaller than expected.

**Reality check:** this build is **auth + billing focused**, not a full commerce schema. It uses **Better Auth**
(not Clerk) and **Polar.sh as Merchant-of-Record** (`@polar-sh/sdk`, `@polar-sh/better-auth`) layered on Stripe —
*not* raw Stripe. Cart is client-side only; there are **no server-side product/variant/order tables** in the DB
schema. So the richest commerce-schema lessons here are the auth/billing/filters shapes + what it deliberately omits.

- **DB schema** (`src/db/schema/`), split by domain — a clean modular pattern:
  - `users/tables.ts`: `users` (id, email unique+indexed, `role` text, `banned`/`banReason`/`banExpires`,
    `twoFactorEnabled`), `sessions` (opaque `token` unique, `expiresAt`, `ipAddress`, `userAgent`, FK→users cascade,
    indexed by userId), `accounts` (OAuth/credential provider rows: providerId, access/refresh tokens, `password`).
  - `payments/tables.ts`: `customers` (userId→users, **both** `stripeCustomerId` and `polarCustomerId`),
    `subscriptions` (userId, customerId, `status`, `productId`, `priceId`, `currentPeriodEnd`, `cancelAtPeriodEnd`).
  - `relations.ts` files wire users↔sessions↔accounts via Drizzle `relations()`. **Pattern worth copying: schema
    split per domain folder with a sibling `relations.ts`** — maps cleanly to Eclipse's per-entity `src/model/*.mjs`.
- **Billing as Merchant-of-Record** (`src/api/payments/service.ts`): `polarClient.checkouts.create({products,
  successUrl, customerExternalId, metadata:{userId}})` returns a hosted URL; `syncSubscription(payload)` does an
  idempotent **upsert keyed on subscription id** from the webhook, reading `metadata.userId`. **MoR (Polar/Lemon
  Squeezy/Paddle) offloads global tax + compliance** — a strong option vs. raw Stripe for a small team.
- **Auth wiring** (`src/lib/auth.ts`): Better Auth + Drizzle adapter, `emailAndPassword`, plugins for
  `twoFactor()`, `admin()`, and Polar `checkout/portal/webhooks` — **billing webhooks are registered through the
  auth layer**, `createCustomerOnSignUp:true`. Clean separation of concerns.
- **Cart** (`src/lib/hooks/use-cart.tsx`): Zustand + `persist` (localStorage `cart-storage`). Line snapshots
  `{id,name,price,quantity,image,storeId}` — note `storeId` per line hints at multi-seller carts. **`total()`
  uses `price*quantity` in floats — DO NOT copy; Eclipse minor-units is better.**
- **Catalog filter contract** (`src/lib/filters.ts`): `productsSearchParamsSchema` = `{page, per_page, sort
  (default "createdAt.desc"), categories (CSV), subcategories (CSV), price_range ("min-max"), store_ids (CSV),
  active}` + helpers `parsePriceRange`, `splitParam`. **This is the single most copyable artifact** — a clean,
  URL-driven facet/sort/paginate contract. The `"field.dir"` sort encoding is tidy.
- **Admin/dashboard**: routes exist (`src/app/admin/summary`, `src/app/dashboard/{billing,stats,settings,uploads}`)
  but are thin scaffolds. Structure to note: a separate `admin` area vs. per-user `dashboard`.
- **Media uploads**: UploadThing (`src/lib/uploadthing.ts`, `app/api/media/url-upload`) — external blob host with a
  URL-upload route. Analogue to Eclipse's imagery-artifact flow (media stays unapproved until a human approves).

### 2. SaaS Foundations (`6759d5ee-SaaSFoundationsmain/SaaS-Foundations-main`) — **Django** (Python), not Turborepo. Best billing-lifecycle + entitlements reference.

- **Plan/Price modeling** (`src/subscriptions/models.py`): `Subscription` = **Stripe Product**, `SubscriptionPrice`
  = **Stripe Price** (with `interval` month/year, `stripe_id`, `order`, `featured`, `price` decimal). The plan→price
  split mirroring Stripe's own object graph is the canonical headless billing shape.
- **Entitlements via permission groups**: `Subscription` has M2M to `auth.Group` + `auth.Permission`
  (`SUBSCRIPTION_PERMISSIONS = advanced/pro/basic/basic_ai`). **A plan grants a set of named permissions/groups** —
  exactly the "plans-as-capabilities" model Eclipse needs to sell tiers later, expressible as a plain `.mjs` map.
- **Customer object** (`src/customers/models.py`): `Customer` OneToOne→User, lazily creates the Stripe customer on
  first save (`if not self.stripe_id: …`). **Lazy provider-id creation** is a good idempotent pattern.
- **Checkout = hosted Stripe Checkout Session** (`src/checkouts/views.py`): stash `price_id` in session →
  redirect to Stripe-hosted checkout → `checkout_finalize_view` reads `session_id` + `checkout.metadata` to
  provision access. Browser never handles card data.
- **Source-of-truth doctrine** (`src/subscriptions/timing.md`, `utils.py#refresh_active_users_subscriptions`):
  > "Keep local state a cache; Stripe is authoritative for billing. The webhook is the trigger; a periodic job
  > reconciles drift." **Adopt verbatim conceptually:** the inbound webhook event is recorded (append-only), local
  > projections are a cache, and a periodic reconcile catches missed/late events. This is the most important
  > operational principle in the whole research set.

### 3. Inbox Zero (`e641fcd4-inboxzeromain/inbox-zero-main`) — AI email automation. The exact structural analogue to Eclipse's agent-gate.

- **Rule → Action → ExecutedRule** (`apps/web/prisma/schema.prisma`, `utils/ai/choose-rule/`):
  - A `Rule` carries natural-language `instructions` and a boolean **`automate` (default false)**.
  - **The gate** (`utils/ai/choose-rule/run-rules.ts`): pick best rule via LLM; **if `!rule.automate` → write an
    `ExecutedRule{status: PENDING, reason, automated:false}` and STOP**; else execute actions and record. This is
    structurally identical to Eclipse's prime directive — `automate=false` *is* "agent proposes, human approves."
  - **`ExecutedRule` = append-only audit log** with `status` (PENDING/APPLIED/SKIPPED/REJECTED) + a machine-stored
    **`reason`** (the LLM's justification) + ids. Mirrors Eclipse's `candidates.ndjson` + `statusHistory[]`.
- **Structured, auditable AI decisions** (`utils/ai/choose-rule/ai-choose-rule.ts`): `generateObject` with a Zod
  schema `{ruleId|null, reason}` — **always return a machine-readable decision plus a human-readable reason.**
- **Fail-loud action dispatch** (`utils/ai/choose-rule/execute.ts`): typed `switch(action.type)` with `default:
  throw new Error("Unknown action type")` — unknown actions fail loudly rather than silently no-op. Good discipline
  for Eclipse's candidate-kind / order-transition handlers.

### 4. Lower-relevance repos (read structure, no code adopted now)

- **Neon** (`5565e1fc-neonmain`): serverless Postgres (pooling, branch-per-PR). Only relevant as a **future**
  migration target if/when NDJSON projections outgrow flat files. Not now.
- **Serverless framework** (`0422d9ab`, `55479087`): deploy/event-trigger patterns; irrelevant to a Node-builtins
  core with no cloud-function deploy target.
- **Vercel index** (`519ad8c1`, `7ea06b0f`) + **saasyland** (`ec308135`): marketing/landing layout patterns —
  useful later for the storefront's *marketing* surface, zero commerce-core value now.

---

## Web-research gaps (modern best practices, established Stripe / headless-commerce guidance)

- **Hosted Checkout / Payment Links > custom card form** for a lean core: a Stripe Checkout Session (or Payment
  Link) keeps Eclipse entirely out of PCI scope and off card data. This fits the MCP-artifact model perfectly —
  Node emits the request, the agent creates the link, no card data ever touches the runtime. (Relivator-via-Polar
  and SaaS-Foundations both use hosted checkout; neither handles cards.)
- **Order-of-record lives in the webhook, not the redirect.** The `success_url` is advisory; fulfillment must be
  driven by a verified `checkout.session.completed` / `payment_intent.succeeded`, with **signature verification**
  (`stripe.webhooks.constructEvent` over the *raw* body) and **idempotency** (dedupe by Stripe `event.id`).
- **Local state is a cache; the provider is authoritative; webhook triggers + periodic reconcile** (SaaS
  Foundations `timing.md`). Record each inbound event append-only; a periodic job catches drift/missed events.
- **Test→Live is a deliberate, separate, human action.** Separate key sets (`sk_test`/`sk_live`); test-mode
  products/prices DO NOT transfer to live (recreate them); point a *live* webhook endpoint; flip behind a flag.
  Eclipse already encodes the seam (`payment.live`, `stripe-sync.mjs` "mode:'test' … going live is a separate
  deliberate operator action"). Keep it manual.
- **Headless data models converge on:** Product → Variant (the sellable SKU) → Price (money object: amount_minor +
  currency [+ interval for subscriptions]) → Inventory (per location) → Order → LineItem (**price snapshot at order
  time**) → Payment + Fulfillment as separate child records. Carts are ephemeral; the immutable record is the Order.
  Idempotency keys on every money mutation. Eclipse already does line-item price snapshots and integer money.
- **Merchant-of-Record (Polar/Paddle/Lemon Squeezy)** is a legitimate alternative to raw Stripe for small teams: it
  absorbs global sales-tax/VAT registration + remittance and chargeback compliance, at a higher fee. Worth noting
  as a strategic option for Eclipse's checkout, fulfillable via the same artifact pattern.

---

## Recommended Eclipse data-model evolution

Keep every invariant (default-deny, integer minor units, append-only, MCP-artifact integrations, human gate).
Proposed, ordered by value/effort:

1. **Generic variant `attributes` map.** In `src/model/product.mjs` `createVariant`, replace hard-coded
   `color`/`size` with `attributes: {}` (a `Record<string,string>`, e.g. `{material, carat, length, fragranceSize}`),
   keeping `color`/`size` as derived convenience accessors so nothing downstream breaks. The SKU generator reads the
   attribute map. *Unlocks luxury breadth (jewelry/watches/fragrance/leather) with zero schema churn.* Mirrors the
   flexible variant-options shape that mature headless models use (and that this Relivator build lacked).

2. **Category tree.** Add `src/model/category.mjs` with self-referential `parentId` (nullable, slug unique). Keep
   `collection` as the curated merchandising/drop construct (it already has `dropCode`/`opensAt`/`closesAt`). The
   projection rebuild can compute breadcrumb paths. *Gives "marketplace breadth" a real taxonomy distinct from
   curation.*

3. **Honest compare-at price.** Add optional `compareAtMinor` to variant/product pricing, populated **only when
   genuine** (honors the no-padded-MSRP rule). Integer minor units, never floats (explicitly avoiding Relivator's
   `price*quantity` float cart and SaaS-Foundations' `DecimalField`).

4. **`reason` + `automated` on every transition.** Borrow InboxZero's `ExecutedRule.reason`: standardize
   `{actor, actorKind, reason, automated:false}` on every queue transition (`src/queue/transitions.mjs` /
   candidate records) and order `statusHistory[]` entry (`src/model/order.mjs` already has `statusHistory`, extend
   the entry shape). *Makes the human gate fully auditable and machine-explainable.*

5. **First-class Customer + saved addresses.** Promote `order.customer` into `src/model/customer.mjs` =
   `{id, email, name?, addresses:[{type:shipping|billing, line1,line2,city,state,postalCode,country(ISO-2),
   isDefault}], stripeCustomerId?}` (lazy provider-id creation per SaaS Foundations' `Customer.save`). Snapshot the
   chosen address onto the order (already done in checkout).

6. **`channel` field on orders** (`web`|`pos`|`agent`) so in-person/POS reuses the *same* order model and lifecycle
   with no new core. (See POS design below.)

7. **Tenant scaffolding for "sell the platform" (future, behind a flag).** Add `src/model/tenant.mjs` =
   `{id, slug, plan, members:[{userId, role:owner|admin|staff}]}` + a `requireRole(actor, tenantId, roles)` guard in
   `src/lib/actor.mjs`. Products/orders gain an optional `tenantId`. Model **plans-as-capabilities** as a plain map
   (SaaS Foundations' permission-group idea): `PLANS = { house: {name, priceIdEnv:'STRIPE_PRICE_HOUSE',
   capabilities:['publish','connect_payouts',…], limits:{products, seats}} }` — **names + env var keys only, never
   secret IDs** (matches the repo's "only `.env.example` committed" rule). Do NOT build billing now — just leave the
   seam.

---

## Checkout / POS design (Eclipse-native, MCP-artifact, all money minor units)

1. **Cart (ephemeral, not gated):** line = `{productId, variantId, qty}`. Prices/titles resolved at build time from
   the **published** catalog projection only — `src/orders/checkout.mjs` already enforces `isLive` and rejects
   anything not published+visible+in-stock. Add an anonymous `sessionId`-keyed guest cart (the one genuinely useful
   idea from Relivator's client cart) so checkout works pre-account.
2. **Quote:** `computeTotals` (`src/model/order.mjs`) + pluggable `tax` and `shipping` estimators. v1 = flat/zero or
   table-based, integer minor units; later push to Stripe Tax (or rely on a Merchant-of-Record) via an artifact.
3. **Order draft → `OrderStatus.INTAKE`** (existing), inventory reserved atomically (existing anti-oversell logic).
4. **Payment artifact:** extend `src/orders/stripe-sync.mjs` with `buildCheckoutSessionRequest(order)` /
   `buildPaymentLinkRequest(order)` — `mode:'payment'`, line items from the order, `metadata:{eclipse_order_id}`,
   `automatic_tax`, `shipping_address_collection`, idempotency-keyed, **`mode:'test'`** by default. Node never calls
   Stripe; `payment.live=false` until the deliberate live flip. (Today `src/orders/payments.mjs` builds an
   intent-only mock link — this generalizes it to a real artifact while preserving "no live calls.")
5. **Agent fulfills** via Stripe MCP → records `checkoutSessionId`/`paymentLinkId` back onto the order (extend the
   `recordProductSync`-style result recorder).
6. **Settlement = inbound webhook event recorded append-only to `data/events.ndjson`, deduped by Stripe `event.id`:**
   `checkout.session.completed` → advance order to `PAID` (lifecycle already supports it) + persist the reservation
   decrement; `charge.refunded` → `REFUNDED`. A periodic reconcile job replays/repairs (SaaS Foundations doctrine).
   Fulfillment only ever proceeds from a **verified paid** state.
7. **POS / in-person:** same order model; a POS lane creates an `INTAKE` order with `channel:'pos'` and uses a
   Stripe **Payment Link** / Terminal artifact. No new core — just the `channel` field from model-evolution #6.

**Safety carry-overs (must remain green):** orders never auto-go-live (`payment.live` gate), webhook signature +
idempotency, fulfillment only after verified `paid`, price snapshotted at order time, default-deny projection
untouched, human gate on the queue untouched.

---

## Prioritized "adopt these 8 patterns" list

1. **Webhook-driven order-of-record + signature verify + idempotency + periodic reconcile.** (SaaS Foundations
   `subscriptions/timing.md` + `utils.py`; standard Stripe practice.) Fulfill only on a verified
   `checkout.session.completed`; record events append-only to `data/events.ndjson`, dedupe by `event.id`; a periodic
   job reconciles drift. *Highest impact, lowest risk, fits append-only truth exactly.*
2. **Hosted Checkout Session / Payment Link as MCP artifacts.** (Relivator-via-Polar `api/payments/service.ts`;
   SaaS Foundations `checkouts/views.py`.) Keeps Eclipse out of PCI scope; generalize `src/orders/payments.mjs` +
   `src/orders/stripe-sync.mjs` into checkout/payment-link request builders. Test-mode default; live is a separate
   human action.
3. **`automate=false` gate + `{status, reason, automated}` audit record on every transition.** (InboxZero
   `utils/ai/choose-rule/run-rules.ts` + `ExecutedRule`.) Formalizes Eclipse's prime directive as an auditable,
   machine-explainable record on `transitions.mjs` and order `statusHistory`.
4. **Generic variant `attributes` map.** (Standard headless variant-options shape; the gap this Relivator build
   left open.) Edit `src/model/product.mjs` — unlocks luxury marketplace breadth without schema churn.
5. **URL-driven facet/sort/paginate contract.** (Relivator `src/lib/filters.ts` `productsSearchParamsSchema` +
   `parsePriceRange`/`splitParam`.) Adopt `{page, perPage, sort:"field.dir", categories, priceRange, …}` as the
   storefront projection's query API — clean, ownable, dependency-free to parse.
6. **Self-referential category tree, separate from curated collections.** (Standard taxonomy; absent here, so build
   it.) New `src/model/category.mjs` with `parentId`; keep `collection` for drops/merchandising.
7. **Plans-as-capabilities map + Org→Membership(role)→Session multi-tenant seam, behind a flag.** (SaaS Foundations
   permission-group entitlements `subscriptions/models.py`; Relivator session/account tables `users/tables.ts`.)
   Scaffold `tenant.mjs` + `requireRole` + a `PLANS` map (names + env-var keys only). The seam to *sell* Eclipse; no
   billing built now.
8. **Lazy provider-id creation + idempotent upsert keyed on provider id.** (SaaS Foundations `Customer.save`;
   Relivator `syncSubscription` `onConflictDoUpdate`.) When recording Stripe/Connect results back, create the
   provider id lazily and upsert by it — naturally idempotent, replay-safe, fits append-only + reconcile.

**Explicitly do NOT adopt:** float/decimal money (Relivator cart `price*quantity`, SaaS Foundations `DecimalField`
— Eclipse's integer minor units is strictly better); heavy framework deps (Drizzle/Prisma/Better Auth/Polar SDK/
Next/Django/Zustand — all violate dependency-free); the Serverless framework, Neon, and the Vercel/saasyland infra
& marketing repos (no commerce-core value now — revisit Neon only if NDJSON projections outgrow flat files).

**Strategic note:** Merchant-of-Record (Polar/Paddle), as seen in Relivator, is a viable alternative to raw Stripe —
it offloads global tax + compliance for a higher fee, and is fulfillable through the identical artifact pattern.
Flag it for a checkout build/buy decision; it does not change the data model.
