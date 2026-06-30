# LUMERA — Complete Platform Review Dossier

**Generated:** 2026-06-30 · **Branch:** `claude/status-check-jd5zmw` · **Repo:** `Beexly/Clouds-bruh`
**Companion file:** `LUMERA_FULL_SOURCE.md` (the complete source — 405 files, ~33,000 lines)

---

## 0. How to use this dossier (for the reviewer)

This document is a **full, critical walkthrough of the entire Lumera platform**, written so an external expert (you) can audit it for correctness, security, completeness, and quality without first having to read 33,000 lines cold.

- **This file (`LUMERA_PLATFORM_REVIEW.md`)** is the *map and analysis*: architecture, every subsystem explained in depth, the data/API/event contracts, the security model, the intelligence layer end-to-end, test coverage, verified runtime state, and an explicit list of risks to scrutinize. Each section names exact file paths.
- **`LUMERA_FULL_SOURCE.md`** is the *territory*: every source, config, and doc file, complete, grouped by area (A–I), each with its path and line count. When a section here references a file, the full text is in that appendix.
- If your context window can't hold both, review this dossier first, then pull specific files from the appendix by their `### \`path\`` headers.

**What Lumera is in one line:** an editorial luxury dropship-commerce platform ("The Broadcast") built on Medusa v2 + Next.js, with a first-class intelligence layer — real-time personalization, hybrid recommendations, a learning loop, and a department of autonomous Claude agents — where every money/publish/vendor action is gated behind explicit human approval.

**Honesty notes for the reviewer:**
- The current agent runtime hand-rolls a tool-use loop on the raw `@anthropic-ai/sdk`; the `@anthropic-ai/claude-agent-sdk` dependency is declared but **not yet used** (a planned migration).
- The shipped catalog is **synthetic fixtures** (5–10 placeholder products) for local verification; a real catalog comes from the curation/vendor pipeline.
- Internal package names use the legacy `@alterxiv` scope and some module codenames; the consumer brand is **Lumera**.

---

## 1. Executive Summary

### 1.1 The thesis
Galaxy-Sports-Network-class commerce: if it isn't intelligent, dynamic, personalized, self-improving, and beautiful, it isn't finished. Lumera applies that to drop-culture luxury dropshipping — a storefront that learns each visitor in real time, a recommendation engine that adapts, and autonomous "departments" (agents) that curate, merchandise, forecast, and self-audit, all under hard human-approval gates for anything irreversible.

### 1.2 Stack
- **Commerce core:** Medusa v2 (TypeScript) + PostgreSQL (+ pgvector) + Redis.
- **Storefront:** Next.js 15 (App Router, React 18, Tailwind) — "The Broadcast."
- **Intelligence:** a custom tool-use loop on the raw Anthropic SDK (`apps/intelligence`).
- **Monorepo:** pnpm workspaces + Turborepo; shared types/contracts in `packages/shared`.

### 1.3 Size (non-test source)
| Area | Lines | What |
|---|---|---|
| `packages/shared/src` | ~1,406 | Domain types + the SIGNAL event taxonomy (the contract between apps) |
| `apps/backend/src` | ~7,586 | Medusa v2 + 8 custom modules, custom API, workflows, jobs, subscribers |
| `apps/storefront/src` | ~7,176 | Next.js storefront — ~22 routes, components, libs, contexts |
| `apps/intelligence/src` | ~3,891 | Orchestrator + ~14 agents + tools + learning loop + introspection |
| `scripts` | ~2,223 | Bootstrap, seed, commerce setup, launch gates, vendor ops |
| **Total** | **~29,000** | + ~3,700 lines of docs, + tests (~3,900 lines, 397 tests) |

### 1.4 Current verified state (this session)
`pnpm build` 4/4 · `pnpm lint` 0 type errors · `pnpm test` **397 passing**. The platform was additionally stood up against **real Postgres+pgvector+Redis+Medusa+Next.js** and driven through a **complete purchase** (cart → checkout → order → purchase signal → staged vendor order). See §11.

---

## 2. Architecture at a Glance

_Source of truth: `docs/ARCHITECTURE.md` (full text in the appendix). Summary:_

### 2.1 System map
```
The Broadcast (Next.js)  ──emits SIGNAL──►  Backend (Medusa v2)
   │  personalized UI                          │  ├─ signal module      (event ingestion)
   │  recs, drops, Product Truth               │  ├─ personalization    (MIND: visitor affinity)
   │  cart / checkout                          │  ├─ recommendation     (ORACLE: recs + bandit + pgvector)
   ▼                                           │  ├─ drops              (scarcity / drop mechanics)
Customer                                       │  ├─ monetization       (Lumens credits + membership)
                                               │  ├─ lumera*            (dropship curation / fulfillment / PayPal)
                                               │  └─ custom API + webhooks (Stripe, vendors)
                                               ▼
                              Intelligence (The Constellation)
                              orchestrator tool-use loop + ~14 agents
                              + Learning Loop + INTROSPECTION self-audit
                              (all spend/publish/delete gated by human approval)
```

### 2.2 The intelligence layer (the differentiator)
- **SIGNAL** — every meaningful storefront interaction emits a typed behavioral event (`packages/shared/src/events.ts`) → `POST /store/signal`.
- **MIND** (`personalization`) — folds each event into a visitor's affinity vectors (chapter / category / price-band / aesthetic) + intent, O(1) per event, with decay.
- **ORACLE** (`recommendation`) — strategies (`for_you`, `because_you_viewed`, `complete_the_set`, `trending_in_chapter`, `graph_rec`) over pgvector cosine similarity + a Thompson-sampling bandit; degrades gracefully to trending/random.
- **CONGREGATION** (`apps/intelligence`) — autonomous agent departments, each least-privilege, self-auditing, and required to escalate before any irreversible action.
- **INTROSPECTION** — continuous self-audit + a learning loop that tunes reward weights.

### 2.3 Build order & non-negotiables (from `docs/ARCHITECTURE.md` §7–8)
Data models first (hard to reverse) → SIGNAL/MIND → ORACLE → storefront → agents → INTROSPECTION → learning loop → tests. **Non-negotiables:** verified-not-assumed (write+run the test); **no autonomous money movement, publishing, or destructive action without explicit human approval** (wired as gates); brand integrity; reuse Anthropic patterns over reinventing agent loops.

---

## 3. Repository Map

_Full file tree (source/docs/config; excludes node_modules, build outputs, generated snapshots, lockfile, binaries):_

```
REPO: lumera (monorepo) — branch claude/status-check-jd5zmw

  apps/backend/medusa-config.ts
  apps/backend/package.json
  apps/backend/src/api/admin/lumera/candidates/[id]/approve/route.ts
  apps/backend/src/api/admin/lumera/candidates/[id]/design-variant/route.ts
  apps/backend/src/api/admin/lumera/candidates/[id]/reject/route.ts
  apps/backend/src/api/admin/lumera/candidates/[id]/request-sample/route.ts
  apps/backend/src/api/admin/lumera/curation-board/route.ts
  apps/backend/src/api/admin/lumera/curation/run/route.ts
  apps/backend/src/api/admin/lumera/fulfillment/route.ts
  apps/backend/src/api/admin/lumera/vendor-connections/[id]/healthcheck/route.ts
  apps/backend/src/api/admin/lumera/vendor-connections/route.ts
  apps/backend/src/api/admin/lumera/vendor-orders/[id]/retry/route.ts
  apps/backend/src/api/hooks/stripe/route.ts
  apps/backend/src/api/hooks/vendor/cj/route.ts
  apps/backend/src/api/hooks/vendor/printful/route.ts
  apps/backend/src/api/hooks/vendor/printify/route.ts
  apps/backend/src/api/middlewares.ts
  apps/backend/src/api/store/analyst/bi.test.ts
  apps/backend/src/api/store/analyst/bi.ts
  apps/backend/src/api/store/analyst/route.ts
  apps/backend/src/api/store/broadcast/route.ts
  apps/backend/src/api/store/cockpit/approvals/route.ts
  apps/backend/src/api/store/cockpit/route.ts
  apps/backend/src/api/store/drops/route.ts
  apps/backend/src/api/store/monetization/credits/route.ts
  apps/backend/src/api/store/monetization/entitlements/route.ts
  apps/backend/src/api/store/monetization/gift-cards/route.ts
  apps/backend/src/api/store/monetization/subscribe/route.ts
  apps/backend/src/api/store/monetization/tiers/route.ts
  apps/backend/src/api/store/monetization/wallet/route.ts
  apps/backend/src/api/store/newsletter/route.ts
  apps/backend/src/api/store/order-lookup/route.ts
  apps/backend/src/api/store/preferences/route.ts
  apps/backend/src/api/store/pricing/route.ts
  apps/backend/src/api/store/product-truth/[handle]/route.ts
  apps/backend/src/api/store/recommendations/attribute/route.ts
  apps/backend/src/api/store/recommendations/route.ts
  apps/backend/src/api/store/reviews/route.ts
  apps/backend/src/api/store/rewards/route.ts
  apps/backend/src/api/store/rma/route.ts
  apps/backend/src/api/store/search/route.ts
  apps/backend/src/api/store/search/search.test.ts
  apps/backend/src/api/store/shepherd/route.ts
  apps/backend/src/api/store/shipping-estimate/route.ts
  apps/backend/src/api/store/signal/identify/route.ts
  apps/backend/src/api/store/signal/route.ts
  apps/backend/src/api/store/signal/signal.test.ts
  apps/backend/src/api/unsubscribe/route.ts
  apps/backend/src/jobs/abandoned-cart.ts
  apps/backend/src/jobs/daily-curation.ts
  apps/backend/src/jobs/drop-grader.ts
  apps/backend/src/jobs/review-request.ts
  apps/backend/src/lib/abandoned-cart.test.ts
  apps/backend/src/lib/abandoned-cart.ts
  apps/backend/src/lib/approvals.test.ts
  apps/backend/src/lib/approvals.ts
  apps/backend/src/lib/channel-sync/clients.test.ts
  apps/backend/src/lib/channel-sync/clients.ts
  apps/backend/src/lib/channel-sync/index.ts
  apps/backend/src/lib/channel-sync/sync.ts
  apps/backend/src/lib/drop-grader.insert.test.ts
  apps/backend/src/lib/drop-grader.test.ts
  apps/backend/src/lib/drop-grader.ts
  apps/backend/src/lib/email-compliance.test.ts
  apps/backend/src/lib/email-compliance.ts
  apps/backend/src/lib/email.test.ts
  apps/backend/src/lib/email.ts
  apps/backend/src/lib/integrations.test.ts
  apps/backend/src/lib/integrations.ts
  apps/backend/src/lib/llm.test.ts
  apps/backend/src/lib/llm.ts
  apps/backend/src/lib/lumera-auth.test.ts
  apps/backend/src/lib/lumera-auth.ts
  apps/backend/src/lib/lumera-db.test.ts
  apps/backend/src/lib/lumera-db.ts
  apps/backend/src/lib/lumera-order-routing.test.ts
  apps/backend/src/lib/lumera-order-routing.ts
  apps/backend/src/lib/lumera-publish.test.ts
  apps/backend/src/lib/lumera-publish.ts
  apps/backend/src/lib/lumera-webhook.test.ts
  apps/backend/src/lib/newsletter.test.ts
  apps/backend/src/lib/newsletter.ts
  apps/backend/src/lib/observability.test.ts
  apps/backend/src/lib/observability.ts
  apps/backend/src/lib/order-lookup.test.ts
  apps/backend/src/lib/order-lookup.ts
  apps/backend/src/lib/review-request.test.ts
  apps/backend/src/lib/review-request.ts
  apps/backend/src/lib/reviews-db.test.ts
  apps/backend/src/lib/reviews-db.ts
  apps/backend/src/lib/security.test.ts
  apps/backend/src/lib/security.ts
  apps/backend/src/lib/shipping-rates.test.ts
  apps/backend/src/lib/shipping-rates.ts
  apps/backend/src/modules/drops/index.ts
  apps/backend/src/modules/drops/migrations/Migration20260530203851.ts
  apps/backend/src/modules/drops/models/drop.ts
  apps/backend/src/modules/drops/service.test.ts
  apps/backend/src/modules/drops/service.ts
  apps/backend/src/modules/lumera-fulfillment/index.ts
  apps/backend/src/modules/lumera-fulfillment/service.test.ts
  apps/backend/src/modules/lumera-fulfillment/service.ts
  apps/backend/src/modules/lumera-payment-paypal/index.ts
  apps/backend/src/modules/lumera-payment-paypal/money.ts
  apps/backend/src/modules/lumera-payment-paypal/service.test.ts
  apps/backend/src/modules/lumera-payment-paypal/service.ts
  apps/backend/src/modules/lumera/index.ts
  apps/backend/src/modules/lumera/migrations/Migration20260607142000.ts
  apps/backend/src/modules/lumera/models/approval-request.ts
  apps/backend/src/modules/lumera/models/product-candidate.ts
  apps/backend/src/modules/lumera/models/product-design.ts
  apps/backend/src/modules/lumera/models/return-case.ts
  apps/backend/src/modules/lumera/models/vendor-connection.ts
  apps/backend/src/modules/lumera/models/vendor-order.ts
  apps/backend/src/modules/lumera/models/webhook-event.ts
  apps/backend/src/modules/lumera/service.ts
  apps/backend/src/modules/monetization/index.ts
  apps/backend/src/modules/monetization/loyalty.ts
  apps/backend/src/modules/monetization/migrations/Migration20260531162748.ts
  apps/backend/src/modules/monetization/models/credit-transaction.ts
  apps/backend/src/modules/monetization/models/credit-wallet.ts
  apps/backend/src/modules/monetization/models/gift-card.ts
  apps/backend/src/modules/monetization/models/membership-tier.ts
  apps/backend/src/modules/monetization/models/membership.ts
  apps/backend/src/modules/monetization/monetization.test.ts
  apps/backend/src/modules/monetization/service.ts
  apps/backend/src/modules/personalization/index.ts
  apps/backend/src/modules/personalization/migrations/Migration20260530203843.ts
  apps/backend/src/modules/personalization/migrations/Migration20260531230740.ts
  apps/backend/src/modules/personalization/models/visitor-profile.ts
  apps/backend/src/modules/personalization/service.ts
  apps/backend/src/modules/recommendation/index.ts
  apps/backend/src/modules/recommendation/migrations/Migration20260530203847.ts
  apps/backend/src/modules/recommendation/migrations/Migration20260531163643.ts
  apps/backend/src/modules/recommendation/migrations/Migration20260630120000.ts
  apps/backend/src/modules/recommendation/models/recommendation.ts
  apps/backend/src/modules/recommendation/service.ts
  apps/backend/src/modules/recommendation/strategies/graph-rec.ts
  apps/backend/src/modules/signal/index.ts
  apps/backend/src/modules/signal/migrations/Migration20260530203827.ts
  apps/backend/src/modules/signal/models/event.ts
  apps/backend/src/modules/signal/service.ts
  apps/backend/src/subscribers/order-confirmation-email.ts
  apps/backend/src/subscribers/order-placed.ts
  apps/backend/src/subscribers/shipment-created.ts
  apps/backend/src/workflows/place-drop-order.ts
  apps/backend/tsconfig.json
  apps/intelligence/package.json
  apps/intelligence/src/agents/SKILLS.md
  apps/intelligence/src/agents/_contract.md
  apps/intelligence/src/agents/analyst.ts
  apps/intelligence/src/agents/artisan.ts
  apps/intelligence/src/agents/constellation.test.ts
  apps/intelligence/src/agents/curator.ts
  apps/intelligence/src/agents/forecaster.ts
  apps/intelligence/src/agents/herald.ts
  apps/intelligence/src/agents/index.ts
  apps/intelligence/src/agents/loyalist.ts
  apps/intelligence/src/agents/oracle-keeper.ts
  apps/intelligence/src/agents/quartermaster.ts
  apps/intelligence/src/agents/rainmaker.ts
  apps/intelligence/src/agents/refiner.ts
  apps/intelligence/src/agents/scribe.ts
  apps/intelligence/src/agents/shepherd.ts
  apps/intelligence/src/agents/skills.test.ts
  apps/intelligence/src/agents/sourcer.ts
  apps/intelligence/src/agents/treasurer.ts
  apps/intelligence/src/agents/types.ts
  apps/intelligence/src/agents/warden.ts
  apps/intelligence/src/introspection.test.ts
  apps/intelligence/src/introspection.ts
  apps/intelligence/src/learning/loop.test.ts
  apps/intelligence/src/learning/loop.ts
  apps/intelligence/src/mcp.config.ts
  apps/intelligence/src/memory/ledger.ts
  apps/intelligence/src/operator/index.ts
  apps/intelligence/src/operator/workflow.test.ts
  apps/intelligence/src/operator/workflow.ts
  apps/intelligence/src/orchestrator/approval.test.ts
  apps/intelligence/src/orchestrator/flow.ts
  apps/intelligence/src/orchestrator/index.ts
  apps/intelligence/src/orchestrator/run-agent.ts
  apps/intelligence/src/tools/apify.ts
  apps/intelligence/src/tools/connectors.test.ts
  apps/intelligence/src/tools/connectors.ts
  apps/intelligence/src/tools/db-gpt.ts
  apps/intelligence/src/tools/drops.ts
  apps/intelligence/src/tools/finance.ts
  apps/intelligence/src/tools/higgsfield.ts
  apps/intelligence/src/tools/index.ts
  apps/intelligence/src/tools/medusa-admin.ts
  apps/intelligence/src/tools/radar.ts
  apps/intelligence/src/tools/registry.test.ts
  apps/intelligence/src/tools/scraper.ts
  apps/intelligence/src/tools/seo.ts
  apps/intelligence/src/tools/stubs.test.ts
  apps/intelligence/src/tools/stubs.ts
  apps/intelligence/src/tools/vendor-select.test.ts
  apps/intelligence/src/tools/vendor-select.ts
  apps/intelligence/src/tools/video.ts
  apps/intelligence/src/tools/voc.ts
  apps/intelligence/src/vendors/clients.test.ts
  apps/intelligence/src/vendors/clients.ts
  apps/intelligence/src/vendors/index.ts
  apps/intelligence/tsconfig.json
  apps/storefront/next-env.d.ts
  apps/storefront/next.config.ts
  apps/storefront/package.json
  apps/storefront/src/app/(auth)/login/page.tsx
  apps/storefront/src/app/(auth)/register/page.tsx
  apps/storefront/src/app/account/orders/[id]/page.tsx
  apps/storefront/src/app/account/orders/page.tsx
  apps/storefront/src/app/account/page.tsx
  apps/storefront/src/app/account/wishlist/page.tsx
  apps/storefront/src/app/api/session/route.ts
  apps/storefront/src/app/cart/page.tsx
  apps/storefront/src/app/chapter/[chapter]/page.tsx
  apps/storefront/src/app/checkout/page.tsx
  apps/storefront/src/app/cockpit/actions.ts
  apps/storefront/src/app/cockpit/page.tsx
  apps/storefront/src/app/drop/[id]/page.tsx
  apps/storefront/src/app/drops/page.tsx
  apps/storefront/src/app/error.tsx
  apps/storefront/src/app/faq/page.tsx
  apps/storefront/src/app/gift-cards/page.tsx
  apps/storefront/src/app/global-error.tsx
  apps/storefront/src/app/globals.css
  apps/storefront/src/app/layout.tsx
  apps/storefront/src/app/legal/privacy/page.tsx
  apps/storefront/src/app/legal/returns/page.tsx
  apps/storefront/src/app/legal/terms/page.tsx
  apps/storefront/src/app/loading.tsx
  apps/storefront/src/app/manifest.ts
  apps/storefront/src/app/not-found.tsx
  apps/storefront/src/app/opengraph-image.tsx
  apps/storefront/src/app/p/[handle]/page.tsx
  apps/storefront/src/app/page.tsx
  apps/storefront/src/app/returns/page.tsx
  apps/storefront/src/app/robots.ts
  apps/storefront/src/app/search/page.tsx
  apps/storefront/src/app/sitemap.ts
  apps/storefront/src/app/track/page.tsx
  apps/storefront/src/app/twitter-image.tsx
  apps/storefront/src/components/AccountHub.tsx
  apps/storefront/src/components/AddToCartButton.tsx
  apps/storefront/src/components/Analytics.tsx
  apps/storefront/src/components/AuthForm.tsx
  apps/storefront/src/components/CommandPalette.tsx
  apps/storefront/src/components/ConsentBanner.tsx
  apps/storefront/src/components/Countdown.tsx
  apps/storefront/src/components/DropBoard.tsx
  apps/storefront/src/components/Footer.tsx
  apps/storefront/src/components/GiftCards.tsx
  apps/storefront/src/components/Hero.tsx
  apps/storefront/src/components/LegalDoc.tsx
  apps/storefront/src/components/NewsletterSignup.tsx
  apps/storefront/src/components/OrderDetail.tsx
  apps/storefront/src/components/OrdersList.tsx
  apps/storefront/src/components/PageSignal.tsx
  apps/storefront/src/components/PageTransition.tsx
  apps/storefront/src/components/ProductCard.tsx
  apps/storefront/src/components/ProductImage.tsx
  apps/storefront/src/components/ProductRail.tsx
  apps/storefront/src/components/Reveal.tsx
  apps/storefront/src/components/ReviewForm.tsx
  apps/storefront/src/components/RewardsPanel.tsx
  apps/storefront/src/components/ServiceWorker.tsx
  apps/storefront/src/components/Shepherd.tsx
  apps/storefront/src/components/SiteHeader.tsx
  apps/storefront/src/components/Skeletons.tsx
  apps/storefront/src/components/TrackForm.tsx
  apps/storefront/src/components/TuneBroadcast.tsx
  apps/storefront/src/components/WishlistButton.tsx
  apps/storefront/src/components/WishlistView.tsx
  apps/storefront/src/components/payment/PayPalButtons.tsx
  apps/storefront/src/components/payment/StripeCardForm.tsx
  apps/storefront/src/context/cart.tsx
  apps/storefront/src/context/customer.tsx
  apps/storefront/src/context/wishlist.tsx
  apps/storefront/src/lib/api.ts
  apps/storefront/src/lib/brand.test.ts
  apps/storefront/src/lib/brand.ts
  apps/storefront/src/lib/catalog.test.ts
  apps/storefront/src/lib/catalog.ts
  apps/storefront/src/lib/customer.test.ts
  apps/storefront/src/lib/customer.ts
  apps/storefront/src/lib/gift-cards.test.ts
  apps/storefront/src/lib/gift-cards.ts
  apps/storefront/src/lib/jsonld.test.ts
  apps/storefront/src/lib/jsonld.ts
  apps/storefront/src/lib/og.test.ts
  apps/storefront/src/lib/og.tsx
  apps/storefront/src/lib/recommendations.ts
  apps/storefront/src/lib/shipping-ladder.test.ts
  apps/storefront/src/lib/shipping-ladder.ts
  apps/storefront/src/lib/signal.ts
  apps/storefront/src/lib/site.test.ts
  apps/storefront/src/lib/site.ts
  apps/storefront/src/lib/stripe.test.ts
  apps/storefront/src/lib/useBehavior.ts
  apps/storefront/src/lib/wishlist-sync.ts
  apps/storefront/src/lib/wishlist.test.ts
  apps/storefront/src/lib/wishlist.ts
  apps/storefront/src/middleware.ts
  apps/storefront/tailwind.config.ts
  apps/storefront/tsconfig.json
  apps/storefront/vitest.config.ts
  docs/ARCHITECTURE.md
  docs/BRAND_GUIDELINES.md
  docs/COST.md
  docs/DEPLOYMENT.md
  docs/DR_RUNBOOK.md
  docs/GROWTH_PLAYBOOK.md
  docs/INCIDENT_RUNBOOK.md
  docs/INTEGRATIONS.md
  docs/LUMERA_DROPSHIP_RUNBOOK.md
  docs/LUMERA_DROPSHIP_SESSION_HANDOFF.md
  docs/LUMERA_LAUNCH_GATE_CHECKLIST.md
  docs/LUMERA_OWNER_ACTIONS.md
  docs/LUMERA_SOURCING_STACK.md
  docs/LUMERA_VENDOR_CREDENTIALS_MATRIX.md
  docs/RD_TRIAGE.md
  docs/SELF_HOSTED_STACK.md
  docs/STRATEGY.md
  docs/STRIPE_E2E_TEST_PLAN.md
  packages/data/README.md
  packages/shared/package.json
  packages/shared/src/channels.ts
  packages/shared/src/constellation.ts
  packages/shared/src/curation-fixtures.ts
  packages/shared/src/curation.test.ts
  packages/shared/src/curation.ts
  packages/shared/src/drop-grading.test.ts
  packages/shared/src/drop-grading.ts
  packages/shared/src/events.test.ts
  packages/shared/src/events.ts
  packages/shared/src/index.ts
  packages/shared/src/sourcing.test.ts
  packages/shared/src/sourcing.ts
  packages/shared/src/types.ts
  packages/shared/src/vendor-routing.test.ts
  packages/shared/src/vendor-routing.ts
  packages/shared/tsconfig.json
  scripts/api-regression.ts
  scripts/backup.ts
  scripts/bootstrap.ts
  scripts/curate.ts
  scripts/curation-e2e.ts
  scripts/ensure-publishable-key.ts
  scripts/fulfillment-drill.ts
  scripts/fulfillment-sandbox.ts
  scripts/launch-preflight.ts
  scripts/launch-proof.ts
  scripts/owner-actions.ts
  scripts/paypal-capture-proof.ts
  scripts/preflight.ts
  scripts/publish-approved.ts
  scripts/radar.ts
  scripts/seed-monetization.ts
  scripts/seed.ts
  scripts/setup-commerce.ts
  scripts/setup-embeddings.ts
  scripts/setup-inventory.ts
  scripts/setup-prices.ts
  scripts/vendor-order-submit.ts
  scripts/vendor-preflight.ts
  scripts/vendor-test.ts
  scripts/verify-api.sh
  scripts/verify-rewards.ts
```



---

## 4. Shared Contracts — Domain Types & the SIGNAL Event Taxonomy (`packages/shared`)

`packages/shared` is the **single contract surface** every Lumera app compiles against. It is published as the workspace package **`@alterxiv/shared`** (note: the npm name is `@alterxiv/...`, not `@lumera/...` — a naming drift worth flagging since the brand is "Lumera" everywhere else). It ships as CommonJS (`"module": "commonjs"`, `target: ES2021`) with `main: dist/index.js` / `types: dist/index.d.ts`, built by plain `tsc` under `strict: true`. Consumers import from the package root only; everything is re-exported through `src/index.ts`:

```ts
export * from './events';
export * from './types';
export * from './curation';
export * from './curation-fixtures';
export * from './sourcing';
export * from './vendor-routing';
export * from './channels';
export * from './constellation';
export * from './drop-grading';
```

**Consumer footprint (verified):** 56 files reference `@alterxiv/shared`. Backend Medusa modules (`signal`, `personalization`, `recommendation`), backend libs (`lumera-db`, `lumera-publish`, `lumera-order-routing`, `channel-sync/*`, `drop-grader*`), backend API routes (`store/signal`) and jobs; the storefront (`ProductCard`, `DropBoard`, `PageSignal`, `signal.ts`, PDP `p/[handle]/page.tsx`, `cockpit/page.tsx`); the intelligence runtime (`orchestrator`, `learning/loop`, `memory/ledger`, `operator`, `introspection`, `vendors/*`, `tools/*`, `agents/constellation.test`); and root `scripts/seed.ts` + `scripts/radar.ts`. Because almost everything imports `type`-only, the package is largely a **compile-time contract**; the runtime-bearing pieces are the pure functions (`priceBand`, `scoreCandidate`, `gradeDrop`, `rankVendorOptions`, etc.) and the network helpers in `sourcing.ts`.

A structural note for the reviewer: the **dist/ directory is checked into the repo** (28 compiled `.js`/`.d.ts` files including `*.test.js`). Because `package.json` points `main`/`types` at `dist/`, stale `dist` artifacts can silently diverge from `src` if anyone forgets to rebuild — there is no `prepublish`/`prebuild` guard and tests are emitted into `dist` too (test files are not excluded from the tsconfig, only `node_modules`/`dist`).

---

### 4.1 `src/events.ts` — the SIGNAL taxonomy (the emit/consume contract)

This is the most load-bearing file: it defines the behavioral event vocabulary that **The Broadcast emits** and **the intelligence layer (MIND/ORACLE/Learning Loop) consumes**.

**`CHAPTERS` / `Chapter`** — the five-chapter editorial taxonomy, a `const` tuple narrowed to a union:
```ts
export const CHAPTERS = ['stillness', 'armor', 'signal', 'altar', 'relentless'] as const;
export type Chapter = (typeof CHAPTERS)[number];
```
`Chapter` is imported by `types.ts` (`Product.chapter`, `Drop.chapter`), `curation.ts` (`ProductCandidate.chapter`), and `scripts/seed.ts`. `events.test.ts` pins the cardinality (`toHaveLength(5)`) and the presence of `armor`/`stillness`, so adding/removing a chapter is a breaking change caught by tests.

**`EVENT_TYPES` / `EventType`** — 17 event names as a `const` tuple → union. Inline comments document the `value` semantics per type (`dwell` = ms, `scroll_depth` = 0..1, `search` = query, `checkout_step` = step name, `purchase` = order total). This tuple is **the runtime allowlist**: the backend route `apps/backend/src/api/store/signal/route.ts` builds `const EVENT_TYPE_SET = new Set(EVENT_TYPES)` and rejects any inbound event whose `type` is not a member (`'invalid or unknown event type'` → HTTP 400). So `EVENT_TYPES` is not merely a type — it is the security boundary for an **unauthenticated** ingest endpoint.

**`EventContext`** — the side-channel that feeds affinity:
```ts
export interface EventContext {
  chapter?: Chapter;
  category?: string;       // feeds category affinity
  price_band?: PriceBand;  // feeds price-sensitivity affinity
  aesthetic?: string;      // reserved for a future taxonomy
  channel?: 'web' | 'mobile' | 'app';
  device?: 'desktop' | 'mobile' | 'tablet';
  referrer?: string;
  experiment?: string;
}
```
The personalization service (`apps/backend/src/modules/personalization/service.ts`) reads exactly `ctx.chapter`, `ctx.category`, `ctx.price_band`, `ctx.aesthetic` and increments a per-key affinity map for each — so these four optional fields are the literal inputs to the MIND affinity vectors. `aesthetic` is wired end-to-end (storefront → context → affinity map) but the storefront never populates it ("reserved for a future taxonomy"), so the `aesthetic` affinity map is dead weight today — a documented-but-unused dimension. **Smell:** the route validator copies context keys verbatim (capped at 16 keys / 256 chars each) without validating that `chapter`/`price_band` are *declared* members; a malformed event with `context.chapter = "garbage"` will still create an affinity bucket keyed `"garbage"`. The type says `Chapter`, but nothing enforces it at the trust boundary.

**`PRICE_BANDS` / `PriceBand` / `priceBand()`** — coarse price tiers, classified by the *emitter* so personalization stays O(1) with no DB lookup:
```ts
export const PRICE_BANDS = ['entry', 'core', 'premium', 'luxury'] as const;
export function priceBand(finalPrice: number): PriceBand {
  if (!Number.isFinite(finalPrice) || finalPrice < 50) return 'entry';
  if (finalPrice < 150) return 'core';
  if (finalPrice < 400) return 'premium';
  return 'luxury';
}
```
Boundaries are `[<50] entry`, `[50,150) core`, `[150,400) premium`, `[≥400] luxury`. The NaN/negative guard returns `entry` (safe default). `events.test.ts` exhaustively pins every boundary and the non-finite case. Consumed by the storefront `ProductCard` and PDP page to tag events. **Edge case to flag:** the input is documented as "major currency units (e.g. dollars)" but `Money` stores `initial/final` as bare `number` with a separate `currency` field — there is no currency normalization, so a price in a non-USD currency (e.g. JPY where 400 ≠ "luxury") is mis-banded. The bands are hard-coded USD-shaped thresholds.

**`SignalEvent`** — the wire/storage shape: `id`, `visitor_id` ("anonymous-first; merges to customer on identify"), `session_id`, `type: EventType`, optional `entity_id`, `value?: string | number`, `context: EventContext`, `ts` (ISO string). This is the row the SIGNAL module persists and what `mind.observe()` consumes.

**`REWARD_WEIGHTS`** — the reward function shared by ORACLE's bandit and the Learning Loop:
```ts
export const REWARD_WEIGHTS: Partial<Record<EventType, number>> = {
  recommendation_click: 1, product_view: 1, add_to_cart: 5, wishlist_add: 3, purchase: 20,
};
```
Only 5 of 17 event types carry weight; the rest are `undefined` (consumers default to `1`). `events.test.ts` asserts the *invariants* — `purchase` is the max, `add_to_cart > product_view`, all weights positive — so the relative ordering is contractually protected even though absolute values are "tune over time." Three independent consumers depend on this single table: (1) `personalization/service.ts` uses it both as the affinity weight (`REWARD_WEIGHTS[type] ?? 1) * 0.1`) and as the high-intent `intentDelta` for segment computation; (2) `apps/intelligence/src/learning/loop.ts` imports it as the reward signal; (3) it underpins the ORACLE bandit. **This is the right design** — one reward table, no drift — but note the weights are *also* reused as raw segment-threshold inputs (`intentScore >= 20` ≈ one purchase), coupling reward tuning to segmentation in a non-obvious way.

---

### 4.2 `src/types.ts` — the core domain model (Medusa-backed)

Header comment: *"Domain types — realized as Medusa module models. Build these FIRST (hard to reverse)."* Imports only `Chapter` from `./events`.

- **`Money`** — `{ initial: number; final: number; currency: string }`. Two-price model (list vs. effective). No minor-units convention stated (contrast with curation's `_cents` fields — the codebase mixes "dollars-as-number" here and "cents-as-int" in curation/channels, a consistency hazard).
- **`Variant`** — `id, sku, color?, size?, inventory, supplier_sku?, supplier_price?`. Carries supplier passthrough fields for dropship.
- **`Product`** — the catalog schema, explicitly "best of marketplace datasets + Lumera curation/drop fields." Notable nested groups: identity (`sku/gtin/upc/model_number/brand`), `chapter: Chapter`, `scripture_ref?` (editorial), `price: Money`, `variants[]`, `media` (`main_image/image_urls/image_count/video?`), `social` (`rating/reviews_count/badge`), `merch` (`related_product_ids/bs_rank/units_total/units_remaining`), `supplier` (`id/supplier_sku/supplier_price/lead_time_days`), and an **`ai` block** that encodes the self-audit state machine:
  ```ts
  ai: {
    embedding?: number[];
    image_audit_status: 'pending' | 'pass' | 'off_brand';
    copy_audit_status: 'pending' | 'pass' | 'weak';
    trained_algorithmic_media: boolean; // IPTC label for AI-generated imagery
  }
  ```
  The `image_audit_status`/`copy_audit_status` enums are the gate states the Artisan/Scribe agents drive; `trained_algorithmic_media` is the IPTC provenance flag for AI imagery (a compliance-aware touch). `embedding` lives on the product for vector rec — but it is also duplicated on `VisitorProfile.embedding`, with no shared dimensionality type, so the two embedding spaces are nominally unrelated.
- **`Drop`** — the unit of "The Broadcast": `status: 'scheduled' | 'live' | 'sold_out' | 'archived'`, `starts_at/ends_at` (ISO strings), `units_total/units_remaining`, `product_ids[]`. Consumed by storefront `DropBoard`. Note `Drop` carries inventory counters that the `drop-grading.ts` LATR logic re-derives from `units_total/units_remaining` — but `gradeDrop` takes a *separate* `DropGradeInput`, not `Drop`, so the two are not type-linked (a caller must map fields manually; see 4.9).
- **`Segment`** — `'new_seeker' | 'armor_devotee' | 'high_intent' | 'lapsed' | 'patron'`. The personalization service's `segmentFor()` only ever returns `high_intent | armor_devotee | patron | new_seeker` — **`lapsed` is declared in the contract but never produced** by MIND (presumably the Loyalist agent sets it). A reviewer should confirm something actually writes `lapsed`, else it's a dangling state.
- **`VisitorProfile`** — `visitor_id`, optional `customer_id`, `segment`, optional `embedding`, and the four-axis `affinity` block (`chapter/category/price_band/aesthetic`, each `Record<string, number>`), `last_seen`, `ltv_estimate?`. This mirrors the personalization model. **Mismatch to flag:** the stored shape in `personalization/service.ts` adds a private `_intent: number` field to affinity (used for segmentation) that is **not** in this interface — the runtime model is a superset of the published contract.
- **`RecStrategy`** — `'for_you' | 'because_you_viewed' | 'complete_the_set' | 'trending_in_chapter' | 'graph_rec'`. Consumed by `recommendation/service.ts`. **`Recommendation`** — the served-rec record with `clicked`/`converted` booleans (the labels the Learning Loop trains on) and a `score`.
- **`PendingAction`** — `{ tool: string; input: unknown }`. The parked, *never-executed* gated tool call awaiting founder approval — the literal payload of the approval gate.
- **`AgentRun`** — the full audit record for every autonomous action: `agent`, `trigger: 'cron'|'event'|'manual'|'approval'`, `input/output: unknown`, `tools_used[]`, `decisions[]`, `outcome?`, `status: 'running'|'success'|'error'|'awaiting_approval'`, `escalated: boolean`, `pending_actions?: PendingAction[]`, timestamps. This is the central accountability object — consumed by `memory/ledger.ts`, `operator/*`, `orchestrator/run-agent.ts`. The presence of `awaiting_approval` + `pending_actions` is how the **no-autonomous-action guardrail** is represented in data. `input`/`output` are `unknown` (untyped) — auditable in shape but not in content.
- **`Audit`** — a self-audit finding: `type` (catalog/brand/conversion/seo/margin/integrity/voc), `severity` (info→critical), `finding`, `recommendation`, and notably **`falsifiable_check: string`** ("how would we know this failed?") plus `auto_corrected: boolean`. The falsifiability field is a strong design choice (INTROSPECTION can't file unverifiable findings). Consumed by `introspection.ts` and `memory/ledger.ts`.
- **`Experiment`** — A/B record (`hypothesis`, `variants[]`, `metric`, `status`, `winner?`, `lift?`).

---

### 4.3 `src/curation.ts` — the dropship sourcing/compliance/scoring contract

The largest behavioral module. Defines the vendor connector interface, the candidate lifecycle, and the **pure scoring + compliance engine** that gates what can be published.

**Vendor identity:** `VendorId = printify | printful | cj | spocket | syncee | modalyst | dropified | manual | radar`. `VendorMode = live | sandbox | fixture | missing_credentials | blocked`. **`VendorConnection`** is the health snapshot (`connected`, `can_publish`, `can_submit_orders`, `missing_env[]`, `message`) — the gating booleans the cockpit and intelligence layer read to decide whether live actions are even possible. Consumed by `vendors/*` and `introspection.ts`.

**`VendorConnector`** — the full async port every supplier client must implement: `healthCheck`, `searchProducts`, `getProductDetails`, `getVariantInventory`, `quoteShipping`, `createDraftOrder`, `submitOrder`, `cancelOrder`, `getTracking`, `handleWebhook`. Every method returns a `source: VendorMode` so callers always know whether a result is `live` vs `fixture`/`sandbox` — i.e. honesty is encoded in the return type. `createDraftOrder`/`submitOrder` are deliberately **split** so a draft can be created (safe) and submission gated behind approval.

**Candidate lifecycle:** `CandidateStatus` is a 15-state machine (`ingested → enriched → scored → ready_for_review → approved → published → live`, plus terminal/blocked states `needs_sample`, `duplicate`, `compliance_blocked`, `margin_blocked`, `shipping_blocked`, `media_blocked`, `supplier_blocked`, `rejected`, `expired`). **`ProductCandidate`** is the rich pre-product object (~40 fields): supplier identity, `chapter`, risk flags (`media_rights`, `brand_risk`, `quality_risk`, `counterfeit_risk`, `recalled_risk`, `regulated_risk`), 0-100 scores (`supplier_reliability`, `demand_score`, `brand_fit_score`, `novelty_score`, `return_risk_score`), economics in cents, `variants[]`, `reasons[]`, and computed `score?`/`compliance?`. **`CandidateScore`** holds the weighted breakdown, `gross_margin`, `margin_cents`, `recommended_status`, `blockers[]`, `needs_sample`. **`ComplianceReview`** = `{ status: 'pass'|'blocked'|'needs_review'; blockers[]; warnings[]; checked_at }`.

**`ProductTruth`** — the **customer-facing honesty card** (supplier region, `estimated_ship_days`, `return_window_days`, `quality_checks[]`, `price_logic`, `stock_freshness`, `verified_reviews_count`, `selected_because[]`). Rendered on the PDP (`p/[handle]/page.tsx`) and produced by `candidateToProductTruth()`. This is how the dropship reality is disclosed rather than hidden. **`ShippingPromise`** carries `requires_delay_consent` — a consent gate for slow shipments.

**Constants (the gating floors):**
```ts
DEFAULT_MARGIN_FLOOR = 0.38;     DEFAULT_MAX_SHIPPING_DAYS = 12;
AUTO_REJECT_MARGIN_FLOOR = 0.25; AUTO_REJECT_SHIPPING_DAYS = 21;
```
Plus a 23-term `BLOCKED_CATEGORY_TERMS` list (baby/child/toy/supplement/food/cosmetic/medical/weapon/battery/replica/counterfeit/adult/…).

**Pure functions:**
- **`grossMargin(cost, retail)`** → `(retail - cost) / retail`, guarding `retail <= 0` → `0`.
- **`evaluateCompliance(candidate)`** — lowercases `title + category + category_tree + description` and does a **substring** match against `BLOCKED_CATEGORY_TERMS`; pushes blockers for blocked terms, `media_rights` ∈ {blocked, unknown}, `counterfeit_risk: high`, `recalled_risk` ∈ {high, unknown}, `regulated_risk: high`; warnings for `brand_risk: high`, `quality_risk: unknown`, `supplier_reliability < 70`. Status = `blocked` if any blocker, else `needs_review` if any warning, else `pass`. **Security/edge smell:** naive `includes()` substring matching is over-broad and bypassable — `"masking tape"` trips `mask`, `"foodie tote"` trips `food`, while a deliberately obfuscated listing ("vit@min") slips through. It is a coarse first-pass filter, not a robust policy engine; the Warden agent presumably backs it up. Also `media_rights: 'unknown'` is treated as a hard *blocker*, which is why every `radar` candidate (always `unknown`) is honestly publish-blocked.
- **`scoreCandidate(candidate, marginFloor=0.38, maxShippingDays=12)`** — the weighted 0-100 score:

  | component | weight | source |
  |---|---|---|
  | demand | 0.20 | `demand_score` |
  | margin | 0.20 | `(margin/marginFloor)*100` clamped |
  | supplier | 0.15 | `supplier_reliability` |
  | shipping | 0.10 | speed vs `maxShippingDays+4` |
  | quality | 0.10 | known 92 / unknown 62 / high 20 |
  | brand | 0.10 | `brand_fit_score` |
  | returns | 0.05 | `100 - return_risk_score` |
  | novelty | 0.05 | `novelty_score` |

  Hard blockers are appended for `price_or_cost_missing`, `stock_unavailable`, `supplier_reliability < 55`, margin `< AUTO_REJECT_MARGIN_FLOOR`, lead time `> AUTO_REJECT_SHIPPING_DAYS`. `needs_sample` triggers when `total >= 82` **and** (`quality_risk unknown` OR `cost_cents >= 5000` OR category matches `/size|fit|wear|apparel|shoe/i`) — i.e. expensive or sizing-sensitive winners require a physical sample, never auto-publish. `recommended_status` is assigned by a **priority cascade**: compliance > media > margin (`< marginFloor`) > shipping (`> maxShippingDays`) > supplier/stock > needs_sample > `scored` (if `total < 76`) > default `ready_for_review`. **Subtle gap:** the cascade checks blocked *categories* but the generic auto-reject blockers (`margin_below_auto_reject_floor`, `shipping_above_auto_reject_days`, `stock_unavailable`) are recorded in `blockers[]` yet do **not** force a `rejected` status — a 19-day-lead candidate gets `shipping_blocked` (recoverable) not `rejected`, even though it's past the 21-day auto-reject line only at 21+. The status is recommendation-grade; the blockers are the hard truth, so consumers must check `blockers[]`, not just `status`.
- **`attachReview(candidate, marginFloor?, maxShippingDays?)`** — runs compliance + score, returns a new candidate with `compliance`, `score`, `status = score.recommended_status`, refreshed `updated_at`. The idiomatic entry point (used by fixtures and `sourcing.ts`).
- **`candidateToProductTruth(candidate)`** — maps a candidate to the customer honesty card; hard-codes `return_window_days: 30` and `verified_reviews_count: 0` (so a freshly sourced product never claims reviews it doesn't have — honest, but means the field is *always* zero until something else writes it). Used by `lumera-publish.ts`.

`clamp()` is a private finite-guarded `min/max`.

---

### 4.4 `src/sourcing.ts` — radar discovery (scraped marketplaces → candidates)

Turns raw scraped AliExpress/Alibaba/Shein/Amazon listings into scorable `ProductCandidate`s, via **managed scraping infra (Oxylabs realtime + Apify Actors)** — explicitly *not* a hand-rolled browser, "never against marketplace ToS." This is the only file in the package that does **network I/O** and reads many env vars.

**`RadarSource`** = `aliexpress|alibaba|shein|amazon|generic`. **`RADAR_SOURCES`** maps each to a `RadarSourceConfig` with a `searchUrl(query)` builder (URL-encoded), an `apifyActor` slug (env-overridable: `APIFY_ALIEXPRESS_ACTOR` default `'mocwatter/aliexpress-listings-scraper'`, `APIFY_ALIBABA_ACTOR`, `APIFY_SHEIN_ACTOR`, `APIFY_AMAZON_ACTOR`), and a `region`. `generic.searchUrl` is identity (caller passes a full URL). **Note:** these defaults are read at module-load via `process.env.*` in the object literal, so they bind once at import time — changing the env after import has no effect on `RADAR_SOURCES`.

**Pure normalizers (no network, deterministic modulo timestamps):**
- **`toCents(value)`** — strips non-numeric chars and `Math.round(n*100)`. Explicitly documented to treat scraped prices as **dollars** (so `"$1,499"` → `149900`, not misread as cents). Returns `0` for non-finite/≤0. `sourcing.test.ts` pins `'19.99'→1999`, `49→4900`, `'$1,499'→149900`, `'free'→0`. The cents-vs-dollars ambiguity across the codebase is consciously handled here ("Vendor *API* responses already in cents are normalized separately in the vendor clients").
- **`slugify(value)`** — lowercase, non-alnum→`-`, trim dashes, `slice(0,90)`.
- **`normalizeScrapedProduct(raw, opts)`** — the adapter. Tolerates the wildly different field shapes of common OSS scrapers via fallback chains (`firstString(raw.id, raw.productId, raw.pid, raw.asin, …)`, `pickImage`, `ratingOf`, `ordersOf`). Key derived logic: `markup` default **2.6×**; `retailCents = max(explicitRetail, round(cost*markup), cost+500)` (never below a $5 absolute floor over cost); `demandScore = clamp(log10(orders+1)*22 + rating*8)`; `supplierReliability = clamp(50 + rating*8)` (5★ ≈ 90). Hard-codes risk posture for scraped goods: `media_rights: 'unknown'` (→ always a publish blocker — scraped media is never licensed), `counterfeit_risk: 'medium'` for AliExpress/Alibaba, `recalled_risk: 'unknown'`, `chapter: 'signal'`, `vendor: 'radar'`. Every candidate's `reasons[]` includes *"Assign fulfilment route (… / CJ) and re-shoot media before publish"* — encoding the integrity rule that **a scraped URL is discovery-only, never directly fulfillable**. Ends by calling `attachReview()`, so radar picks land honestly in review/needs_sample/media_blocked.
- **`normalizeMany(rawItems, opts)`** — filters out falsy/`error` rows, maps with index.

**Network helpers (gated, fixture-safe):**
- **`oxylabsConfigured()`** = `OXYLABS_USER && OXYLABS_PASS`; **`apifyConfigured()`** = `APIFY_TOKEN`; **`radarConfigured()`** = either. These return `false` → everything **degrades to `[]`** on a clean checkout (no creds, no crash) — verified by `sourcing.test.ts` (`radarDiscover` returns `[]` not an error).
- **`oxylabsQuery(payload)`** — POSTs to `https://realtime.oxylabs.io/v1/queries` with Basic auth (Base64 via `btoa` or `Buffer` fallback for safe bundling), `parse: true`. Throws on non-2xx (`Oxylabs ${status}: …` truncated to 200 chars). Returns `body.results[]`.
- **`runApifyActor(actor, input)`** — POSTs to Apify `run-sync-get-dataset-items?token=${APIFY_TOKEN}`, actor slug `'/'`→`'~'` encoded. **Security note:** the Apify token is placed in the **URL query string** (`?token=…`), which is more leak-prone (proxy/access logs) than an `Authorization` header. Throws on non-2xx.
- **`radarDiscover(input)`** — orchestrator: tries Apify Actor first (richest output), falls back to Oxylabs `universal` if Apify yielded nothing, normalizes the first `limit` (default 12) results. Both calls are `.catch(() => [])` wrapped, so a provider error degrades to empty rather than throwing — discovery never breaks the loop. `contentToItems()` flattens Oxylabs' polymorphic `content` (object | `{products|results|items:[]}` | array).

Consumed by `scripts/radar.ts`, and the intelligence tools `tools/radar.ts`, `tools/apify.ts`, `tools/scraper.ts`.

---

### 4.5 `src/vendor-routing.ts` — multi-supplier routing intelligence (pure)

When a SKU can be fulfilled by more than one supplier, pick the best by margin/lead-time/reliability/health with a deterministic tie-break and graceful failover. **Pure, no I/O** — fully unit-testable.

**`VENDOR_FULFILLMENT_PRIORITY`** — the tie-break order `[printify, printful, cj, spocket, syncee, modalyst, dropified, manual, radar]` (faster/cleaner-API vendors first; `radar` last because it's discovery-only).

**`rankVendorOptions(options, opts)`** → `{ chosen, ranked[], failover }`. Weighting: **margin 45% · reliability 30% · speed 25%** *when a `retailCents` is supplied*; if not, margin weight (0.45) folds entirely into reliability (→0.55) so reliability dominates. `marginPart` saturates at 60% margin (`clamp(margin/0.6,0,1)`); `speedPart` uses `(maxDays+4 - lead_time)/(maxDays+4)`. `requireConnected` defaults `true` → unconnected vendors are filtered out entirely (a SKU is never routed to a vendor that can't fulfill). Sort is `score desc`, tie-broken by priority index. **`failover`** is computed honestly: it re-sorts by raw `gross_margin` (with deterministic secondary keys to avoid false positives on equal margins) and flags `true` only when the highest-margin connected vendor was *not* chosen because health/speed overrode it. `vendor-routing.test.ts` confirms cheaper-cost→higher-margin wins, and that a "best margin / worst service" CJ option fails over to a reliable Printify.

**`selectFulfillmentVendor({ preferred, connected, priority })`** — honors `preferred` iff it's connected; else walks `priority` for the first connected non-`radar` vendor; else returns **`'manual'`** — the always-safe intake. The test suite pins the invariant: *it never returns an unconnected vendor*, defaulting to `manual` even when a preference was given. Consumed by `apps/backend/src/lib/lumera-order-routing.ts`.

---

### 4.6 `src/channels.ts` — outbound multichannel listing contract

The mirror of the inbound vendor layer: push Lumera products *out* to Shopify/Etsy/Amazon/WooCommerce. **`ChannelId`** = `shopify|etsy|amazon|woocommerce`; **`ChannelMode`** mirrors `VendorMode`. **`ChannelConnection`** carries `can_list` (= connected **+ `CHANNEL_LIVE_MODE`**) — the explicit live-listing gate documented in the file header ("NEVER creates a live listing without an explicit `CHANNEL_LIVE_MODE=true` gate AND per-channel credentials"). **`ChannelAdapter`** is the port (`healthCheck`, `listListings`, `createListing`, `updateListing`, `deleteListing`, `getInventory`, `updateInventory`, `handleOrderWebhook`), with `ChannelListingInput` (neutral payload, price in cents), `ChannelListing`, `ChannelInventory`, `ChannelListingResult` (`listing_id: string | null`, "honest statuses, never fabricated"), `ChannelWebhookResult`. **`candidateToChannelListing(candidate)`** is the **pure** mapper: dedupes images via `Set`, takes `price_cents` from `retail_cents`, `sku` from `supplier_sku || variants[0].sku || handle`, `quantity` from `stock`. Consumed by `apps/backend/src/lib/channel-sync/{index,clients,sync}.ts`. **Observation:** `candidateToChannelListing` only ever publishes a single image (`[candidate.image_url]`) — variant media in `candidate.variants` is dropped, so multichannel listings are image-thin.

---

### 4.7 `src/curation-fixtures.ts` — deterministic fixtures (the offline contract)

**`fixtureCandidates(vendor='manual')`** returns three fully-shaped, `attachReview()`-processed candidates: (1) *Modular Carryall* (armor, clean → `ready_for_review`-ish), (2) *Atelier Desk Lamp* (signal; `recalled_risk: 'unknown'` + `regulated_risk: 'medium'` → compliance-**blocked**), (3) *ALTER Heavyweight Studio Tee* (altar, apparel; high score but sizing-sensitive → **`needs_sample`**; forces `vendor: 'printify'` even when called with `'manual'` since a tee needs a POD provider). These three are engineered to exercise the three critical gate outcomes and are reused as the test corpus across **the whole monorepo** — `curation.test.ts`, `lumera-publish.test.ts`, and `channel-sync/clients.test.ts` all import `fixtureCandidates`, so this fixture *is* the shared behavioral contract that lets every app run on a clean checkout with no live vendor. `curation.test.ts` directly asserts: fixture[1] → compliance `blocked` with a `recalled_risk` blocker; fixture[2] → `needs_sample`; and margin/shipping/stock/auto-reject floors all trip as designed.

---

### 4.8 `src/constellation.ts` — the agent roster + guardrail manifest

**`ConstellationMember`** (`key, name, department, role, cadence, gated[]`) and **`CONSTELLATION`** — the 15-worker display manifest for the Founder's Cockpit (Curator, Artisan, Scribe, Quartermaster, Polaris/`shepherd`, Herald, Sourcer, Treasurer, Oracle-Keeper, Analyst, Loyalist, Rainmaker, Forecaster, Refiner, Warden). The critical field is **`gated[]`** — the actions each worker may **never** take autonomously (e.g. Treasurer `['send_invoice','move_money']`, Warden `['delist_product','suspend_supplier','approve_restricted_category']`, Curator `['publish_product','publish_drop']`). The header comment is a hard contract: this list **MUST equal each agent's real escalation gate**, and `apps/intelligence/src/agents/constellation.test.ts` asserts both the **key set** and each worker's `gated` array against the live registry — so the cockpit physically cannot misstate a guardrail without failing CI. **`CONSTELLATION_BY_KEY`** is the `Object.fromEntries` lookup. Consumed by storefront `cockpit/page.tsx`. Subtle: the display `key: 'shepherd'` maps to display-name `'Polaris'` — a name/key divergence the test must account for.

---

### 4.9 `src/drop-grading.ts` — the LATR scale-or-kill loop (pure)

Implements "Growth Playbook #5 — the Shein LATR loop, premium-sized." Pure, so Forecaster, cockpit, and jobs share one rule; **proposals only — execution always rides the founder Approval Loop**. **`DROP_GRADING`** constants: `window_days: 7`, `scale_at: 0.6`, `kill_at: 0.2`, `restock_multiple: 2.5`, `restock_min: 10`.

**`gradeDrop(input)`** → `{ grade: 'scale'|'hold'|'kill'|'early', sell_through, restock_qty?, reason }`. Clamps `remaining` into `[0, total]` and computes `sell_through = sold/total` (rounded to 3 dp). Cascade: inside the window (`days_live < 7`) → `early` (never graded prematurely); `total===0` → `kill` ("no units allocated"); `≥ 0.6` → `scale` with `restock_qty = max(10, round(sold*2.5))`; `≤ 0.2` → `kill`; else `hold`. `drop-grading.test.ts` pins each branch (70% → scale qty 35; restock-min enforcement; ≤20% kill; clamping `remaining > total` → 0% → kill).

**`planDropActions(drops: LiveDrop[])`** → `DropProposal[]` — the actionable half. Only `scale`/`kill` produce proposals (`hold`/`early` produce nothing); each maps to the **real agent escalation gate**: scale → `{ agent: 'forecaster', tool: 'trigger_reorder', input: { drop_id, qty } }`; kill → `{ agent: 'warden', tool: 'delist_product', input: { drop_id } }`. The `agent`/`tool` literals are typed unions that must match the constellation gates (cross-checked in `apps/backend/src/lib/drop-grader*.test.ts`). Sorted **restocks first** (revenue), then kills (free capital); within each group, most decisive sell-through leads. `LiveDrop = DropGradeInput & { id, name? }`. **Contract coupling to flag:** `DropGradeInput` (`units_total/units_remaining/days_live`) is a *separate* shape from `types.ts:Drop` — `days_live` is not on `Drop`, so callers must derive it from `starts_at`; the two drop representations are not unified, which is a small but real seam where a wrong `days_live` mapping would silently mis-grade.

---

### 4.10 Cross-cutting assessment for the reviewer

**Strengths.** The package earns its "contract" billing: behavioral logic (scoring, compliance, routing, grading, price-banding) is **pure and exhaustively tested** (5 spec files, all boundary-pinned), so downstream apps inherit verified guarantees rather than re-implementing them. Safety is encoded *in the types*: `VendorMode`/`ChannelMode` on every result forbid fabricating "live" outcomes; `media_rights:'unknown'` and `radar` candidates self-block; `selectFulfillmentVendor` can only return a connected vendor or `manual`; `gated[]` arrays and `PendingAction`/`AgentRun.pending_actions` make the human-approval gate a first-class data shape that CI verifies against the live agent registry. The "honesty card" (`ProductTruth`) and `Audit.falsifiable_check` show an unusually disciplined posture for an autonomous-commerce stack.

**Risks / smells to probe.**
1. **Trust-boundary type erosion.** `EventContext.chapter`/`price_band` are typed as enums but the unauthenticated `/store/signal` route copies context verbatim without enum validation, so MIND can accrue garbage affinity buckets. Recommend validating `chapter ∈ CHAPTERS` / `price_band ∈ PRICE_BANDS` at ingest.
2. **Coarse compliance matcher.** `evaluateCompliance` uses naive substring matching (`'mask'` in `'masking tape'`) — over-blocks legitimate items and is trivially evadable; it is a heuristic, not a policy engine.
3. **Currency/units inconsistency.** `Money`/`priceBand` work in bare "dollars-as-number" with hard-coded USD thresholds while curation/channels use integer cents; `priceBand` mis-bands non-USD prices. No shared minor-units convention.
4. **Status vs blockers divergence.** `scoreCandidate` records auto-reject blockers in `blockers[]` but doesn't surface a `rejected` *status* for them — consumers must read `blockers[]`, not just `status`, to honor the hard floors.
5. **Dangling contract members.** `Segment.lapsed` and the `aesthetic` affinity axis are declared but never produced by the code paths I read; the runtime `StoredAffinity._intent` is a superset of the published `VisitorProfile.affinity`. These are silent drifts between the contract and the implementation.
6. **Operational hygiene.** Apify token in the URL query string (log-leak surface); `dist/` (including compiled test files) committed with no build-freshness guard, risking a stale published contract; `RADAR_SOURCES` env binds at import time (non-obvious for runtime config changes); and the package name `@alterxiv/shared` diverges from the "Lumera" brand used throughout.

These are refinements, not foundational flaws — the contract is coherent, safety-gated, and well-tested. **Files reviewed (all under `/home/user/Clouds-bruh/packages/shared/`):** `src/index.ts`, `src/events.ts`, `src/types.ts`, `src/curation.ts`, `src/sourcing.ts`, `src/vendor-routing.ts`, `src/channels.ts`, `src/curation-fixtures.ts`, `src/constellation.ts`, `src/drop-grading.ts`, the five `*.test.ts` specs, `package.json`, and `tsconfig.json`.


---

## 5. Backend — Medusa Modules

This section documents the eight custom Medusa v2 modules under `apps/backend/src/modules/**`. They are the "nervous system" layered on Medusa's commerce skeleton. Six are **data modules** (registered as `{ resolve: ... }` in `medusa-config.ts`'s top-level `modules` array, each exposing a `MedusaService`): `drops`, `signal`, `personalization`, `recommendation`, `monetization`, `lumera`. Two are **provider modules** registered *inside* core modules' `providers` arrays: `lumera-fulfillment` (a `Modules.FULFILLMENT` provider) and `lumera-payment-paypal` (a `Modules.PAYMENT` provider).

A cross-cutting architectural fact the reviewer must internalize up front: **two of these modules largely do not run as written.** `lumera` (the native Medusa module) is an explicitly-acknowledged "typed scaffold that is not wired into any route" — the real curation/vendor/return logic lives in `apps/backend/src/lib/lumera-db.ts` using a hand-rolled `pg.Pool` against tables it creates itself (`ensureLumeraTables()`), which **shadow** the `lumera` module's MikroORM-managed tables of the same names. This is documented as intentional in the code but is a real schema-ownership smell (see §5.6). Likewise, several `recommendation` queries read tables (`product_embedding`, `product.metadata`) that only exist if a separate setup script ran.

### 5.0 Registration & boot gating (`medusa-config.ts`)

`medusa-config.ts` (`apps/backend/medusa-config.ts`) is the wiring root. Key behaviors a security reviewer should note:

- **Production secret gate (good):** before `defineConfig`, if `NODE_ENV === 'production'` it computes `missing = ['JWT_SECRET','COOKIE_SECRET','DATABASE_URL','STORE_CORS','ADMIN_CORS'].filter(k => !process.env[k])` and `throw`s a FATAL error rather than booting on the insecure defaults (`jwtSecret: process.env.JWT_SECRET || 'supersecret'`). The `'supersecret'` fallback therefore only ever applies in non-production. This is a fail-hard, correct posture.
- **Conditional infra:** Redis event-bus + workflow-engine modules are only added when `REDIS_URL` is set; otherwise Medusa uses in-memory defaults so `db:migrate`/seed/boot work on a clean checkout. Custom modules are always registered.
- **Payment providers:** `pp_system_default` always on; Stripe added only if `STRIPE_API_KEY` present (capture-on-authorize unless `STRIPE_MANUAL_CAPTURE=true`); the custom PayPal provider (`./src/modules/lumera-payment-paypal`, id `paypal`) added only if `PAYPAL_CLIENT_ID` present, with `env: PAYPAL_ENV === 'live' ? 'live' : 'sandbox'`.
- **Fulfillment providers:** `fulfillment-manual` (id `manual`, the default) plus the custom `./src/modules/lumera-fulfillment` (id `dropship`, resolving to provider id `lumera_dropship`).
- **File storage:** S3/MinIO only when **all three** of `S3_FILE_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` are set (guards against a host injecting a half-set `S3_FILE_URL` and crashing boot); else local disk under `static/`.

Several modules bypass Medusa's ORM entirely and talk to Postgres through a shared `pg.Pool` in `apps/backend/src/lib/lumera-db.ts` (`pool()`, default DSN `postgres://alterxiv:alterxiv@localhost:5432/alterxiv`). `drops` and `recommendation` and both providers use raw SQL for the operations where Medusa's ORM is insufficient (atomic updates, pgvector, cross-table joins).

---

### 5.1 `signal` — the SIGNAL event spine

**Files:** `signal/index.ts`, `signal/models/event.ts`, `signal/service.ts`, `signal/migrations/Migration20260530203827.ts` (+ snapshot).

**Model `signal_event`** (`models/event.ts`): `id` (pk), `visitor_id` (text, indexed), `session_id` (text), `type` (text, indexed), `entity_id` (text, nullable), `value` (text, nullable), `context` (json), `ts` (dateTime). The migration adds partial indexes `IDX_signal_event_visitor_id` and `IDX_signal_event_type` (both `WHERE deleted_at IS NULL`) plus the standard `created_at/updated_at/deleted_at` soft-delete columns.

**Service `SignalService`** (`extends MedusaService({ SignalEvent })`):
- `ingest(event: TEvent)` — the universal write path. It (1) persists via `createSignalEvents([{ ...event, ts: new Date(event.ts) }])`, then (2) if `REDIS_URL` is set, `XADD`s to the `signal:events` Redis stream with `MAXLEN ~ 50000` (bounded) carrying `visitor_id, session_id, type, entity_id, value, context (JSON), ts`. The Redis path is wrapped in `.catch(() => {})` — **non-fatal** if Redis is down. The stream is the live feed for MIND (personalization) and ORACLE (recommendation) consumers in the intelligence app.
- `recentForVisitor(visitorId, limit=200)` — `listSignalEvents({ visitor_id }, { take: limit, order: { ts: 'DESC' } })`; feeds profile recompute and recs.

**Redis singleton pattern (recurs in `recommendation` too):** a module-level `_redis` is lazily created via `new Redis(url, { lazyConnect: false, enableOfflineQueue: false, maxRetriesPerRequest: 1 })` with an `error` handler that **silently swallows** all Redis errors (`_redis.on('error', () => {})`). This keeps the process alive when Redis is flaky but means Redis failures are invisible in logs — a observability smell.

**Edge cases / risks:**
- `value` is coerced `String(event.value ?? '')` into the stream but stored as text in PG — numeric values (e.g. order totals) become strings; consumers must re-parse.
- No validation that `event.type` is in the canonical taxonomy at the DB layer — type is a free `text` column. Taxonomy enforcement lives in `@alterxiv/shared`, not the schema.
- No dedup/idempotency on `id` beyond the PK; the `order-placed` subscriber uses a deterministic id `purchase_${orderId}`, so a re-delivered order event would PK-collide and the insert would throw (caught by `.catch(() => {})` in that caller).

---

### 5.2 `personalization` — MIND visitor profiles & affinity

**Files:** `personalization/index.ts`, `models/visitor-profile.ts`, `service.ts`, two migrations (`...203843` creates the table, `...230740` adds `preferences`).

**Model `visitor_profile`:** `id`, `visitor_id` (unique), `customer_id` (nullable), `segment` (enum `new_seeker|armor_devotee|high_intent|lapsed|patron`, default `new_seeker`), `embedding` (json, nullable — placeholder; pgvector lives in the separate `product_embedding` table, not here), `affinity` (json), `preferences` (json, nullable — `{followed:[], muted:[]}`), `last_seen` (dateTime), `ltv_estimate` (number/`integer`, nullable). Unique partial index on `visitor_id WHERE deleted_at IS NULL`.

**Service `PersonalizationService`** implements an **online affinity model** with time decay. Internal `StoredAffinity` = `{ chapter, category, price_band, aesthetic: Record<string,number>, _intent: number }`. Constants: `DECAY = 0.95`, `BASE_AFFINITY_WEIGHT = 0.1`, `HIGH_INTENT_EVENTS = {add_to_cart, checkout_step, purchase, wishlist_add}`.

- `observe(event)` — O(1) per event. Loads existing profile (`take:1`), computes `rewardWeight = (REWARD_WEIGHTS[type] ?? 1) * 0.1` and `intentDelta = HIGH_INTENT_EVENTS.has(type) ? REWARD_WEIGHTS[type] : 0`. It **decays the entire affinity map by 0.95** (`decayAffinity`), then `addSignal` increments the buckets present in `event.context` (`chapter/category/price_band/aesthetic`) by `weight` and accumulates `_intent`. Then `segmentFor` recomputes the segment. Creates or updates the profile (note the MedusaService update signature: `updateVisitorProfiles([{ selector, data }])`).
  - **Smell:** decay is applied **per event**, not per unit time. A visitor generating 50 events in one session decays their history 0.95^50 ≈ 0.077 in minutes, while an idle visitor never decays. This is "recency by activity," not true temporal recency — defensible but not what "decay" usually implies.
- `segmentFor(affinity, intentScore)` — `intentScore >= 20 → high_intent`; else if the dominant chapter is `armor → armor_devotee`; else `intentScore >= 5 → patron`; else `new_seeker`. Note `lapsed` is in the enum but **never assigned** here (no recency-based downgrade path), and `armor_devotee` short-circuits before `patron`, so a high-affinity-armor buyer can never be classed `patron`.
- `identify(visitorId, customerId)` — anonymous→customer merge on login. If a profile already exists for `customer_id` and it's a different `visitor_id`, it `mergeAffinity` (element-wise `Math.max` across every bucket and `_intent`) into the customer profile, then tombstones the anonymous one by setting its `customer_id = 'merged:${customerId}'`. Otherwise it just stamps `customer_id` onto the visitor profile. **Risk:** merge uses `max`, not sum — repeated identifies are idempotent but discard accumulated weight; and the `merged:` tombstone is a string convention, not a real link.
- `setPreferences(visitorId, followed, muted)` — "Tune the Broadcast." Following a chapter sets `chapter[c] = max(current, FOLLOW_BOOST=5)`; muting sets `chapter[c] = 0`. Persists `preferences = {followed, muted}` (deduped via `Set`) and recomputes segment. This directly steers ORACLE because `recommendation.visitorVector` reads the same `affinity.chapter`. `getPreferences` returns `{followed, muted}` with `[]` defaults.

**Risks:** all reads use `{ take: 1 }` with no ordering — if duplicate rows for a `visitor_id` ever existed (the unique index should prevent it, modulo soft-deletes), the "first" is nondeterministic. Errors are swallowed with `.catch(() => [])`, so a DB outage silently degrades to "new visitor" behavior.

---

### 5.3 `recommendation` — ORACLE (the algorithmic core)

**Files:** `recommendation/index.ts`, `models/recommendation.ts`, `service.ts` (382 lines, the densest file), `strategies/graph-rec.ts`, three migrations (`...203847` table, `...163643` adds `graph_rec` to the strategy CHECK constraint, `...120000` creates the pgvector `product_embedding` table).

**Model `recommendation`:** `id`, `visitor_id` (indexed), `strategy` (enum `for_you|because_you_viewed|complete_the_set|trending_in_chapter|graph_rec`), `product_ids` (json), `score` (number), `served_at` (dateTime), `clicked` (bool, default false), `converted` (bool, default false). This is the **attribution ledger** for the Learning Loop.

**`Migration20260630120000` (pgvector bootstrap)** — worth quoting because it's defensively engineered: the whole `CREATE EXTENSION vector` + `CREATE TABLE product_embedding (product_id text pk, chapter text, embedding vector(5), updated_at)` + indexes block is wrapped in a `DO $$ ... EXCEPTION WHEN OTHERS THEN RAISE NOTICE ... END $$`, gated on `pg_available_extensions`, so it **degrades to a no-op** on managed Postgres where the role lacks `CREATE EXTENSION` privilege (error 42501) rather than aborting `db:migrate`. The HNSW index (`USING hnsw (embedding vector_cosine_ops)`) has its own nested exception handler for older pgvector. **Embeddings are 5-dimensional** — one dimension per chapter (not learned semantic embeddings).

**Service `RecommendationService`** — uses a raw `pg.Pool` (`getPool()`) and the Redis singleton (`getRedis()`). Chapter dimension order is fixed: `[stillness, armor, signal, altar, relentless]`, with one-hot-ish `CHAPTER_VEC` (0.95 on the chapter, 0.05 elsewhere) and `DEFAULT_VEC = [0.2×5]`.

**`forVisitor(visitorId, strategy, limit=12): Promise<string[]>`** — the strategy dispatcher. The entire body is in a `try/catch` that on any error logs `[ORACLE] forVisitor error` and returns `[]` (graceful degradation, but also silent recommendation failure). Per strategy:
- **`for_you`** — pgvector cosine k-NN. Builds a query vector via `visitorVector()` and runs `SELECT pe.product_id FROM product_embedding pe JOIN product p ON p.id=pe.product_id WHERE p.deleted_at IS NULL ORDER BY pe.embedding <=> $1::vector LIMIT $2`. The `<=>` operator is pgvector cosine distance.
- **`because_you_viewed`** — finds the visitor's last `product_view` `entity_id` from `signal_event`, then item-item k-NN: `ORDER BY pe2.embedding <=> pe1.embedding`. Falls back to `trendingByChapter(null, limit)` if no view exists.
- **`complete_the_set`** — products in the visitor's dominant-affinity chapter, **excluding recently viewed** via `pe.product_id NOT IN (SELECT COALESCE(entity_id,'') FROM signal_event WHERE visitor_id=$2 AND type='product_view' LIMIT 20)`, `ORDER BY random()`. *Smell:* the subquery has no `ORDER BY` before `LIMIT 20`, so "recently" is arbitrary rows, not the newest 20.
- **`trending_in_chapter`** — delegates to `trendingByChapter(dominantChapter, limit)`.
- **`graph_rec`** — calls `graphRecForVisitor(pool, visitorId, limit)` (see below), then **tops up** to `limit` with cosine `for_you` results, excluding already-chosen ids via `pe.product_id <> ALL($3)`.

After producing `productIds`, if non-empty it records the served rec (`createRecommendations([{ visitor_id, strategy, product_ids, score: productIds.length, served_at }])`, errors swallowed). Note `score` is just the count, not a real relevance score.

**`visitorVector()` (private)** — reads `affinity.chapter` from `visitor_profile`, normalizes raw chapter weights, identifies the dominant chapter, and **blends** `0.7 * dominantOneHot + 0.3 * normalizedRaw`. Defaults to `DEFAULT_VEC` for unknown visitors or on error.

**`graphRecForVisitor`** (`strategies/graph-rec.ts`) — **item-based collaborative filtering over the co-engagement graph** ("RecoGCN-inspired," but the GCN is not trained; this is the online CF form). One CTE query:
1. `seed` = up to 10 distinct products this visitor engaged (`product_view|add_to_cart|purchase`),
2. `covisitors` = up to 500 other visitors who engaged any seed product,
3. candidates = products those co-visitors also engaged (excluding seeds), weighted `SUM(CASE type WHEN 'purchase' THEN 3 WHEN 'add_to_cart' THEN 2 ELSE 1 END)`, `ORDER BY weight DESC`.
Cold start (no seed) → empty, caller falls back to cosine. *Risk:* `covisitors` is capped with a bare `LIMIT 500` (no ordering), so on a high-traffic product the co-visitor set is an arbitrary sample. The whole thing is wrapped in try/catch → `[]`.

**`rankBroadcastBlocks(visitorId, candidateBlocks): Promise<string[]>` — Thompson-sampling bandit.** State lives in Redis hashes keyed `bandit:{segment}:{block}` storing `alpha`/`beta`. For each block it reads `alpha`/`beta` (default 1/1), draws `theta = betaSample(alpha, beta)`, sorts blocks by descending `theta`. Per-segment priors come from the visitor's `segment` in `visitor_profile`. If Redis is absent it returns `candidateBlocks` unchanged (no personalization, no crash).
- **`reward(visitorId, block, reward)`** — `reward > 0 → HINCRBYFLOAT alpha by reward`; else `HINCRBYFLOAT beta by 1`. Called by the Learning Loop on conversion.
- **`betaSample(alpha, beta)` — a real correctness concern.** It does **not** sample from a Beta distribution; it uses a **Normal approximation** (`mean = α/(α+β)`, `variance` per the Beta formula, then one Box–Muller normal draw clamped to [0,1]). The comment admits "approximate." For the common cold-start case `α=β=1` (uniform Beta), the Normal approximation is poor — it concentrates near 0.5 instead of spreading uniformly, which **suppresses exploration** exactly when exploration matters most. A senior reviewer should flag this: a Gamma-ratio sampler would be only marginally more code and correct.

**`dynamicPrice(productId)` — staged dynamic pricing, never auto-applied.** Returns `{ base_usd, suggested_usd, floor_usd, ceiling_usd, demand_factor, scarcity_factor, reason, would_apply: false }` or `null`. Algorithm:
- `baseCents` from a join across `product → product_variant → product_variant_price_set → price` filtered `currency_code='usd'` (first variant).
- `demandFactor` = this product's 7-day weighted engagement (`purchase=5, add_to_cart=3, else 1`) as a fraction of the catalog max — i.e. a crude percentile in [0,1].
- `scarcityFactor = 1 - min(units_remaining/units_total)` over live `"drop"` rows containing the product (`product_ids ? $1` jsonb-contains).
- `floorCents = base * COST_RATIO(0.55) * (1 + MIN_MARGIN(0.15))`; `ceilingCents = base * 1.25`.
- `lift = 0.25 * (0.6*demand + 0.4*scarcity)`; `suggested = clamp(base*(1+lift), floor, ceiling)` — **up-only luxury elasticity**.
- `would_apply: false` is hard-coded — this is a *proposal*; applying a price change is an explicit founder escalation. This respects the "no autonomous money movement" non-negotiable. Env: `PRICING_COST_RATIO`, `PRICING_MIN_MARGIN`. **Caveat (in code):** products carry no true `supplier_price`, so the margin floor is derived from a documented ratio of retail — the floor is therefore a heuristic, not a real cost guarantee.

**`attribute(recId, kind)`** — flips `clicked` (and `converted` for `'convert'`) on a served rec; errors swallowed.

**`trendingByChapter` (private)** — 7-day engagement counts joined to `product`, optionally filtered by `p.metadata->>'chapter' = $2`, with a cold-start fallback to `ORDER BY random()` products of the chapter. *Note:* chapter for trending comes from `product.metadata->>'chapter'`, but `complete_the_set`/embeddings use `product_embedding.chapter` — **two sources of truth for a product's chapter** that can drift.

---

### 5.4 `drops` — scarcity engine with oversell-safe decrement

**Files:** `drops/index.ts`, `models/drop.ts`, `service.ts`, `migrations/Migration20260530203851.ts`, `service.test.ts`.

**Model `drop`:** `id`, `name`, `series`, `chapter` (enum, 5 chapters), `status` (enum `scheduled|live|sold_out|archived`, default `scheduled`), `starts_at`, `ends_at`, `units_total`, `units_remaining`, `product_ids` (json). Only a `deleted_at` index.

**Service `DropsService`:**
- `listLive()` — `listDrops({ status: 'live' })`. *Bug/smell:* the comment says "starts_at <= now <= ends_at" but **the time window is never applied** — a `live` drop outside its window still lists. Time-gating is only by the `status` column, which something must flip.
- **`consumeUnits(dropId, qty, { allowPartial })` — the oversell-safe decrement (a genuinely good piece).** It deliberately bypasses Medusa's ORM and uses the shared `pool()` for a **single guarded atomic UPDATE**, because the prior read-modify-write let two concurrent purchases of a 1-unit drop both read "1 left" and both succeed (oversell). Two modes:
  - **Strict (default, reserve/order path):** `UPDATE "drop" SET units_remaining = units_remaining - $1, status = CASE WHEN units_remaining - $1 <= 0 THEN 'sold_out' ELSE status END ... WHERE id=$2 AND units_remaining >= $1 AND deleted_at IS NULL`. If `rowCount === 0` (guard failed or drop gone) it **throws** `drop_oversold_or_missing:${dropId}` so the workflow compensation fires. The DB enforces the invariant; no oversell possible.
  - **`allowPartial` (post-order bookkeeping in `order-placed`):** `units_remaining = GREATEST(0, units_remaining - $1)`, flips to `sold_out` at ≤0, and only throws `drop_not_found` if the row is missing — it never blocks, because the order already exists.
  - Input is floored/validated (`n = Math.floor(Number(qty))`; `n<=0 → return`).

**Subscriber wiring:** `subscribers/order-placed.ts` (event `order.placed`) calls `drops.consumeUnits(drop.id, totalQty, { allowPartial: true })` for every live drop whose `product_ids` overlap the purchased products. *Note the asymmetry:* checkout reservation should use strict mode, but the only wired caller uses `allowPartial`, meaning real oversell prevention depends on a strict caller existing elsewhere in the reserve/workflow path (the comment implies one). If reservation never runs strict, the system is back to post-hoc accounting that can go to zero but can't *reject* an oversell at purchase time.

---

### 5.5 `monetization` — memberships, Lumens ledger, gift cards, loyalty

**Files:** `monetization/index.ts`, `service.ts`, `loyalty.ts`, five models, `Migration20260531162748.ts`, `monetization.test.ts`.

**Models:**
- `membership_tier`: `key` (unique), `name`, `description?`, `price_cents`, `interval` (`month|year`), `entitlements` (json string[]), `stripe_price_id?`, `active`. (Autumn pattern: tier = priced Feature bundle.)
- `membership`: `customer_id`, `tier_key`, `status` (`active|past_due|canceled`), `stripe_subscription_id?`, `current_period_end?`.
- `credit_wallet`: `customer_id` (unique), `balance` (default 0). **1 credit = 1¢.**
- `credit_transaction`: append-only ledger — `customer_id`, `kind` (`grant|purchase|debit|credit_note`), `amount` (signed), `balance_after`, `reason?`, `ref?`.
- `gift_card`: `code` (unique), `initial_balance`, `balance`, `status` (`active|redeemed|void`), `purchaser_id?`, `message?`.

**Service `MonetizationService`:**
- **Memberships (Autumn):** `subscribe(customerId, tierKey)` — upgrades in place if an active membership exists, else creates one with `current_period_end` = now + 12mo/1mo and a fake `stripe_subscription_id = sub_test_${Date.now()}` **only when `STRIPE_API_KEY` is set** (test-mode mirror; no real Stripe call is made here). `entitlementsFor(customerId)` unions `entitlements` across active tiers and returns `{ tier, entitlements, is_patron }`.
- **Lumens ledger (Flexprice):** the private `post(customerId, kind, amount, reason?, ref?)` is the single mutation point. `delta = kind==='debit' ? -|amount| : +|amount|`; computes `balanceAfter`, **throws `'Insufficient Lumens'` if it would go negative**, updates the wallet, and appends a `credit_transaction`. Public wrappers: `grant`, `purchaseCredits` (test-mode), `debit`. `walletFor` lazily creates a zero-balance wallet.
  - **Concurrency risk:** `post` is a read-modify-write across two ORM calls with **no DB-level lock or atomic update** (unlike `drops.consumeUnits`). Two concurrent debits can interleave and double-spend / produce wrong `balance_after`. For a ledger this is the kind of thing a skeptical reviewer will (rightly) flag — the oversell lesson from `drops` was not applied here.
- **Gift cards:** `issueGiftCard(amount, purchaserId?, message?)` mints a code `ALTAR-XXXXXX-XXXX` via `Math.random().toString(36)` (low entropy, predictable-ish — fine for test mode, weak for production value instruments). `redeemGiftCard(code, customerId)` validates `status==='active'` and `balance>0`, then `grant`s the balance into the wallet and zeroes/`redeemed`s the card. *Risk:* not atomic — concurrent redemptions of the same code could both pass the check before either writes `redeemed`, double-crediting.
- **Luminance loyalty:** `awardForPurchase(accountId, orderTotalCents)` grants `round(total * EARN_RATE(0.05) * multiplier)` where `multiplier = is_patron ? 2 : 1`. `rewardsSummary(accountId)` sums lifetime positive transactions, resolves the loyalty ladder, returns balance/tier/multiplier/next-tier.
- **`loyalty.ts`** — pure, dependency-free (unit-tested): `LOYALTY_LADDER = [Spark@0, Glow@2500, Aurora@10000, Zenith@50000]` and `resolveLoyaltyTier(lifetimeEarned)` → `{ current, next, credits_to_next }`.

**Subscriber wiring:** `order-placed.ts` calls `monetization.awardForPurchase(account, orderTotalCents)` where `account = customer_id ?? metadata.visitor_id` (guests accrue under their anonymous id). Env: `REWARDS_EARN_RATE`. **Money invariant honored:** the module comment states nothing here moves real money; Stripe mirroring is id-stamping only.

---

### 5.6 `lumera` — native scaffold (mostly inert; see warning)

**Files:** `lumera/index.ts`, `service.ts`, seven models, `Migration20260607142000.ts`. **No subscriber, no route binds to it.**

**Models** (MikroORM-managed; tables `lumera_*`): `vendor-connection` (`label`, `mode` enum `live|sandbox|fixture|missing_credentials|blocked`, `connected`, `can_publish`, `can_submit_orders`, `last_checked_at`, `missing_env` json, `message`), `product-candidate` (`vendor`, `supplier_id/name`, `title`, `handle` unique, `status`, `score`, `gross_margin`, `lead_time_days`, `stock`, `payload` json), `approval-request` (`candidate_id`, `action`, `status`, `reason?`, `payload`), `vendor-order` (`order_id?`, `vendor`, `vendor_order_id?`, `status`, `payload`), `webhook-event`, `return-case`, `product-design`. The migration creates all seven tables plus status indexes.

**Service `LumeraService`** — thin: `listBoardCandidates(status?)` and `recordApproval(...)`. That's it.

**The critical caveat (documented in `lib/lumera-db.ts`):** "lib/lumera-db.ts is the source of truth the routes use; the native Medusa module (src/modules/lumera) is a typed scaffold that is not wired into any route." Both define the *same* table names. `lumera-db.ts`'s `ensureLumeraTables()` issues `CREATE TABLE IF NOT EXISTS` for them at runtime, and the migration also creates them — whichever runs first wins, and the comment notes the raw DDL deliberately mirrors the module migration (including `deleted_at`) "to prevent schema drift." **This is dual ownership of the same Postgres tables by an ORM module and a hand-rolled SQL layer** — the single biggest structural risk in this scope. If the module is ever wired up, MikroORM and the raw layer will fight over schema/soft-delete semantics.

Because the real curation/vendor logic lives in `lumera-db.ts`, the reviewer should treat **that file as the de-facto eighth "module."** Its security-relevant surface:
- **`verifyVendorWebhook` / `verifyStripeWebhook`** — HMAC-SHA256 verification. **Fail-closed in production** (`NODE_ENV==='production'` + no secret → `{valid:false, proof:'missing_secret_in_production'}`) but **accept-and-flag in dev** (`{valid:true, proof:'unsigned_no_secret_configured'}`). Uses `crypto.timingSafeEqual` via `safeEqual` (length-checked) — constant-time, good. The Stripe verifier implements the real `t=...,v1=...` scheme over `${t}.${rawBody}` with a 300s tolerance window. Both **require the raw request body** (via a `preserveRawBody` middleware) and fall back to re-serialized JSON only when unavailable — re-serialization will break signatures, so the raw-body middleware is load-bearing.
- **Vendor gating:** `vendorConnections()` derives `can_publish` / `can_submit_orders` from env presence plus `VENDOR_LIVE_MODE` / `AUTO_SUBMIT_VENDOR_ORDERS` / `AUTO_PUBLISH_APPROVED`. `manualConnection()` and `radar` stay in `fixture`/`sandbox` mode until founder-verified. This is the "live supplier order submission stays off unless both flags are true" gate from CLAUDE.md, implemented honestly.
- `ensureAgentRunTable()` duplicates the intelligence app's `agent_run` DDL "byte-for-byte" so the backend drop-grader can write founder-approval proposals before the intelligence service has booted — another deliberate-but-fragile DDL duplication.

---

### 5.7 `lumera-fulfillment` — native dropship fulfillment provider

**Files:** `lumera-fulfillment/index.ts`, `service.ts`, `service.test.ts`. Registered inside core fulfillment as id `dropship` → provider id `lumera_dropship`.

`index.ts` exports `ModuleProvider(Modules.FULFILLMENT, { services: [LumeraDropshipFulfillmentService] })`. The service `extends AbstractFulfillmentProviderService`, `static identifier = 'lumera'`.

Key methods:
- `getFulfillmentOptions()` → `[{id:'lumera-dropship'}, {id:'lumera-dropship-return', is_return:true}]`.
- `canCalculate()` → `shippingRatesConfigured()` — returns `true` only when a live carrier (EasyPost/Shippo) is configured; otherwise the option stays flat-rate and **nothing reaches a carrier API**.
- `calculatePrice(_opt, data, context)` → `CalculatedShippingOptionPrice`. Derives a destination via the pure, exported `deriveDestination(data, context)` (prefers explicit `data.to_country/to_postal`, falls back to the cart's `shipping_address`), calls `getLiveShippingRate(...)`, and returns `calculated_amount` in **integer cents** (Lumera convention; storefront ÷100). **Resilient:** any failure/no-rate/no-carrier falls back to `LUMERA_FLAT_SHIPPING_USD` (default 0) cents and **never throws** — "checkout must not break because a carrier API is down."
- `createFulfillment(_data, items, order, fulfillment)` — the integration point. Normalizes items, computes per-vendor drafts via the pure `stageDecision → vendorOrderDraftsFromOrder(order)` (see §5.8), best-effort persists via `persistVendorOrderDrafts` (only when `DATABASE_URL` set, errors logged not thrown), and returns `data: { lumera:true, order_id, staged_vendor_orders:[{id,vendor,status}], live_submission_gated: !(VENDOR_LIVE_MODE && AUTO_SUBMIT_VENDOR_ORDERS) }`. **No money/supplier call is ever made here** — it stages only.
- `cancelFulfillment(data)` — flips each staged `lumera_vendor_order` to `cancelled` via raw SQL (errors swallowed).
- `createReturnFulfillment(fulfillment)` — opens a `lumera_return_case` via `createReturnCase`.

**Order routing (`lib/lumera-order-routing.ts`), shared with the `order-placed` subscriber:** `vendorOrderDraftsFromOrder` groups items by vendor (`vendorForItem`: respects explicit `metadata.fulfillment_provider/vendor/lumera_truth.fulfillment_provider`, else `selectFulfillmentVendor({ connected })` failover to best connected vendor, `'manual'` if none — `normalizeVendor` rejects `radar` and unknowns down to `manual`). Per group it sets `status`: `blocked_missing_supplier_sku` if any item lacks a `supplier_sku`; else `ready_for_vendor_submission` only when **both** `VENDOR_LIVE_MODE` and `AUTO_SUBMIT_VENDOR_ORDERS` are true; else `staged_for_approval`. Record id is deterministic (`lvo_${orderId}_${vendor}`, sanitized, ≤120 chars) → idempotent upsert. This is the **dropship safety gate** working correctly: without both flags, every order parks at `staged_for_approval`.

---

### 5.8 `lumera-payment-paypal` — PayPal Orders v2 provider

**Files:** `lumera-payment-paypal/index.ts`, `service.ts`, `money.ts`, `service.test.ts`. Registered inside core payment as id `paypal` → provider id `pp_paypal_paypal` (Medusa `pp_{identifier}_{id}`), only when `PAYPAL_CLIENT_ID` is present.

`index.ts` exports `ModuleProvider(Modules.PAYMENT, { services: [LumeraPayPalProviderService] })`. The service `extends AbstractPaymentProvider<PayPalOptions>`, `static identifier = 'paypal'`, using **global `fetch` only — no PayPal SDK.**

**`money.ts` (pure, no Medusa imports — single source of truth for the money boundary):**
- `paypalBaseUrl(env)` → `live` only when `env.toLowerCase()==='live'`, else sandbox.
- `formatPayPalAmount(amountCents)` → cents → 2-decimal major-unit string; **negative/NaN → `'0.00'`**. This is the only place cents↔dollars conversion happens, and it's shared with `scripts/paypal-capture-proof.ts` so the proof exercises the exact production path.

**Auth (lazy):** `getAccessToken()` — OAuth2 client-credentials `POST ${base}/v1/oauth2/token` with Basic auth, cached in `accessToken_`/`tokenExpiresAt_` (refreshed 60s early). **Never fetched at construction**, so missing creds can't crash boot; returns `null` when unconfigured or on any failure. `authedFetch` returns `null` if no token.

**Provider methods (all degrade gracefully):**
- `initiatePayment` — if configured, `POST /v2/checkout/orders` with `intent: 'CAPTURE'` and `purchase_units[].amount = { currency_code, value }`; returns the PayPal order id + mapped status. **Fixture-safe fallback:** unconfigured or failed → a local id `paypal_local_${Date.now()}`, status `pending`, `data.gated:true`. No network on the fallback path.
- `capturePayment` — **the money-honesty core.** If configured and there's an order id: `POST /v2/checkout/orders/{id}/capture`; on `res.ok` returns the captured data; **on a non-OK response it `throw`s `paypal_capture_failed:{id}`** so Medusa marks the payment failed (never reports a capture that didn't happen). If unconfigured/no-id: it may only return `{ captured:true, simulated:true }` when `paymentSimulationAllowed()` (i.e. `NODE_ENV !== 'production'`); **in production it throws `paypal_capture_unavailable:not_configured`.**
- `refundPayment` — mirrors capture: real `POST /v2/payments/captures/{captureId}/refund` when configured (throws `paypal_refund_failed` on non-OK — "reporting a false refund success is the worst failure mode"); simulates only outside production, else throws. `extractCaptureId` digs `purchase_units[].payments.captures[0].id` out of a captured payload.
- `authorizePayment`/`getPaymentStatus`/`retrievePayment` — best-effort `GET /v2/checkout/orders/{id}` via `fetchOrderStatus`, mapping PayPal status → Medusa via `mapPayPalStatus` (`COMPLETED→captured`, `APPROVED|SAVED→authorized`, `VOIDED→canceled`, `PAYER_ACTION_REQUIRED→requires_more`, `CREATED`/default→`pending`).
- `cancelPayment`/`deletePayment`/`updatePayment` — no destructive PayPal endpoints exist; these just re-stamp local data. `updatePayment` re-formats the amount/currency.
- `getWebhookActionAndData` → pure `paypalWebhookAction(payload.data)` mapping events: `CHECKOUT.ORDER.APPROVED→authorized`, `PAYMENT.CAPTURE.COMPLETED`/`CHECKOUT.ORDER.COMPLETED→captured`, `PAYMENT.CAPTURE.DENIED|DECLINED→failed`, `CHECKOUT.ORDER.VOIDED`/`PAYMENT.CAPTURE.REVERSED→canceled`, else `not_supported`. Amount/session_id are extracted from the resource; the comment notes amount reconciliation is deferred to Medusa's stored session.

**Security/risk notes:** `getWebhookActionAndData` does **no PayPal webhook signature verification** (PayPal's `verify-webhook-signature` API is not called) — it trusts the event body. Medusa's payment webhook route is the gatekeeper, but for a provider that maps `captured`/`failed` straight from an unauthenticated body this is worth a hard look. The non-production simulation path (`simulated:true`) is the correct dev affordance but means any non-prod deploy will happily "capture" without PayPal — `NODE_ENV` must be exactly `'production'` in prod or the money-honesty invariant silently disables.

---

### Cross-module observations for the reviewer

1. **Two atomicity standards.** `drops.consumeUnits` is exemplary (single guarded atomic UPDATE, throws on oversell). `monetization.post` (Lumens) and `redeemGiftCard` are **read-modify-write with no locking** — value-bearing ledgers without the concurrency guard the drops module proves the team knows how to write. This is the most likely place for a correctness defect under load.
2. **Silent degradation everywhere.** Nearly every external call (`Redis`, `pg`, PayPal, carrier) is wrapped to swallow errors and degrade. Operationally safe, but it means failures (bad recs, missing embeddings, Redis down, capture anomalies) are invisible unless `captureException`/`console.warn` logs are actively monitored.
3. **Chapter has multiple sources of truth:** `product_embedding.chapter`, `product.metadata->>'chapter'`, `drop.chapter`, and `visitor_profile.affinity.chapter` — drift between them silently changes which products surface.
4. **`betaSample` is not a Beta sampler** (Normal approximation), undermining exploration in the Thompson bandit at the uniform prior — a real algorithmic bug, not just a style nit.
5. **`lumera` module vs `lumera-db.ts` dual table ownership** is the headline structural risk; the team mitigates it with byte-for-byte DDL mirroring, but that is a maintenance landmine.
6. **Gating respects the non-negotiables:** dynamic pricing (`would_apply:false`), vendor order submission (`VENDOR_LIVE_MODE && AUTO_SUBMIT_VENDOR_ORDERS`), publish (`AUTO_PUBLISH_APPROVED`), and PayPal production money-honesty are all genuinely gated — the "no autonomous money movement" rule is enforced in code, not just documented.

**Env vars consumed across this scope:** `DATABASE_URL`, `REDIS_URL`, `NODE_ENV`, `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_MANUAL_CAPTURE`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV`, `PRICING_COST_RATIO`, `PRICING_MIN_MARGIN`, `REWARDS_EARN_RATE`, `VENDOR_LIVE_MODE`, `AUTO_SUBMIT_VENDOR_ORDERS`, `AUTO_PUBLISH_APPROVED`, `LUMERA_FLAT_SHIPPING_USD`, `SUPPLIER_MARGIN_FLOOR`, `MAX_SHIPPING_DAYS`, plus per-vendor `*_TOKEN`/`*_WEBHOOK_SECRET` and radar `OXYLABS_USER`/`APIFY_TOKEN`/`LUMERA_RADAR_*`.

**DB tables owned by this scope:** `signal_event`, `visitor_profile`, `recommendation`, `product_embedding` (raw/migration), `drop`, `membership_tier`, `membership`, `credit_wallet`, `credit_transaction`, `gift_card`, and the `lumera_*` family (`vendor_connection`, `product_candidate`, `approval_request`, `vendor_order`, `vendor_webhook_event`, `return_case`, `product_design`) plus the shared `agent_run`.

Relevant absolute paths: `/home/user/Clouds-bruh/apps/backend/medusa-config.ts`, `/home/user/Clouds-bruh/apps/backend/src/lib/lumera-db.ts`, `/home/user/Clouds-bruh/apps/backend/src/lib/lumera-order-routing.ts`, `/home/user/Clouds-bruh/apps/backend/src/lib/security.ts`, `/home/user/Clouds-bruh/apps/backend/src/subscribers/order-placed.ts`, and `/home/user/Clouds-bruh/apps/backend/src/modules/{signal,personalization,recommendation,drops,monetization,lumera,lumera-fulfillment,lumera-payment-paypal}/`.


---

## 6. Backend — API Routes, Workflows, Jobs, Subscribers, Lib

This section documents the Medusa v2 backend application at `apps/backend` (package `0.1.0`, `@medusajs/framework@^2.15.5`, `@medusajs/medusa@^2.15.5`). Scope: `src/api/**`, `src/workflows/**`, `src/jobs/**`, `src/subscribers/**`, `src/lib/**`, `src/api/middlewares.ts`, and `medusa-config.ts`. The custom Medusa **modules** (`signal`, `personalization`, `recommendation`, `drops`, `monetization`, `lumera`, payment/fulfillment providers) are out of scope here and documented elsewhere; this section covers everything that wires those modules to the outside world.

A defining architectural fact: **two parallel data layers coexist.** The route layer mostly bypasses the native Medusa `lumera` module and talks to Postgres directly via raw `pg.Pool` in `src/lib/lumera-db.ts` (the canonical DDL + runtime source of truth), `src/lib/reviews-db.ts`, and inline pools in several route files. The native `src/modules/lumera` is described in code as "a typed scaffold that is not wired into any route." This is a deliberate but notable smell — schema is defined in code in `ensureLumeraTables()` and created lazily on first request rather than through Medusa migrations.

---

### 6.1 Configuration — `medusa-config.ts`

`apps/backend/medusa-config.ts` is the boot contract. Key behaviors:

- **Fail-hard production guard (top of file).** Before `defineConfig`, when `NODE_ENV==='production'` it asserts `JWT_SECRET, COOKIE_SECRET, DATABASE_URL, STORE_CORS, ADMIN_CORS` are all set and `throw`s a fatal error listing any missing — refusing to boot on insecure localhost defaults. Good. Note: in non-production, `jwtSecret`/`cookieSecret` fall back to the literal `'supersecret'`.
- **Admin toggle.** `admin.disable` driven by `MEDUSA_ADMIN_DISABLED==='true'` (for worker processes).
- **Env-gated modules.** Redis event-bus + workflow-engine are added **only** when `REDIS_URL` is set; otherwise Medusa uses in-memory defaults so `db:migrate`/seed/boot work without Redis. Custom modules always loaded: `drops, signal, personalization, recommendation, monetization, lumera`.
- **Payment providers.** `pp_system_default` always on. Stripe (`@medusajs/medusa/payment-stripe`, id `stripe`) added only when `STRIPE_API_KEY` present, using `webhookSecret: STRIPE_WEBHOOK_SECRET`, `capture: STRIPE_MANUAL_CAPTURE !== 'true'` (auto-capture default), `automaticPaymentMethods: true`. PayPal (custom `./src/modules/lumera-payment-paypal`, id `paypal`) added only when `PAYPAL_CLIENT_ID` present; env `sandbox`/`live` from `PAYPAL_ENV`. **The comment here is important:** Medusa's *native* Stripe webhook route `{BACKEND_URL}/hooks/payment/stripe_stripe` is what actually drives authorize/capture idempotently; the custom `/hooks/stripe` route (§6.4) is "audit-recording only."
- **Fulfillment.** `fulfillment-manual` (id `manual`, default) + custom `./src/modules/lumera-fulfillment` (id `dropship`). Live supplier submission gated by `VENDOR_LIVE_MODE`+`AUTO_SUBMIT_VENDOR_ORDERS`.
- **File storage.** S3/MinIO (`file-s3`) **only** when `S3_FILE_URL && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY` are all present (`forcePathStyle:true` for MinIO); otherwise `file-local` (`upload_dir: 'static'`). Deliberately refuses to half-boot S3 on a partial config.

Env consumed: `DATABASE_URL, REDIS_URL, STORE_CORS, ADMIN_CORS, AUTH_CORS, JWT_SECRET, COOKIE_SECRET, STRIPE_API_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_MANUAL_CAPTURE, PAYPAL_CLIENT_ID/SECRET/ENV, S3_*, MEDUSA_ADMIN_DISABLED, MEDUSA_BACKEND_URL`.

---

### 6.2 Middlewares — `src/api/middlewares.ts`

`defineMiddlewares` registers five route rules:

1. `/store/*` → `rateLimit()` (per-IP limiter, §6.6).
2. `/store/monetization/wallet` `[GET]` → `authenticate('customer', ['bearer','session'])`.
3. `/store/monetization/entitlements` `[GET]` → `authenticate('customer', ['bearer','session'])`.
4. `/admin/lumera/*` → `rateLimit({ max: RATE_LIMIT_OPS_MAX ?? 120 })`.
5. `/hooks/stripe` and `/hooks/vendor/*` → `bodyParser: { preserveRawBody: true }` so signature verification can hash the exact bytes.

**Security read.** The wallet/entitlements authentication is the IDOR fix: those handlers read `req.auth_context.actor_id` rather than a query param. **Gap:** `/store/rewards` (§6.3) exposes the same balance + lifetime-earned + membership-tier data keyed off an arbitrary `?customer_id=`/`?visitor_id=` with **no** `authenticate` rule and no auth in the handler — a residual IDOR/PII-leak that the wallet/entitlements lockdown did not cover. Also note `/admin/lumera/*` is rate-limited but its **auth** comes from two independent layers: Medusa's framework-level admin authentication (all `/admin/*` routes require an admin session/API token by default) **plus** the in-handler `authorizeOps` COCKPIT_KEY check. By contrast `/store/cockpit*` lives under `/store/*` (no framework auth) so COCKPIT_KEY is the *sole* gate there.

---

### 6.3 Store API routes — `src/api/store/**`

All store routes are publishable-key/anonymous by default (Medusa store scope), behind the IP rate limiter. Handlers resolve custom modules via `req.scope.resolve(MODULE)`.

**SIGNAL ingestion**
- `store/signal/route.ts` — `POST` (unauthenticated, fired on every storefront interaction) and `GET`. Exports `validateSignal(raw)`, a strict validator: body must be an object; `type` must be in the shared `EVENT_TYPES` set; `visitor_id` required and ≤256 chars; all string fields capped at `MAX_FIELD=256`; context capped at `MAX_CONTEXT_KEYS=16`. `POST` first enforces a body-size guard `MAX_BODY_BYTES=16384` (prefers `Content-Length`, falls back to `Buffer.byteLength`) → `413`; then validates → `400`; then `signal.ingest(event)` + `mind.observe(event)` (real-time personalization) → `202`. `GET ?visitor_id=` returns the visitor profile (anonymous, visitor-keyed). This is a strong validation surface — the main untrusted write path into MIND/ORACLE.
- `store/signal/identify/route.ts` — `POST { visitor_id, customer_id }` → `mind.identify(...)` merges anon→customer. Both fields required → `400`.

**Recommendations / personalization**
- `store/recommendations/route.ts` — `GET ?visitor_id=&strategy=for_you&limit=12` → `oracle.forVisitor(...)`. No validation on `strategy`/`limit` beyond `Number()`.
- `store/recommendations/attribute/route.ts` — `POST { rec_id, kind, visitor_id, block }`; `kind` must be `click|convert`; calls `oracle.attribute` and, on convert, `oracle.reward`. Both wrapped in `.catch(()=>{})`.
- `store/broadcast/route.ts` — `GET ?visitor_id=` builds the personalized homepage: pulls prefs, fans out 6 ORACLE strategies + live drops via `Promise.all`, filters empty blocks, then `oracle.rankBroadcastBlocks` (bandit) orders the rest with the followed rail pinned first.
- `store/preferences/route.ts` — `GET`/`POST ?visitor_id=`. `POST` caps arrays at 50 and only accepts the 5 known chapter strings (`stillness, armor, signal, altar, relentless`) — good DoS/injection hygiene.
- `store/pricing/route.ts` — `GET ?product_id=` → `oracle.dynamicPrice(...)`. **Explicitly read-only**: never mutates catalog price (applying a price change is a founder escalation). 400/404/500 handled.

**Catalog / search**
- `store/search/route.ts` — `GET ?q=&limit=8` (limit clamped to 24). **Own `pg.Pool`.** Hybrid search: exports `CHAPTER_HINTS`, `CHAPTERS`, `queryVector(q)` (maps keywords → a 5-dim chapter vector). SQL blends a keyword lane (`title ILIKE $1`) with a pgvector cosine lane over `product_embedding.embedding <=> $2::vector`, weighted `0.6*keyword + 0.4*vector`. Parameterized. Returns results + chapter facets + reason labels.
- `store/drops/route.ts` — `GET ?status=` → `dropsModule.listDrops`. Resolves module by string `'drops'`.
- `store/product-truth/[handle]/route.ts` — `GET` → `productTruthByHandle(handle)` (§6.6); 404 if none.
- `store/shipping-estimate/route.ts` — `POST { items[], max_days }` → `shippingPromise(maxDays)`; derives max lead time from items.

**Conversational concierge**
- `store/shepherd/route.ts` — `POST` SHEPHERD/"Polaris" advisory chat. Input validation: `MAX_MESSAGES=20`, `MAX_TEXT=4000`, filters to valid `{role:user|assistant, content:string}`. Grounds the system prompt in live drops, caps history to the last 10 turns, calls `llmChat({maxTokens:400})` (§6.6). On `!live` falls back to an on-brand scripted `mockReply`. The system prompt hard-codes advisory-only behavior (never places orders/moves money/changes price). Token-cost/prompt-abuse controls are present.

**Reviews**
- `store/reviews/route.ts` — `GET ?product_id=` → `{reviews, stats}`. `POST` validates via `validateReviewInput`, then enforces the **verified-purchase gate**: `reviewsRequireVerifiedPurchase()` + `verifyReviewPurchase(email, order_id, product_id)` → `decideReviewAcceptance` → `403` if required-but-unverified. `verified` is forced false from client input. Strong anti-fake-review posture (§6.6 reviews-db).

**Monetization (money-minting sensitive)**
- `store/monetization/credits/route.ts` — `POST { customer_id, amount, ref }` purchase Lumens. **Guarded by `mintingBlocked()`** → `403` in real-money mode.
- `store/monetization/gift-cards/route.ts` — `POST` issue (`mintingBlocked()` → 403) **or** redeem (`{redeem, code, customer_id}`).
- `store/monetization/subscribe/route.ts` — `POST { customer_id, tier_key }`; `mintingBlocked()` → 403. Grants Patron/Disciple entitlements.
- `store/monetization/tiers/route.ts` — `GET` public list of active tiers.
- `store/monetization/wallet/route.ts` — `GET` balance + last-20 ledger for `req.auth_context.actor_id` (auth enforced in middleware; handler 401s if no actor). **IDOR-safe.**
- `store/monetization/entitlements/route.ts` — `GET` entitlements for `actor_id` (auth-bound). **IDOR-safe.**
- `store/rewards/route.ts` — `GET ?customer_id=|visitor_id=` → `rewardsSummary(id)` returning `balance, lifetime_earned, reward_tier, membership_tier, multiplier, next_tier, credits_to_next`. **No auth, arbitrary id → IDOR/PII leak (the same class the wallet route was fixed for).** Flag for the reviewer.

**Guest self-service**
- `store/order-lookup/route.ts` — `POST { order_no, email }` guest "track my order." Requires **both**; returns only safe fields (number, date, item titles/qty); uniform not-found message to prevent enumeration. Read-only, never throws.
- `store/newsletter/route.ts` — `POST { email, source }` capture. Owns the list (best-effort DB write) then notifies Klaviyo. Always 200 on valid email (no existence leak). Returns `{ok, stored}`.
- `store/rma/route.ts` — `POST { order_id?, email?, reason? }` return intake; requires one of order_id/email → `createReturnCase`. 202 on success, 500 on persistence failure.

**Cockpit & BI (internal ops, COCKPIT_KEY-gated — note these are under `/store`, so COCKPIT_KEY is the sole gate)**
- `store/cockpit/route.ts` — `GET` Founder's Cockpit. **Own pool**, all queries run inside `BEGIN READ ONLY` transactions via helper `q()`, each `.catch()`-degraded to empty/zero so missing tables never 500. Reads latest `operator` agent_run, the `awaiting_approval` inbox (with `pending_actions` via `to_jsonb()` for pre-migration safety), recent runs, 7d audits, drop status, 7d signals, newsletter count, and a **business-KPI block**: revenue 7d/30d (line-item truth: latest `order_item` version per order joined to `order_line_item.unit_price × quantity`, integer cents), order count 30d, AOV, return rate, top products by signal engagement, low-stock live drops. `integrationStatus()` appended.
- `store/cockpit/approvals/route.ts` — `POST { run_id, decision, action_index }` resolves an escalated agent action. **This is the central money-minting/destructive-action gate.** Approve path: requires `REDIS_URL` (503 otherwise); reads the run's stored `pending_actions` (via `to_jsonb`), selects the action with `selectPendingAction` (§6.5) — **executes ONLY what the agent itself proposed, never client-supplied tool/input** — guards against double-dispatch with `UPDATE ... WHERE status='awaiting_approval'` (409 on concurrent), then `xadd`s an `approval` job onto the `lumera:agent-jobs` Redis stream. Reject path: marks `outcome='rejected_by_founder'`, nothing runs (404 if not found/already resolved). This design correctly prevents the approval endpoint from becoming an arbitrary-tool-execution API behind one shared key.
- `store/analyst/route.ts` + `store/analyst/bi.ts` — `GET ?q=` / `POST {question}` natural-language BI. `bi.ts` holds a fixed `QUERIES` array (keyword→canned SQL), `matchQuery` (keyword-overlap scoring, **defaults to QUERIES[0] on no match**), `buildInsight`, `buildChart`. The route runs the matched SQL in `BEGIN READ ONLY`. **Critical safety property:** SQL is never built from user text — only a fixed canned statement is selected — so there is no SQL injection here despite the "ask anything" surface.

All three cockpit/analyst routes call `authorizeOps(req,res)` first.

**Top-level**
- `api/unsubscribe/route.ts` — `GET ?token=` one-click CAN-SPAM unsubscribe, deliberately **outside** `/store` and `/admin` so an email-client GET needs no publishable key/login. Verifies the HMAC token (`verifyUnsubscribeToken`), records suppression (`recordUnsubscribe`, best-effort), returns a branded `noindex` HTML page. Cannot be forged to unsubscribe someone else (token is HMAC over the address).

---

### 6.4 Webhook handlers — `src/api/hooks/**`

All four parse `req.rawBody` (preserved by middleware), verify signature, and return `401` on failure with the verification `proof` string. Verification logic lives in `lumera-db.ts` (§6.6).

- `hooks/stripe/route.ts` — `POST`. `verifyStripeWebhook(rawBody, stripe-signature)` → 401 if invalid → `recordWebhook('manual', type, body)` → `202`. **Audit-only**: it records the event but does not drive payment state (that is Medusa's native `/hooks/payment/stripe_stripe`). Note the vendor recorded is `'manual'` here.
- `hooks/vendor/cj/route.ts`, `hooks/vendor/printful/route.ts`, `hooks/vendor/printify/route.ts` — `POST` each: `verifyVendorWebhook(vendor, body, headers, rawBody)` → 401 → `recordWebhook(vendor, ...)` → `processVendorWebhook(vendor, body)` → `202`. They differ only in how `eventType` is derived (`type`/`eventType`/`x-printify-event` header). `processVendorWebhook` updates the matching `lumera_vendor_order` row with status + tracking number/url from a wide set of payload shapes.

**Security read (decisive — `verifyVendorWebhook` / `verifyStripeWebhook`):**
- **Fail-closed in production when no secret is configured** — both return `{valid:false, proof:'missing_secret_in_production'}` when `NODE_ENV==='production'` and the per-vendor secret is unset. In non-prod they "accept-and-flag" (`unsigned_no_secret_configured`) so dev/CI works. This is the correct posture.
- Signatures compared with `crypto.timingSafeEqual` via `safeEqual` (length-checked first).
- Stripe verification implements the real scheme: parses `t=` and `v1=` from the header, enforces a **300s timestamp tolerance** (replay window), and HMACs `${t}.${rawBody}`.
- **Smell:** `verifyVendorWebhook` HMACs the raw body but accepts the signature from **any** of `x-printify-hmac-sha256 | x-pf-signature | x-cj-signature | stripe-signature | x-lumera-signature` (first present wins), and uses a single per-vendor secret. Because each vendor route passes its own `vendor`, the secret is correct per route, but the header is not pinned to the vendor — a minor robustness/clarity gap, not an exploitable bypass (the secret still must match). Also, each real vendor signs slightly differently (Printify/Printful/CJ have provider-specific canonicalization); this generic "HMAC-SHA256 over raw body" may not match every provider's actual scheme in live mode — worth verifying against vendor docs before turning `*_WEBHOOK_SECRET` on. `lumera-webhook.test.ts` covers the happy/missing/invalid/prod-fail-closed cases for the generic scheme.

---

### 6.5 Approvals helper — `src/lib/approvals.ts`

Pure, DB-free. `selectPendingAction(pendingActions, index=0): PendingAction | null`. Returns null unless `pendingActions` is an array, the indexed element is an object, and `.tool` is a non-empty string; `input` defaults to `{}`. The cockpit approval route **must refuse** when this returns null rather than fall back to client input — the documented invariant that keeps "approve" from becoming arbitrary tool execution. Unit-tested in `approvals.test.ts`.

---

### 6.6 Lib helpers — `src/lib/**`

**`security.ts`** — OWASP-aligned defensive utilities.
- `rateLimit(opts)` — in-memory per-IP token bucket (`Map<ip,{count,resetAt}>`). Client IP from `x-forwarded-for[0]` then socket. **Auto-disabled under `NODE_ENV=test` or `RATE_LIMIT_DISABLED=true`**; tunable via `RATE_LIMIT_WINDOW_MS` (60s) / `RATE_LIMIT_MAX` (240). On limit → `429` + `Retry-After`. A `setInterval(...).unref()` sweeps expired buckets. **Limitation (documented):** in-memory/per-process, so multi-instance deploys need a Redis-backed limiter; trusting `x-forwarded-for` is only safe behind a trusted proxy.
- `mintingBlocked()` — **the money-minting gate.** Returns true (refuse) when real-money mode (`NODE_ENV==='production'` + a live, non-`sk_test` `STRIPE_API_KEY`) AND `MONETIZATION_ALLOW_UNPAID_ISSUE !== 'true'`. Consumed by credits/gift-cards/subscribe routes. The honest caveat in-code: issuance is **not yet payment-bound**; this gate just refuses unpaid minting in production rather than tying issuance to a captured payment.
- `paymentSimulationAllowed()` — true only outside production; the "money-honesty invariant" used by payment providers (a simulated success may never be reported in prod).
- `assertSafeOutboundUrl(raw, allowHosts?)` — SSRF guard: rejects non-http(s), loopback/link-local, `127./10./192.168./169.254./172.16-31.` private ranges, a `BLOCKED_HOSTS` set incl. `169.254.169.254` and `metadata.google.internal`, and optional host allowlist. (IPv6 private ranges beyond `::1` are not enumerated — a gap if scraped URLs can resolve to IPv6.)
- `fetchWithTimeout(input, init, 10_000)` — always attaches an `AbortSignal.timeout`.

**`lumera-auth.ts`** — `authorizeOps(req,res): boolean`. Header-only `x-cockpit-key` exact match against `COCKPIT_KEY` (never query string). **Fails closed** when no key configured AND (`NODE_ENV==='production'` OR `COCKPIT_REQUIRE_KEY==='true'`). Opens only on genuine local/dev. This is a single shared static key (no rotation, no per-user identity, no audit of who approved) — acceptable for a founder-only ops surface but worth noting for the audit. Constant-time comparison is **not** used here (plain `!==`), a minor timing concern for a static secret.

**`lumera-db.ts`** (553 lines) — the raw data spine. Singleton `pool()` (`DATABASE_URL` or a hardcoded `postgres://alterxiv:alterxiv@localhost...` dev default). Key exports:
- `ensureLumeraTables()` — idempotent DDL for `lumera_vendor_connection, lumera_product_candidate, lumera_approval_request, lumera_vendor_order, lumera_vendor_webhook_event, lumera_return_case, lumera_product_design` (each with nullable `deleted_at` to mirror the module migration). **Called on virtually every request** (lazy schema creation). Tables: `lumera_product_candidate.handle` is `unique`; `lumera_approval_request.candidate_id` FKs candidate with `ON DELETE CASCADE`.
- `ensureAgentRunTable()` — creates `agent_run` (+ `pending_actions` column via `ADD COLUMN IF NOT EXISTS`) "byte-for-byte in sync" with the intelligence service's Ledger, so the backend drop-grader can write proposals on a fresh DB.
- `vendorConnections()` / `persistVendorConnections()` — derive per-vendor capability from env presence; persist via upsert. `connection()` sets `can_publish = connected && id!=='radar' && AUTO_PUBLISH_APPROVED!=='false'` and `can_submit_orders = connected && liveCapable && orderCapable`. Vendors: printify, printful, cj, spocket, syncee, modalyst, dropified, manual, radar. CJ live requires `CJ_SANDBOX!=='true'`.
- `seedCurationCandidates(force)`, `upsertCandidate` (runs `attachReview` scoring against `marginFloor()`/`maxShippingDays()`), `listCandidates(status?)` (ordered by a status CASE then score), `getCandidate`, `setCandidateStatus` (also writes an `lumera_approval_request` audit row).
- `discoverAndIngestRadar(queries?)` — pulls from the configured radar source (`LUMERA_RADAR_SOURCE` aliexpress default) via shared `radarDiscover`; **no-op when `radarConfigured()` is false** (fixture-safe); per-query and per-candidate failures `captureException`'d and swallowed.
- `recordWebhook`, `verifyVendorWebhook`, `verifyStripeWebhook` (see §6.4), `processVendorWebhook` (updates `lumera_vendor_order` by `id OR vendor_order_id`, merging tracking into jsonb `payload`; re-throws after `captureException`).
- `createReturnCase`, `productTruthByHandle` (candidate first, else queries the Medusa `product` table for `metadata.lumera_truth`), `shippingPromise` (sets `requires_delay_consent` when window > 30 days), `bestConfiguredVendor`, `connectedVendorIds`, `safeEqual` (timing-safe).

All SQL is parameterized. The pervasive `ensureLumeraTables()`-on-read pattern adds a query per request and risks masking real migration drift — flag for the reviewer.

**`lumera-publish.ts`** — `publishCandidateToMedusa(candidate, publish)` pushes a candidate to the **Medusa Admin REST API** (`POST {BACKEND_URL}/admin/products`, Bearer `MEDUSA_ADMIN_API_TOKEN`/`MEDUSA_ADMIN_TOKEN`). `publishBlockers()` enforces launch safety: score/compliance blockers, status not in `{ready_for_review,approved,published,live}`, `media_rights` unknown/blocked, `gross_margin < SUPPLIER_MARGIN_FLOOR (0.38)`, `lead_time_days > MAX_SHIPPING_DAYS (12)`, unverified manual supplier, and **`stripe_still_test_mode`** (VENDOR_LIVE_MODE on but Stripe still `sk_test`). Missing admin token → returns `blocked` with the generated payload (does not publish). `findExistingLumeraProduct` dedups by `metadata.lumera_candidate_id` → `supplier_sku` → `handle` (update vs create). `buildProductPayload` maps variants/options/prices (USD cents) + rich metadata incl. `lumera_truth`. Failures `captureException`'d. **Self-call to its own admin API requires a real admin token** — the SSRF guard is intentionally not applied (trusted self-call).

**`lumera-order-routing.ts`** — `vendorOrderDraftsFromOrder(order)` groups order items by resolved vendor and produces `VendorOrderDraft`s with status `blocked_missing_supplier_sku | ready_for_vendor_submission | staged_for_approval` (live only when `VENDOR_LIVE_MODE && AUTO_SUBMIT_VENDOR_ORDERS`). `vendorForItem` respects an explicit `metadata.fulfillment_provider/vendor/lumera_truth.fulfillment_provider/order.metadata` assignment, else routes via shared `selectFulfillmentVendor({connected})`; `normalizeVendor` coerces unknown/`radar` → `manual`. `persistVendorOrderDrafts` upserts into `lumera_vendor_order` (record id `lvo_{orderId}_{vendor}`, sanitized, ≤120 chars). Consumed by the `order.placed` subscriber.

**`llm.ts`** — provider-flexible concierge helper (no SDK; raw `fetch`). `selectLlmProvider(env)`: `openai_compat` when `LLM_BASE_URL && LLM_API_KEY`; else `anthropic` when `ANTHROPIC_API_KEY` is set and not the `sk-ant-...` placeholder; else `none`. `llmChat(opts)` **never throws** — network/parse failures and `none` all resolve to `{text:'', live:false}`. 15s timeout. Models: `LLM_MODEL`/`gpt-4o-mini`, `CLAUDE_MODEL`/`claude-opus-4-8`, optional `SHEPHERD_MODEL` override. Anthropic call uses `anthropic-version: 2023-06-01`, `x-api-key`. Note the helper hits the Anthropic HTTP API directly rather than the `@anthropic-ai/sdk` used by the agent runtime.

**`email.ts`** — Resend transactional + Klaviyo events, env-gated. `sendEmail()` no-ops `{sent:false, reason:'no_api_key'}` without `RESEND_API_KEY`; sender from `NOTIFICATION_EMAIL_FROM`. `trackKlaviyoEvent()` no-ops without `KLAVIYO_API_KEY` (`KLAVIYO_API_REVISION` default `2024-10-15`). Renderers `renderOrderConfirmation`, `renderShipmentNotification`, `renderAbandonedCart`, `renderReviewRequest` build dark-editorial HTML with **`escapeHtml` on all interpolated values** (XSS-safe) and `money()` (Intl, cents÷100). Marketing renderers append `marketingFooter` (CAN-SPAM); transactional ones deliberately do not.

**`email-compliance.ts`** — CAN-SPAM. `unsubscribeToken(email) = base64url(email).hmac` where `sign()` HMAC-SHA256s with `UNSUBSCRIBE_SECRET || COCKPIT_KEY || 'lumera-dev-unsubscribe-secret'` (truncated to 24 chars base64url). `verifyUnsubscribeToken` length-checks then `timingSafeEqual`s, decodes, and re-validates the email shape. `marketingAllowed()` requires `COMPANY_POSTAL_ADDRESS` in production (else allows in non-prod with a placeholder footer). `unsubscribeUrl` targets `MEDUSA_BACKEND_URL || BACKEND_URL || 'https://lumeralabel.com'`. **Smell:** the dev-fallback secret and the 24-char HMAC truncation weaken the token if `UNSUBSCRIBE_SECRET`/`COCKPIT_KEY` are unset in production; impact is limited (worst case: forge an unsubscribe for a known address), but production should set a strong dedicated secret.

**`newsletter.ts`** — `normalizeEmail` (conservative regex, length 5–254, rejects `..`), `saveSubscriber` (upsert, re-subscribe clears `unsubscribed_at`), `recordUnsubscribe` (upsert sets `unsubscribed_at`), `isSuppressed`. Lazy `ensureTable()` creates `lumera_newsletter_subscriber (email pk, source, created_at, unsubscribed_at)` and back-fills the column via `ADD COLUMN IF NOT EXISTS`; caches the ensure-promise but clears it on failure. All DB ops best-effort (false on error).

**`order-lookup.ts`** — `validateLookup` (PURE: order_no `^\d{1,12}$`, valid email) + `findGuestOrder` (joins `order`→`order_item`→`order_line_item` by `display_id` + lower(email), returns only titles/qty; best-effort → `{found:false}`). Anti-enumeration by design.

**`reviews-db.ts`** — own pool + own `lumera_review` table (`rating CHECK 1..5`). PURE helpers `validateReviewInput` (forces `verified:false` from client), `computeReviewStats`, `reviewsRequireVerifiedPurchase` (default **required in production**, overridable via `REVIEWS_REQUIRE_VERIFIED_PURCHASE`), `decideReviewAcceptance`. `verifyReviewPurchase(email, orderRef, productId)` confirms the buyer via `order/order_item/order_line_item` join by lower(email)+product_id+(`order.id` OR `display_id`); best-effort → false. DB ops parameterized. FTC fake-review exposure is addressed at the policy layer.

**`shipping-rates.ts`** — gated, fixture-safe carrier rating. `shippingRatesConfigured()` (EasyPost or Shippo). `getLiveShippingRate` precedence EasyPost→Shippo→null; **zero network calls and `null` when unconfigured**; every call try/caught to null (never throws). EasyPost uses HTTP Basic (key as username); Shippo `async:false` inline rates; both pick the cheapest rate, convert dollars→cents. Origin from `SHIP_FROM_POSTAL/COUNTRY`.

**`channel-sync/`** — outbound multi-channel (Shopify/WooCommerce/Etsy/Amazon). `index.ts` (`channelAdapter`, `allChannelAdapters`, `channelConnections`), `sync.ts` (`syncCandidateToChannels` — **hard-gated by `CHANNEL_LIVE_MODE`**: returns honest `gated`/`skipped` and never fabricates a live listing unless live mode is on AND the channel `can_list`), `clients.ts` (`BaseChannelAdapter`: `canListLive() = isConfigured && CHANNEL_LIVE_MODE==='true'`; mutations route through `listingGate` which returns `fixture_not_connected`/`gated` otherwise). **Note:** grep confirms `syncCandidateToChannels`/`channelConnections` are **not referenced by any route, job, or subscriber** in this scope — currently dead code / staged capability. Flag for the reviewer.

**`integrations.ts`** — `integrationStatus(env)` reports **configured-or-not (presence only, never the secret)** for anthropic/stripe/paypal/email/redis/storage/radar/imagery/vendors; consumed by the cockpit. Anthropic placeholder `sk-ant-...` treated as unset.

**`observability.ts`** — SDK-free Sentry. `parseSentryDsn` → ingest URL + auth header; `captureException`/`captureMessage` build an envelope and **fire-and-forget POST** (never awaited, rejections swallowed); full no-op when `SENTRY_DSN` unset. Error reporting can never become a new failure source on the critical path. Used across lumera-db/publish/order-placed.

---

### 6.7 Scheduled jobs — `src/jobs/**`

All export `{ name, schedule }` (cron) and a default async handler. Uniform safety posture: feature-flag default OFF, no-op without `DATABASE_URL`, never throw out of the scheduler.

- `jobs/abandoned-cart.ts` — hourly (`0 * * * *`). Gated `ABANDONED_CART_ENABLED==='true'`; also requires `marketingAllowed()` (CAN-SPAM postal address in prod). Uses `findAbandonedCarts` + PURE `isCartEligible`, honors `isSuppressed` (unsubscribe), sends one recovery email, stamps dedup regardless of provider keying, fires Klaviyo. Counters logged.
- `jobs/review-request.ts` — daily `0 10 * * *`. Same posture; `REVIEW_REQUEST_ENABLED`, `marketingAllowed()`, `findReviewableOrders` + PURE `isReviewEligible`, **permanent** dedup via `order.metadata.review_request_at`, suppression-aware.
- `jobs/drop-grader.ts` — daily `0 11 * * *`. Gated `DROP_GRADER_ENABLED`. **Deterministic LATR last mile** — runs with no Anthropic key: `readLiveDrops` → shared `planDropActions` → for each proposal not already open (`openProposalDropIds` dedup) → `insertProposalRun(buildProposalRun(...))` writes an `awaiting_approval` `agent_run` row into the founder inbox. No autonomous action — every proposal requires founder approval via the cockpit (closes the loop with §6.3 approvals).
- `jobs/daily-curation.ts` — daily `0 6 * * *`. Enqueues an `agent:curator` job onto the `lumera:agent-jobs` Redis stream (the intelligence app does the work). No-op (log only) without `REDIS_URL`.

**`drop-grader.ts` lib** backs the job: `readLiveDrops` (fixture-safe), PURE `buildProposalRun` (id `crypto.randomUUID()`, `decisions[0]` begins `ESCALATE →` so the cockpit derives the inbox reason, `pending_actions:[{tool,input}]` drives Approve&Execute), `openProposalDropIds` (dedup on `input->>'drop_id'` + `source='drop-grader'`), `insertProposalRun` (best-effort, calls `ensureAgentRunTable` first).

---

### 6.8 Event subscribers — `src/subscribers/**`

All export `config: SubscriberConfig`. Two subscribers bind the **same** `order.placed` event (independent handlers).

- `subscribers/order-placed.ts` (`event: 'order.placed'`) — the critical commerce-side handler. Resolves the order (items + metadata), decrements `units_remaining` for any live drop containing purchased product ids (`consumeUnits(..., {allowPartial:true})` — post-order accounting, floors at 0, never blocks), grants Luminance credits (`monetization.awardForPurchase`, keyed to `customer_id` else `metadata.visitor_id`; Patron earns 2×), persists vendor-order drafts (`persistVendorOrderDrafts`, §6.6), and ingests a canonical `purchase` SignalEvent (uses `satisfies SignalEvent` so chapter stays inside `context`). Whole body try/caught with `captureException`; sub-steps individually `.catch()`-guarded so one failure can't abort the rest. **Money note:** `awardForPurchase` mints loyalty credit on order placement with no payment-captured check here — Lumens are store value; whether placement (vs. capture) is the right trigger is worth the reviewer's scrutiny.
- `subscribers/order-confirmation-email.ts` (`event: 'order.placed'`) — deliberately separate so email never breaks the inventory/rewards path. Renders the brand confirmation, `sendEmail` (mock-until-`RESEND_API_KEY`), fires Klaviyo "Placed Order". Skips if no `order.email`.
- `subscribers/shipment-created.ts` (`event: 'shipment.created'`) — payload `{id, no_notification}` where `id` is the **fulfillment** id; resolves the owning order via the module-link graph (`query.graph({entity:'order', filters:{fulfillments:{id}}})`), honors `no_notification`, renders the shipped notice with tracking from the fulfillment label, sends + fires Klaviyo "Fulfilled Order". Never breaks fulfillment on a messaging failure.

---

### 6.9 Workflow — `src/workflows/place-drop-order.ts`

`placeDropOrder` — a compensatable Medusa workflow (`createWorkflow`) of three steps, each with a rollback:
- `reserve-units` — `drops.consumeUnits(dropId, qty)`; compensation returns units via `updateDrops`.
- `reserve-inventory` — **stubbed** (logs only; real reservation deferred to Medusa's inventory module); compensation logs a release.
- `notify-supplier` — inserts a `lumera_vendor_order` row with status `ready_for_vendor_submission` (only when `VENDOR_LIVE_MODE && AUTO_SUBMIT_VENDOR_ORDERS`) else `staged_for_approval`; payload always sets `live_submission_enabled:false` and returns `accepted:false`. Compensation flips the row to `cancel_staged`.

**Reader notes:** (1) `reserve-inventory` is a no-op stub — real inventory locking isn't implemented in this workflow, so overselling protection relies on the drops `consumeUnits` + the post-order subscriber path. (2) grep shows no route/subscriber invoking `placeDropOrder` within this scope — it appears to be a staged/demonstrative workflow rather than the live checkout path. Flag for the reviewer.

---

### 6.10 Cross-cutting security & risk summary

**Solid:** webhook signatures verified with timing-safe compare and **fail-closed in production**; Stripe replay tolerance; money-minting gated by `mintingBlocked()`; the approval endpoint executes only agent-proposed actions (no arbitrary tool exec); wallet/entitlements bound to `auth_context`; cockpit/BI/analyst gated by `authorizeOps` and run read-only canned SQL (no injection); rate limiting on `/store/*` and `/admin/lumera/*`; SSRF guard available; live vendor/channel/order submission gated behind explicit env flags; all marketing email CAN-SPAM-compliant with unforgeable unsubscribe; all interpolated email HTML escaped; observability fire-and-forget.

**Risks/smells to audit (most to least material):**
1. **`/store/rewards` IDOR** — returns balance/lifetime-earned/membership tier for any `customer_id`/`visitor_id` with no auth (the wallet/entitlements fix did not extend here).
2. **`/store/cockpit*` auth depends solely on `COCKPIT_KEY`** (under `/store`, no framework admin auth), a single static shared secret compared non-constant-time, no rotation/audit-of-actor. `/admin/lumera/*` additionally has Medusa admin auth.
3. **Generic vendor-webhook HMAC** may not match each provider's real signing scheme; the signature header isn't pinned per vendor (low exploit risk, real correctness risk in live mode).
4. **Lazy `ensureLumeraTables()`/`ensure*Table()` on read** instead of migrations — schema drift risk and per-request overhead; the native `lumera` module is unused scaffold.
5. **Loyalty credit minted on `order.placed`** (not payment capture) — store value granted before money is guaranteed.
6. **Unsubscribe HMAC** falls back to a dev constant and truncates to 24 chars if no dedicated secret is set in prod.
7. **In-memory rate limiter** is per-process (multi-instance bypass) and trusts `x-forwarded-for`.
8. **Dead/staged code in scope**: `channel-sync/*` and `workflows/place-drop-order.ts` aren't wired to any live entry point; `reserve-inventory` is a stub.
9. Hardcoded dev DB DSN default in `lumera-db.ts`/`reviews-db.ts` (`alterxiv:alterxiv@localhost`) — harmless in prod given the boot guard, but a footgun if `DATABASE_URL` is ever unset outside prod.

Test posture is meaningfully present (23 `*.test.ts` in scope, covering signal validation, webhook verification incl. prod-fail-closed, approvals selection, review acceptance, abandoned-cart/review eligibility, channel clients, BI, etc.), consistent with the project's "verified, not assumed" rule.


---

## 7. Storefront — The Broadcast (Next.js)

The storefront (`apps/storefront`) is a **Next.js App Router** application ("The Broadcast") that renders Lumera to shoppers. It talks to the Medusa backend over the `/store/*` (and a few `/admin/*`, `/auth/*`) HTTP APIs, never to the DB directly. It is anonymous-personalized on first paint (an edge-minted visitor id flows into server fetches), emits a SIGNAL event on essentially every meaningful interaction, and is defensive everywhere (a dark backend degrades to empty/quiet states, never a crash). All money is **integer cents end-to-end**, divided by 100 only at display.

### 7.0 Cross-cutting conventions and environment

**Two base-URL conventions coexist** (a real smell — see Risks):
- **Server components / route files** read `MEDUSA_BACKEND_URL` (server-only): `lib/catalog.ts`, `app/page.tsx`, `app/p/[handle]/page.tsx`, `app/search/page.tsx`, `app/chapter/[chapter]/page.tsx`, `app/drops/page.tsx`, `app/drop/[id]/page.tsx`, `app/sitemap.ts`, `app/cockpit/page.tsx`, `app/cockpit/actions.ts`.
- **Client components / client libs** read `NEXT_PUBLIC_MEDUSA_URL` (browser-exposed): `lib/api.ts`, `lib/signal.ts`, `lib/customer.ts`, `lib/gift-cards.ts`, `lib/wishlist-sync.ts`, `lib/recommendations.ts`, and most `components/*`.

Both default to `http://localhost:9000`. **Risk:** in production these must be set consistently; `lib/recommendations.ts` (client base) duplicates the same two functions (`getBroadcast`, `getRecs`) already in `lib/api.ts` and appears **unused/dead** (the home page uses its own inline `fetchBroadcast`). Also `lib/recommendations.ts` interpolates `visitorId` into the URL **without `encodeURIComponent`**, unlike every other call site.

**Full `NEXT_PUBLIC_*` / env inventory consumed by the storefront:**
- `NEXT_PUBLIC_MEDUSA_URL`, `MEDUSA_BACKEND_URL` — Medusa origin (client vs server).
- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` — sent as `x-publishable-api-key` on every store call.
- `NEXT_PUBLIC_SITE_URL` — canonical origin (falls back to `https://lumeralabel.com`).
- `NEXT_PUBLIC_SOCIAL_LINKS` — comma-separated `sameAs` for Organization JSON-LD.
- `NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD_USD` — free-shipping AOV ladder (0/unset = off).
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — gate the real payment rails.
- `NEXT_PUBLIC_CONSENT_REQUIRED` — GDPR consent gate (`!== 'false'` ⇒ required).
- `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_UMAMI_WEBSITE_ID`, `NEXT_PUBLIC_UMAMI_SRC`, `NEXT_PUBLIC_SENTRY_DSN` — analytics/monitoring.
- `COCKPIT_KEY` — **server-only** secret (sent as `x-cockpit-key`) gating the founder ops endpoints. Correctly *not* `NEXT_PUBLIC`.
- `NODE_ENV` — production gate for the secure cookie flag and the service worker.

**Cookies / client storage used:** `axiv_vid` (visitor id cookie, set by middleware, readable by JS — see §7.1), `axiv_sid` (sessionStorage), `axiv_cart` (localStorage cart id), `axiv_wishlist` (localStorage), `lumera_session` (httpOnly JWT cookie), `lumera_consent` (localStorage).

### 7.1 Edge identity, session, layout

**`src/middleware.ts`** — runs on all non-static routes (matcher excludes `_next/static`, `_next/image`, `favicon.ico`, `robots.txt`, `sitemap.xml`). If there is no `axiv_vid` cookie, it mints `crypto.randomUUID()` and sets it `httpOnly:false`, `sameSite:lax`, 1-year, path `/`. This is the keystone of **first-paint personalization**: server components read `axiv_vid` from `cookies()` and pass it to ORACLE so the SSR Broadcast is already personalized, and the client `signal` lib mirrors the same id. **Security note:** the comment explicitly justifies `httpOnly:false` so the client can read it; this is an anonymous behavioral id (not auth), so the exposure is acceptable, but it is trivially spoofable/clearable by the client (any recommendation/abuse logic on the backend must treat it as untrusted).

**`src/app/api/session/route.ts`** — `runtime = 'nodejs'`. The **only** place the customer JWT touches a cookie. Cookie name `lumera_session`, 30-day, `httpOnly:true`, `sameSite:lax`, `secure` only in production, path `/`. `GET` returns `{ token }`; `POST` validates the body is a non-blank string (else 400) and sets the cookie; `DELETE` clears it (maxAge 0). Storing the JWT httpOnly (not localStorage) is a deliberate XSS-hardening choice. **Edge cases:** the client `readToken()` helpers call this on mount and on every order/wishlist fetch; a token that is valid-shaped but expired is only detected when `/store/customers/me` 401s (then cleared). `secure:false` in non-prod means the cookie can ride plain HTTP locally (expected).

**`src/app/layout.tsx`** — root layout. Self-hosts fonts via `next/font/local` (Cormorant Garamond serif 300–600 + Inter variable) so production never depends on a runtime Google Fonts fetch. Exports `metadata` (with `metadataBase: new URL(SITE)`, title template `%s — Lumera`, OG/Twitter defaults) and `viewport` (themeColor `#0B0B0D`, dark scheme). Emits two JSON-LD blocks in `<head>` via `jsonLdScript`: `organization(...)` (name, url, slogan, `/icon.svg` logo, `sameAs` from `NEXT_PUBLIC_SOCIAL_LINKS`) and `webSite(...)` (the SearchAction box → `/search?q=`). Renders a `.skip-link` then nests the provider tree:

```
CustomerProvider → CartProvider → WishlistProvider → { SiteHeader, PageTransition(children), Footer, Shepherd, CommandPalette }
```

…followed by `ConsentBanner`, `Analytics`, `ServiceWorker`. The provider ordering matters: `WishlistProvider` consumes `useCustomer()` for sign-in sync, so it must be inside `CustomerProvider`.

### 7.2 Contexts (client state)

**`src/context/cart.tsx`** (`CartProvider`, `useCart`) — holds a raw Medusa `cart` object. `getOrCreateCart` reads `axiv_cart` from localStorage and re-fetches; on failure it drops the stale id and `createCart(regions[0].id)` (first region), persisting the new id. `add(variantId, productId, chapter)` lazily creates a cart, `addToCart` (qty defaults 1), sets state, and `signal('add_to_cart', productId, …, {chapter})`. `remove(lineItemId)` removes and `signal('remove_from_cart', lineItemId)`. `lineCount = cart.items.length`. **Edge cases / smells:** quantity is fixed at 1 — there is no quantity editor anywhere in the UI; `add` does **not** catch errors (the caller `AddToCartButton` does, but `RailCard.onAdd` does not, so a failed rail "Add" still flips to "Added ✓" optimistically). `remove` signals the *line item* id, not the product id (inconsistent with `add_to_cart`).

**`src/context/customer.tsx`** (`CustomerProvider`, `useCustomer`) — `{ customer, loading, login, register, logout }`. On mount, `readToken()` → `getCustomer(token)`; on any failure clears the cookie and stays signed-out (never throws). `finishAuth(token)` persists the token, **best-effort associates the guest cart** (`associateGuestCart`, never blocks), then loads the profile. Login/register/logout each fire a `signal('page_view', …, { surface: 'account_*' })` — explicitly noted because **the SIGNAL taxonomy has no dedicated auth event**, so auth is recorded as page_views (a real taxonomy gap to flag).

**`src/context/wishlist.tsx`** (`WishlistProvider`, `useWishlist`) — localStorage-first (`axiv_wishlist`), best-effort mirrored to `customer.metadata.wishlist` when signed in. All add/remove/toggle/merge logic delegates to the **pure, unit-tested reducer** in `lib/wishlist.ts`. On sign-in (`customer.id` changes, guarded by a `mergedFor` ref so it runs once per id), it `fetchRemote()`s, `merge`s (union, earliest-add wins, never lets an empty field clobber a populated one), writes local, and `pushRemote`s. `toggle`/`remove` write local, fire-and-forget `pushRemote` when signed in, and `signal('page_view', id, …, { surface: 'wishlist_add'|'wishlist_remove' })` — again, **no native wishlist SIGNAL event**, recorded as page_views. `ready` gates first paint so a saved heart never flashes unsaved.

### 7.3 `lib/` — data, money, SEO, identity helpers

- **`lib/api.ts`** (`'use client'`) — the client-side Medusa SDK surface. `apiFetch` always injects `x-publishable-api-key`; throws `${status} ${path}` on non-2xx. Catalog: `getProductsByIds`, `getProductByHandle`, `getBroadcast`, `getRecs`, `getRegions`. Cart/checkout: `createCart`, `getCart`, `addToCart`, `removeFromCart`, `getShippingOptions`, `getShippingEstimate`, `addShippingMethod`, `createPaymentCollection`, `initPaymentSession`, `completeCart`. **Payment-provider resolution helpers (security-relevant):** `PAYPAL_PROVIDER_ID = 'pp_paypal_paypal'`, `STRIPE_PROVIDER_ID = 'pp_stripe_stripe'`; `getPaymentProviders`/`paypalProviderAvailable`/`stripeProviderAvailable` (defensive: any failure → `false` → falls back to test flow); `paypalOrderIdFromCollection` / `stripeClientSecretFromCollection` parse the **server-issued** order id / client secret out of `payment_sessions[].data` (the browser never computes a charge amount). `hasStripeProvider` is a pure matcher (unit-tested in `stripe.test.ts`). Reviews: `getReviews` (returns `{reviews, stats}`, swallows errors → empty), `submitReview` (returns `{review}|{error}`). The provider matchers use a loose `id.includes('stripe'|'paypal')` fallback — convenient but could match an unexpected provider id.

- **`lib/catalog.ts`** (server) — `PRODUCT_FIELDS` includes `*variants.calculated_price`; the comment is explicit that **without a region context Medusa returns no prices** ("Price on request"). `getRegionId()` memoizes the first region id in a module-level `_region` (`cache: 'force-cache'`) — **a process-wide singleton**, fine for a single-region store but would pin the wrong region if multi-region. `priceCents`/`priceStr` are pure: prefer `calculated_price.calculated_amount`, else `prices[0].amount`, else null → `'Price on request'`.

- **`lib/signal.ts`** (`'use client'`) — the SIGNAL emitter. `visitorId()` prefers the `axiv_vid` cookie (so SSR and client agree), then localStorage, then mints. `sessionId()` is a sessionStorage UUID. `signal(type, entity_id?, value?, context={})` POSTs to `/store/signal` with `{ id, visitor_id, session_id, type, entity_id, value(stringified), context:{channel:'web',…}, ts }`, **`keepalive:true`** (survives navigation), and **swallows all errors** (`.catch(()=>{})`). `EventType` is imported from `@alterxiv/shared` — the cross-app contract.

- **`lib/customer.ts`** (`'use client'`) — Medusa v2 native auth. Documents the flow: register → `POST /auth/customer/emailpass/register` (token) → `POST /store/customers` (Bearer) ; login → `POST /auth/customer/emailpass`; `getCustomer` `GET /store/customers/me`; `listOrders` / `getOrder` with explicit `fields=` selections (orders include `*items`, `*fulfillments.labels`). Pure, unit-tested helpers: `authHeaders` (Bearer only when token non-blank), `formatMoney` (cents/100 via `Intl.NumberFormat`, em-dash on null, plain `$` fallback on bad currency), `orderNumber` (`#display_id` or last-8 of id), `statusLabel` (snake_case→Title Case), `trackingFor` (defensive across `fulfillments[].labels[]` and top-level `tracking_numbers[]`, de-duped). `associateGuestCart` POSTs an empty body to the cart with the Bearer token so Medusa attaches the customer — never throws.

- **`lib/wishlist.ts`** — pure reducer: `has`, `add` (idempotent, returns same ref on no-op, newest-first), `remove`, `toggle`, `parse` (hardened against every malformed shape — non-array, dupes, non-string ids), `merge`. `WISHLIST_KEY='axiv_wishlist'`. Stores only minimal display data.
- **`lib/wishlist-sync.ts`** (`'use client'`) — `fetchRemote`/`pushRemote` against `/store/customers/me?fields=id,metadata`, keyed under `metadata.wishlist` (`METADATA_KEY`). Never throws; relies on Medusa metadata-merge semantics.

- **`lib/gift-cards.ts`** — pure money helpers: `dollarsToCents` (rejects empty/NaN/≤0/over-precise, strips `$` and commas), `centsToUsd`, `normalizeCode` (trim+upper). `issueGiftCard`/`redeemGiftCard` POST to `/store/monetization/gift-cards`. `GIFT_CARD_PRESETS = [25,50,100,250]`. Minor smell: `IssueResult.issued:true` is declared but never read by the UI.
- **`lib/shipping-ladder.ts`** — pure `shippingLadder(cartTotalCents, thresholdUsdRaw?)` → `{enabled, thresholdCents, remainingCents, progress(0..1), message}`; env-driven, disabled when threshold ≤ 0.
- **`lib/useBehavior.ts`** (`'use client'`) — mounts once per page; on scroll emits `scroll_depth` at 25/50/75/100% (once each, value = the fraction), and on `pagehide`/unmount emits `dwell` (ms, only if > 800ms). Quiet by design.

- **`lib/jsonld.ts`** — pure SEO builders. **`jsonLdScript` is a security control:** it escapes `<` (→`\u003c`) and U+2028/U+2029 before `dangerouslySetInnerHTML`, explicitly to stop a scraped supplier title containing `</script>` from breaking out of the JSON-LD block. `absUrl` (joins relative paths, idempotent on absolute), `breadcrumbList` (1-based positions, drops empty crumbs), `webSite` (SearchAction with the required `{search_term_string}` placeholder and matching `query-input`), `organization` (drops empty `sameAs`/logo), `faqPage` (drops half-filled Q/A). Every storefront caller routes JSON-LD through `jsonLdScript` — a consistent, defensible posture.
- **`lib/site.ts`** — `CANONICAL_SITE='https://lumeralabel.com'`; `resolveSite` trims trailing slashes and refuses to emit a `.example` placeholder (enforced by `site.test.ts` in CI). `SITE` is the single source of truth for absolute URLs.
- **`lib/og.tsx`** — `renderOgImage()` returns a 1200×630 `next/og` `ImageResponse` (corona-ring mark + lowercase wordmark + tagline on `#0B0B0D`), using next/og's bundled font (no network fetch). Exports `OG_SIZE/OG_ALT/OG_CONTENT_TYPE`, verified by `og.test.ts` to emit valid PNG bytes.
- **`lib/brand.ts`** — `BRAND='Lumera'`, `EXPERIENCE='The Broadcast'`, `TAGLINE`, `DESCRIPTION`, `MOTTO='Some things only happen once.'`, plus the display lexicon `CURRENCY='Lumens'`, `LOYALTY='Luminance'`, `COLLECTIVE='The Constellation'`. Documents the internal→display mapping (credits→Lumens, CONGREGATION→Constellation).

Test coverage is real and meaningful (`*.test.ts` for brand, catalog, customer, gift-cards, jsonld, og, shipping-ladder, site, stripe, wishlist) — the pure helpers are extracted specifically so SEO/money/wishlist contracts are asserted in CI rather than eyeballed.

### 7.4 Routes under `app/`

**Home `app/page.tsx`** (server) — reads `axiv_vid` from `cookies()` (default `'ssr'`), paints `Hero` + `TuneBroadcast` instantly, and streams the personalized Broadcast under `<Suspense>` (skeletons fallback). `Broadcast` fetches `/store/broadcast?visitor_id=…` (`cache:'no-store'`, default `{block_order:['live_drops'], blocks:{live_drops:[]}}` on failure), then for each non-`live_drops` block resolves product ids via `fetchProductsByIds` (region-scoped, preserves id order, drops misses). Renders `DropBoard` for `live_drops`, `ProductRail` per other block. `PageSignal type="page_view" {page:'home'}`.

**PDP `app/p/[handle]/page.tsx`** (server) — the richest page. `generateMetadata` builds title/description/OG from the product. The page `notFound()`s on a missing product, then `Promise.all`s five fetches: `fetchRail('graph_rec')` ("Worn Together"), `fetchRail('complete_the_set')`, `fetchDemand` (`/store/pricing`), `fetchTruth` (`/store/product-truth/{handle}` → `ProductTruth` from `@alterxiv/shared`), `fetchReviews` (`/store/reviews`). Demand badge ("Rising demand") shows when `demand_factor ≥ 0.5 || scarcity_factor ≥ 0.5`. Review aggregate prefers first-party `stats` over the legacy `metadata.verified_reviews_count`. Emits **Product JSON-LD** (conditional `aggregateRating` + `offers` with `price` as `(cents/100).toFixed(2)`, `InStock`) and a **BreadcrumbList** (Broadcast → chapter → product). `PageSignal type="product_view" entityId={product.id} {chapter, price_band: priceBand(price/100)}`. The **Product Truth panel** surfaces supplier/region/ship-days/return-window/quality-checks with "pending" fallbacks — a brand-differentiating transparency surface. Loyalty teaser: "Earn $X in Lumens" at 5% of price. Out-of-stock when no `variants[0].id`. Includes a full reviews section + `ReviewForm`.

**Search `app/search/page.tsx`** (server) — `metadata.robots = {index:false, follow:true}` (search result pages are noindex — correct SEO posture; the SearchAction target stays discoverable). Clamps `q` to 80 chars, calls `/store/search?q=…&limit=24` (hybrid keyword+pgvector per the comment), then resolves products and **re-sorts to preserve the engine's vector-rank order** (the products endpoint doesn't guarantee order). Renders facet chips (chapter → count) linking to `/chapter/*`, and each card shows the backend's "why it matched" `reason`. `PageSignal {page:'search', q, results}`.

**Chapter `app/chapter/[chapter]/page.tsx`** (server) — `CHAPTERS = stillness|armor|signal|altar|relentless` (a hard-coded enum; unknown chapter → `notFound()`). Each chapter has an editorial line. **Inefficiency to flag:** it fetches up to 100 products with `limit=100` and filters client-side by `metadata.chapter` rather than querying by chapter — won't scale past the first 100 products and silently drops items beyond. Emits BreadcrumbList + `PageSignal type="chapter_enter"`.

**Drops `app/drops/page.tsx` / Drop `app/drop/[id]/page.tsx`** (server) — `/store/drops` list, sorted live→scheduled→sold_out→archived. The detail page finds the drop by id **client-side from the full list** (no single-drop endpoint), computes `pctSold`, renders a `Countdown` (open vs close) and a scarcity bar, then resolves `product_ids` into a rail. `drop_view` signal with the drop id.

**Cart `app/cart/page.tsx`** (`'use client'`) — reads `useCart`, computes `total` from `unit_price*quantity` (cents). Renders items (remove only — no qty control), the free-shipping ladder (when enabled), the `RewardsPanel` preview (earn-at-this-AOV), and a link to `/checkout`. `page_view {page:'cart'}`.

**Checkout `app/checkout/page.tsx`** (`'use client'`) — a 3-step machine (`shipping → payment → complete`). See §7.6.

**Account cluster** — `app/account/page.tsx`→`AccountHub`; `app/account/orders/page.tsx`→`OrdersList`; `app/account/orders/[id]/page.tsx`→`OrderDetail`; `app/account/wishlist/page.tsx`→`WishlistView`. Thin server wrappers that only export `metadata` and delegate to client components (so the interactive shells can use hooks while the route still has static metadata).

**Auth `app/(auth)/login` + `/register`** — a route group; each wraps `AuthForm` in `<Suspense>` (required because `AuthForm` uses `useSearchParams`). `metadata` titles "Sign in" / "Create account".

**Other pages:** `app/track/page.tsx`→`TrackForm` (noindex). `app/faq/page.tsx` — single `FAQ` array drives both the rendered list and the **FAQPage JSON-LD** (so they can't diverge). `app/gift-cards/page.tsx`→`GiftCards`. `app/returns/page.tsx` — self-serve RMA form posting to `/store/rma` (namespaced to avoid Medusa's built-in `/store/returns`). `app/legal/{privacy,terms,returns}/page.tsx` — render through `LegalDoc`/`Section`; content is thorough and aligned to the dropship reality (supplier fulfillment, delay consent, 30-day window, Lumens have no cash value, "does not sell personal information", children's-products blocked from auto-launch). `app/cockpit/*` — the founder ops board (§7.5).

**Error/empty states:** `error.tsx` (route boundary, logs to console, Try-again/Return), `global-error.tsx` (last-resort, renders own html/body with inline styles), `not-found.tsx`, `loading.tsx` (streaming shell using the skeletons).

### 7.5 The Cockpit — founder curation board (security-critical)

**`app/cockpit/page.tsx`** (server) — `metadata.robots = {index:false, follow:false}` and `/cockpit` is in `robots.ts` disallow. It fetches two backends in parallel: `/store/cockpit` (KPIs, OPERATOR loop summary, approval inbox, recent agent runs, integrations, drops) and `/admin/lumera/curation-board` (candidates + supplier connections), **both gated by the server-only `COCKPIT_KEY`** header (`x-cockpit-key`). If both are dark it still renders the full `Workforce` roster from the shared `CONSTELLATION` manifest (so the page is meaningful even with no telemetry). It surfaces revenue/AOV/return-rate KPIs (`usd()` = cents/100), top products, low-stock drops, the Constellation roster with per-agent gated-action chips, the **Curation Board**, and a **Founder Approval Inbox** for escalated agent actions.

**`app/cockpit/actions.ts`** (`'use server'`) — server actions, each posting (with `COCKPIT_KEY` + publishable key) and `revalidatePath('/cockpit')`:
- `runCuration` → `POST /admin/lumera/curation/run {force:true}`.
- `approveCandidate` / `approveDraftCandidate` → `/admin/lumera/candidates/{id}/approve {publish:true|false, reason}`.
- `rejectCandidate`, `requestSample`, `designVariant` → matching candidate sub-routes.
- `approveEscalation` / `rejectEscalation` → `/store/cockpit/approvals` with `{run_id, agent, tool, input, decision}` — **this is the human-approval gate** that the architecture's non-negotiable ("no autonomous money movement/publishing without Garrett's approval") hangs on. `input` is JSON-parsed from a hidden form field (defensive `try/catch` → `{}`).

**Security read (important):** the cockpit's defense is the `COCKPIT_KEY` header injected server-side; the page/actions run on the server so the key is never shipped to the browser — good. **But:** the *cockpit route itself has no authentication* — anyone who can reach `/cockpit` renders the founder dashboard and gets working **Approve+Publish / Approve&Execute** buttons (the server action supplies the secret to the backend). Protection relies entirely on (a) the URL being unguessable/noindexed and (b) the *backend* enforcing `COCKPIT_KEY`. If `COCKPIT_KEY` is unset, the conditional spreads send **no** header, so security collapses to whatever the backend does with a missing key. There is no CSRF protection on these state-changing server actions beyond Next's action mechanics, and no per-action confirmation. For an "external expert review," this is the single highest-risk surface in the storefront: the publish/escalation-execute gate is only as strong as the backend's `x-cockpit-key` check, and the front door is unauthenticated.

### 7.6 Checkout and the payment rails (money path)

`CheckoutPage` gates the **real** rails on `NEXT_PUBLIC_PAYPAL_CLIENT_ID` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` **AND** backend provider availability for the cart's region (`paypalProviderAvailable`/`stripeProviderAvailable`, both default `false`). When neither is configured it falls back to the **test flow** (`pp_system_default`) which completes the cart with no real charge — and the UI says so plainly ("Payment (Test Mode)", "no real payment is processed"). This is an honest, well-labeled degradation.

- **Step `shipping` (`handleShipping`)**: POSTs email + `shipping_address` to the cart, fetches shipping options and **auto-selects `options[0]`** (no UI to choose a method — a simplification/limitation), fetches a fulfillment-promise estimate from `/store/shipping-estimate` using per-item `lead_time_days`, refreshes, advances. `signal('checkout_step', …, 'shipping')`.
- **Step `payment`**: shows the Fulfillment Promise box, order total, and the rails. **Stripe (`StripeCardForm`)**: on mount `createPaymentCollection`→`initPaymentSession(STRIPE_PROVIDER_ID)`→reads server-issued `client_secret`, renders `<PaymentElement>` (card + Apple/Google Pay), then `stripe.confirmPayment({redirect:'if_required'})`→`completeCart`. **Money-honesty handling is exemplary**: declines surface "card was not charged"; non-succeeded statuses are reported without creating an order; and if the charge succeeds but `completeCart` returns no order id, it tells the shopper **"Do NOT retry payment — contact support"** rather than risking a double charge. **PayPal (`PayPalButtons`)**: loads the PayPal JS SDK via `next/script` (CDN), `createOrder` calls the backend to create the PayPal Orders v2 order and returns the **server-stored** order id (never created client-side), `onApprove`→`completeCart`. Both components repeatedly document that **the charge amount is produced server-side**; the browser only references a server token — so there is no client-side money-unit hazard. `handleRailSuccess` fires `signal('purchase', orderId, total/100)`, clears `axiv_cart`, advances to `complete`.
- **Step `complete`**: confirmation with the order id.

**Failure modes / smells in checkout:** the shipping form does no validation beyond what Medusa enforces; `country_code` is hard-coded `'us'` with no country selector; the order-summary total is computed client-side for display only (the real charge is server-side, so this is cosmetic but could mismatch taxes/shipping the shopper sees vs pays — the "Total" shown excludes shipping/tax until Medusa recalculates). The test-flow `handleComplete` signals a `purchase` event for a $0 real transaction — acceptable in test mode but means SIGNAL purchase volume includes test orders unless filtered downstream.

### 7.7 SIGNAL emission map (the learning loop's front-end)

Every meaningful interaction emits a `signal(...)`:
- **Page/section views:** `PageSignal` (fires the page's primary event once + mounts `useBehavior` for `dwell`/`scroll_depth`) on home, search, cart, checkout, drops, returns, account surfaces. PDP → `product_view` (+ `price_band`); chapter → `chapter_enter`; drop → `drop_view`.
- **Discovery:** `DropBoard` fires `drop_view` per drop on mount and `countdown_view` on click; `SiteHeader`/`CommandPalette` fire `chapter_enter`, `search`, `recommendation_click`, and `page_view {surface:'search_open'}`; `ProductRail` fires `recommendation_impression` (count) on mount and `recommendation_click` per card; `ProductCard` fires `product_view` with category/price_band.
- **Commerce:** `add_to_cart` / `remove_from_cart` (cart context), `checkout_step` ×2, `purchase` (both rails + test).
- **Personalization control:** `TuneBroadcast` fires `filter_apply` and POSTs follow/mute prefs.
- **Assistant:** `Shepherd` fires `search {surface:'shepherd'}`.

**Two taxonomy gaps worth flagging:** (1) auth and wishlist actions are shoe-horned into `page_view` with a `surface` discriminator because the `EventType` union has no `login`/`register`/`wishlist_*` member — downstream analysis must key on `context.surface`. (2) The legacy `ProductRail.RailCard` has its **own** non-functional heart button that only flips local state and fires `wishlist_add` — it does **not** use `WishlistButton`/`useWishlist`, so taps there never persist to the wishlist and never reach the customer-metadata sync. This is a real duplication bug: PDP and `ProductCard` use the working `WishlistButton`, but the home/rail cards use a dead heart.

### 7.8 SEO, PWA, analytics, accessibility

- **Metadata/OG:** root `metadataBase` + title template; per-route `generateMetadata` on PDP/chapter/drop; `opengraph-image.tsx` + `twitter-image.tsx` both render `lib/og.tsx`. `app/icon.svg` (metadata route) and `public/icon-maskable.svg` provide the marks.
- **`sitemap.ts`** — home (priority 1) + 5 chapters + `/drops` + `/faq` + the four trust pages, then live product URLs (`limit=100`) and non-archived drop URLs; falls back to the static base if the backend is down. **Limitation:** capped at 100 products.
- **`robots.ts`** — allows `/`, disallows `/checkout /cart /cockpit /account /track /login /register /api`, points at `/sitemap.xml`.
- **`manifest.ts`** — installable PWA (standalone, dark theme, shopping/lifestyle categories, base + maskable icons). Base icon points at `/icon.svg` which Next serves from the app-router metadata file (not `public/`) — resolves correctly.
- **`public/sw.js` + `ServiceWorker.tsx`** — production-only app-shell SW: precache `/offline.html` + icons + manifest; navigations network-first with offline fallback; **`/store/`, `/auth/`, `/api/`, `/_next/data/` are never cached** (so personalized/mutating/auth traffic is always live) — a careful, correct cache policy. Cross-origin (CDN images, Medusa) is left to the browser.
- **`Analytics.tsx` + `ConsentBanner.tsx`** — GDPR consent gate: unless `NEXT_PUBLIC_CONSENT_REQUIRED==='false'`, **no analytics script renders until `lumera_consent==='accepted'`**, re-read live via the `lumera:consent` event (no reload). Exactly one of Plausible/PostHog/umami is chosen by precedence; Sentry loads independently when its DSN is set. The PostHog snippet is injected inline via `dangerouslySetInnerHTML` with `JSON.stringify`-wrapped key/host (safe). The privacy policy text matches this behavior.
- **A11y:** skip-link in the layout; `aria-label`/`aria-pressed` on wishlist/search/account controls; `role="radiogroup"`/`role="radio"` on the review stars and `role="tablist"`/`aria-selected` on gift-card tabs; `role="img"` fallback in `ProductImage`; `aria-live="polite"` consent dialog; `Countdown`/`ConsentBanner` defer render until mounted to avoid hydration drift; framer-motion transitions honor `prefers-reduced-motion` via `globals.css`.

### 7.9 Notable risks / smells / TODOs (consolidated for the reviewer)

1. **Unauthenticated `/cockpit` front door** — state-changing approve/publish/escalation-execute actions are reachable by anyone who loads the page; the only real gate is the backend's `x-cockpit-key`, which is silently omitted if `COCKPIT_KEY` is unset. Highest-priority audit item.
2. **Dead/duplicate code:** `lib/recommendations.ts` (unused, and the one call site that omits `encodeURIComponent`); the non-functional wishlist heart in `ProductRail.RailCard`; `IssueResult.issued` never read.
3. **Two base-URL env conventions** (`MEDUSA_BACKEND_URL` vs `NEXT_PUBLIC_MEDUSA_URL`) must be kept in sync in deploy config or server/client will disagree on the backend origin.
4. **Catalog scale:** chapter and sitemap pages fetch `limit=100` and filter in memory — silently incomplete past 100 products; chapter filtering should be a server query.
5. **Cart UX gaps:** fixed quantity of 1, no quantity editor, shipping method auto-selected (`options[0]`), hard-coded `country_code:'us'`, client-side "total" excludes shipping/tax until Medusa recomputes.
6. **`RailCard.onAdd` swallows nothing but also catches nothing** — a failed add still shows "Added ✓".
7. **SIGNAL taxonomy gaps** — auth and wishlist events ride on `page_view` + `context.surface`; downstream consumers must know this.
8. **`getRegionId` module-level memo** is a single-region assumption (would mis-scope prices in a multi-region store).
9. **Visitor id is client-spoofable** (`httpOnly:false` by design) — any backend trust/abuse logic keyed on `axiv_vid` must treat it as untrusted input.

Strengths the reviewer should credit: rigorous money-honesty in the payment components (never tell a charged shopper to retry), the `jsonLdScript` XSS escape, the consent-gated analytics, the httpOnly JWT cookie, extensive defensive fallbacks so a dark backend degrades gracefully, and the pure/unit-tested extraction of all money/SEO/wishlist logic.


---

## 8. Intelligence — The Constellation (Autonomous Agents)

This section documents `apps/intelligence/src/**` in full: the runtime that Lumera calls **CONGREGATION** — fifteen department agents, a manager (OPERATOR), a custom tool-use loop on the raw `@anthropic-ai/sdk`, a least-privilege tool registry, a vendor-fulfilment layer, a persistent Ledger memory, the self-improving Learning Loop, and a continuous INTROSPECTION self-audit. The whole runtime is a single long-lived Node process (`orchestrator/index.ts`) plus a one-shot OPERATOR entry (`operator/index.ts`).

The platform-wide non-negotiable — **no autonomous money movement, publishing, or destructive action without Garrett's approval** — is enforced here by a single pure predicate (`isGated`) wired into the one place every tool call passes through (`runAgent`). I audit that enforcement closely below, because it is the load-bearing safety property of the entire system and there are real edge cases.

---

### 8.1 The agent contract and the `AgentDef` shape

**`src/agents/types.ts`** — the single interface every department is declared in:

```ts
export interface AgentDef {
  name: string; department: string; mission: string;
  model: string;            // CLAUDE_MODEL (default 'claude-opus-4-8')
  tools: string[];          // least-privilege tool names from the registry
  skills?: string[];        // named e-commerce playbooks surfaced in the system prompt
  schedule?: string;        // cron expression, if scheduled
  events?: string[];        // event-name prefixes, if event-driven
  escalation: string[];     // actions requiring Garrett's explicit approval
  selfAudit: string;        // the falsifiable post-action check
  systemPrompt: string;
}
```

**`src/agents/_contract.md`** — the canonical, human-readable rulebook every agent "obeys": (1) one-sentence mission; (2) **least privilege** — only the tools in its def; (3) **Ledger memory** — read history before acting, write decisions+outcome after; (4) **self-audit** — run the falsifiable `selfAudit` and log pass/fail; (5) **escalation as a hard rule** — publishing public content, moving money, changing prices beyond guardrails, and destructive/irreversible actions *always* require approval before execution ("Agents draft; Garrett approves"); (6) **voice** — dark, luminous editorial luxury; (7) **verified, not assumed**. This is documentation/intent — the *enforcement* lives in `run-agent.ts` and `tools/index.ts`, not here. A skeptical reader should note items 1–7 are prose; the only ones actually mechanically enforced are least-privilege (registry filtering) and escalation (the gate).

**`src/agents/index.ts`** — assembles the registry `AGENTS: Record<string, AgentDef>` and re-exports `AgentDef`. **Smell:** the keys are hand-maintained and use mixed casing — `oracle_keeper` (snake) but the file/class is `OracleKeeper`; every other key is the lowercase `name`. The map key, not the `def.name`, is what the orchestrator's job consumer and `runAgent(name, …)` look up, while `Ledger.history`/`record` key on `def.name`. For all agents `key === def.name`, so this is consistent today, but it's a latent footgun (e.g. `oracle_keeper`'s key matches its `name: 'oracle_keeper'`, good; but nothing prevents a future drift).

`SKILLS.md` and `SKILLS`-related notes: `src/agents/SKILLS.md` is a mapping table from each agent to named external e-commerce skills (Nexscope/iannuttall/VoltAgent suites). **Important reality check for the reviewer:** these skills are *not loaded or executed*. `buildSystemPrompt` merely appends `Playbooks you apply: <comma list>` as text to the system prompt (see §8.2). There is no skill engine; the model is told the names and trusted to "apply" them. `mcp.config.ts` similarly declares an Apify MCP server granted to curator/sourcer/herald but is a static array imported nowhere in the runtime — the comment claims it is "Registered with the Claude Agent SDK at boot," but the Claude Agent SDK is not used at all (the loop is hand-rolled on `@anthropic-ai/sdk`). Both files are aspirational scaffolding.

---

### 8.2 The orchestrator tool-use loop — `src/orchestrator/run-agent.ts`

This is the heart of the runtime. Key exports: `isGated`, `claimApproval`, `executeApprovedAction`, `buildSystemPrompt`, `runAgent`.

**The escalation gate (the safety primitive):**
```ts
export function isGated(def: AgentDef, toolName: string, input?: any): boolean {
  return def.escalation.includes(toolName) || def.escalation.includes(input?.action);
}
```
A tool-use is gated if either the **tool name** or the value of a top-level `input.action` field appears in the agent's `escalation` list. This dual check is deliberate: some gated actions are whole tools (`image_write`, `send_invoice`), others are *parameters* of a generic tool (e.g. a `medusa_admin_write` call with `action: 'publish_product'`). The approval test confirms both paths.

**`buildSystemPrompt(def)`** — pure, side-effect-free (unit-tested in `skills.test.ts`). Layers: identity/mission prompt → `Playbooks you apply: …` (if skills) → `SELF-AUDIT before finishing: <selfAudit>`. This is how the falsifiable self-audit reaches the model — as an instruction, not a runtime gate. There is **no programmatic verification** that the self-audit passed; "verified, not assumed" is enforced only by prompting. A skeptical reviewer should weigh that: the system markets self-audit as a guarantee, but it's an LLM instruction.

**`runAgent(name, trigger, input)`** — the control flow:
1. Resolve `def = AGENTS[name]`; throw on unknown.
2. `history = await Ledger.history(def.name, 10)` (best-effort; `.catch(() => [])`).
3. `tools = toolsFor(def.tools)` — resolve least-privilege tool set (unknown names silently dropped via `.filter(Boolean)`).
4. **Mock mode**: if `ANTHROPIC_API_KEY` is missing or equals the placeholder `'sk-ant-...'`, it records a mock run and returns — **no tools execute**. (Note this differs from `executeApprovedAction`, which runs tools even with no key.)
5. Build the first user message: `JSON.stringify({ trigger, input, recent_runs: history.slice(0, 3) })`.
6. **Tool-use loop, bounded at 12 steps.** Each step calls `anthropic.messages.create({ model: def.model, max_tokens: 4096, system: buildSystemPrompt(def), tools, messages })`. For each `tool_use` block:
   - **Gate first:** if `isGated(def, tu.name, tu.input)` → `escalated = true`, push a `PendingAction {tool, input}`, record an `ESCALATE → …` decision, and return the tool_result string `QUEUED_FOR_APPROVAL: This action requires human approval. Not executed.` The tool is **never run**. This is the enforcement of the non-negotiable, and it is correctly placed *before* tool resolution/execution.
   - Else resolve `toolsFor([tu.name])[0]`; unknown → `WARN: unknown tool`; otherwise `await tool.run(tu.input)`, JSON-stringify the result back as the tool_result. Errors are caught per-tool and returned as `Error: <message>` text (the loop continues).
7. After the loop, persist an `AgentRun` with `status: escalated ? 'awaiting_approval' : 'success'`, attaching `pending_actions` when present, then `Ledger.record(run)`.

**Edge cases / risks in the loop:**
- **No "stop_reason" handling / runaway protection beyond 12 steps.** If the model keeps emitting tool_use for 12 steps, the loop exits silently with `output = res.content` from the last step — there's no "max steps exceeded" marker in `decisions`, so a truncated agent looks like a normal success.
- **`output` is the *raw last `res.content`*** (Anthropic content blocks), not a cleaned answer. The Ledger stores whatever the final assistant turn was, including dangling `tool_use` blocks if the loop hit the step cap.
- **`tools_used` double-counts**: it pushes `tu.name` for gated calls too (even though they didn't execute), and `toolsFor([tu.name])` is called twice per non-gated tool (once to check, once is the gate — minor).
- **No per-run timeout / token budget guard** beyond `max_tokens: 4096` per call. A cron storm (all scheduled agents firing) could fan out many concurrent Anthropic calls with no global concurrency limit.
- **Prompt-injection surface:** tool results (e.g. scraped marketplace text via `shein_scraper`, customer messages via `support.message`) are fed back into the model verbatim as JSON. A malicious listing or support message could attempt to coax the model toward a gated action — but the gate is structural (it keys on tool name / `input.action`, not on model intent), so injection cannot *bypass* the gate; the worst it can do is cause an escalation to be queued. That is a genuinely strong design choice.

**The approval execution path — `executeApprovedAction(approval)`** (closes the human-in-the-loop circuit when the founder taps "approve" in the Cockpit):
- Resolves `def = AGENTS[approval.agent]`; throws `unknown_agent:` if missing.
- **Refuses anything not gated for that agent:** `if (!isGated(def, approval.tool, approval.input)) throw new Error('not_a_gated_action:…')`. This is the critical guard that prevents the approval channel from becoming an arbitrary tool-execution API. The test `refuses non-gated tools` confirms `higgsfield` (a normal Artisan tool) cannot be run through this path.
- **Idempotency replay guard:** `claimApproval(approval_id)` uses a process-local `Set` bounded at 5000 (drops oldest ~1000 when exceeded). A duplicate `approval_id` returns a benign no-op run (`output.duplicate = true`, no tool re-run). A **missing** `approval_id` is *not* deduped — it proceeds. This guards against Redis at-least-once redelivery (`XAUTOCLAIM` / redelivered un-acked entries). **Risk:** the dedup set is **per-process and volatile** — across a restart or multiple replicas, the same `approval_id` *can* execute twice. For `image_write` that's benign; if a future gated tool actually moved money or submitted an order, this in-memory guard would be insufficient and would need a durable (Redis/DB) claim. The comment acknowledges "Bounded so the set can't grow unbounded" but not the multi-instance gap.
- **Two execution modes:** if `approval.tool` resolves in the registry, it executes (`tool.run(input)`) "with the founder's authority" and logs `FOUNDER-APPROVED → … EXECUTED`. If it does *not* resolve (an **abstract directive** like `publish_product` / `publish_drop`, which have no registry tool), it records `{ directive, input, approved: true }` and logs `FOUNDER-APPROVED DIRECTIVE → … (recorded; agent acts on next run)`. So abstract gated actions become durable Ledger facts the agent reads on its next run — there is no code that actually publishes a product; that remains a downstream concern.
- Deliberately requires **no `ANTHROPIC_API_KEY`** — approvals execute "even with the LLM asleep."
- On finish: `Ledger.record(run)` and, if `run_id` present, `Ledger.outcome(run_id, 'approved_and_executed' | 'approved_but_failed')`.

**Sharp observation for the reviewer:** the only *registry-resolvable gated tool* in the entire system today is `image_write` (in Artisan's `escalation` AND `tools` AND the `TOOLS` registry). Every other escalation entry (`publish_product`, `move_money`, `issue_refund`, `change_price`, `delist_product`, `send_campaign`, `trigger_reorder`, etc.) is an **abstract directive** with no backing tool — so "approval" for those currently just records intent; nothing is executed. This means the "no autonomous spend/publish/delete" guarantee is presently *trivially* satisfied because **there is no code path that spends, publishes, or deletes** — even an approved `move_money` is a no-op record. The safety architecture is sound, but a reviewer should understand the current system is far more "drafts and proposals" than "executes on approval." `image_write` is the lone exception, and it generates imagery (a mock unless `HIGGSFIELD_API_KEY` is set), which is low-risk.

---

### 8.3 The fifteen department agents (`src/agents/*.ts`)

All share `const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-4-8'`. Each is a default-exported `AgentDef`. Below: role, least-privilege tools, schedule/events, escalation gate, and self-audit.

| Agent (key) | Dept / Mission | Tools (least-privilege) | Trigger | Escalation gate | Self-audit (falsifiable) |
|---|---|---|---|---|---|
| **curator** | Merchandising — discover demand, draft on-brand drops | `shein_scraper, supplier_radar, dataset_query, medusa_admin_read, product_draft, ledger` | cron `0 6 * * *` | `publish_product, publish_drop` | every product has chapter, ≥floor margin, ≥3 differentiators, brand-voice copy; failing drafts rejected |
| **artisan** | Creative/Media — luxury product imagery | `higgsfield, image_templates, medusa_admin_read, image_write, brand_audit, ledger` | event `product.created` | `publish_image, spend_generation, image_write` | passes brand-audit, no AI artifacts, reference-consistent, IPTC `TrainedAlgorithmicMedia` |
| **scribe** | SEO/Content — make Lumera the cited answer | `claude_seo, medusa_admin_read, content_draft, schema_write, ledger` | cron `0 3 * * *` | `publish_content` | valid Product/Offer/Review schema; citability holds; no broken canonical/hreflang |
| **quartermaster** | Ops/OMS — route orders, monitor fulfilment | `medusa_admin_read, medusa_admin_write_order, supplier_api, vendor_select, ledger` | events `order.placed, fulfillment.stuck` | `issue_refund, cancel_order` | no order past SLA; no oversell; every routing decision logged with its rule |
| **shepherd** ("Polaris") | Customer Service | `medusa_admin_read, order_lookup, reply_draft, recommendation_read, ledger` | event `support.message` | `issue_refund, send_public_reply` | replies accurate to order data, in voice, resolve/escalate; no invented facts |
| **herald** | Marketing/Social — drop anticipation | `content_draft, video_render, calendar_write, recommendation_read, dataset_query, ledger` | cron `0 7 * * 1` | `publish_social, launch_campaign, spend_budget` | every post ties to a drop/chapter; videos STAGED never published |
| **sourcer** | Sourcing/Purchasing | `supplier_api, price_scraper, supplier_radar, medusa_admin_read, ledger` | cron `0 */6 * * *` | `change_supplier, change_price` | every SKU has confirmed stock + ≥floor margin; OOS/compression flagged with evidence |
| **treasurer** | Finance | `medusa_admin_read, gl_reconcile, month_end_close, statement_audit, invoice_generate, pdf_render, ledger` | cron `0 8 * * 1` | `send_invoice, move_money` | reports reconcile to order/payment data; margins vs true supplier cost |
| **oracle_keeper** | Merch Intelligence — tune ORACLE recs/bandit | `recommendation_admin, experiment_admin, signal_query, ledger` | cron `0 2 * * *` | `ship_pricing_change` | every change backed by experiment + falsifiable metric; no change ships without measured/simulated lift |
| **analyst** | Business Intelligence — NL → SQL | `nl_analytics, signal_query, voc_reviews, ledger` | event `report.requested` | `run_write_query, mutate_data` | every answer cites the query, is READ-ONLY, reconciles; no fabricated figures |
| **loyalist** | Retention/Lifecycle | `signal_query, recommendation_read, order_lookup, reply_draft, calendar_write, nl_analytics, ledger` | cron `0 9 * * *` | `send_campaign, issue_store_credit` | every campaign has a holdout; lift vs control before send; no send/credit without sign-off |
| **rainmaker** | Growth/Revenue | `nl_analytics, signal_query, recommendation_read, dataset_query, experiment_admin, ledger` | cron `0 9 * * 2` | `launch_experiment, change_pricing, publish_offer` | every stream has projected margin + test design; nothing launches/reprices/publishes without approval |
| **forecaster** | Forecasting/Planning | `nl_analytics, signal_query, medusa_admin_read, order_lookup, recommendation_read, grade_drops, ledger` | cron `0 5 * * *` | `trigger_reorder, commit_purchase_plan` | forecasts backtest within ±15%; assumptions explicit; reorders are proposals only |
| **refiner** | Product Optimization/CRO | `signal_query, recommendation_read, nl_analytics, content_draft, product_draft, experiment_admin, ledger` | cron `0 4 * * *` | `apply_product_changes, change_pricing` | every change tied to a SIGNAL hypothesis + A/B test; no live edit without approval |
| **warden** | Compliance/QC | `medusa_admin_read, dataset_query, voc_reviews, supplier_api, brand_audit, ledger` | cron `0 1 * * *` | `delist_product, suspend_supplier, approve_restricted_category` | every product screened vs prohibited/restricted list; every supplier defect-read; flags carry reference + falsifiable reason |

**Least-privilege observations:**
- The split between **read** and **write** tools is real and meaningful. Curator can only `medusa_admin_read` + `product_draft` (drafts, never publish). Quartermaster is the **only** agent with `medusa_admin_write_order` — and that write tool *itself* refuses refunds/cancels (those route through escalation). Analyst is explicitly read-only and even declares `run_write_query`/`mutate_data` as escalations that "never expected" to fire — a defense-in-depth gesture, since `nl_analytics` is hard-wired read-only anyway (see §8.5).
- **Forecaster's `grade_drops`** ties into the LATR loop: it returns `scale`/`kill` proposals; scale → Forecaster's `trigger_reorder` escalation, kill → routed to Warden's `delist_product`. The `DropProposal.agent`/`.tool` fields are deliberately matched to each agent's *real* escalation gate so the Cockpit "approve" button maps one-to-one.
- Every agent has a non-empty `escalation` array, which is exactly what the INTROSPECTION "escalation hygiene" check (see §8.6) enforces — a privileged agent with no gate is flagged.

**`constellation.test.ts` / `skills.test.ts`** (not read line-by-line but referenced) assert structural invariants (every tool resolves, prompts build, gates present). The approval test (`approval.test.ts`, §8.2) is the most security-relevant.

---

### 8.4 The tool registry — `src/tools/index.ts` and the tools

`Tool` interface: `{ name; description; inputSchema: Record<string,unknown> (JSON Schema for Claude); run: (input)=>Promise<unknown> }`. `TOOLS` is the global registry (35 tools). `toolsFor(names)` maps names → tools, dropping unknowns. This is where **least privilege is mechanically enforced** — an agent literally cannot call a tool not in `def.tools`, because `runAgent` only passes `toolsFor(def.tools)` to the model and re-resolves by name from the same set.

Tools, grouped by behavior:

**Read connectors (live DB via `pg.Pool`, all `.catch(() => ({rows:[]}))`):**
- `signal_query` (`connectors.ts`) — SIGNAL aggregates by type over N days. Parameterized SQL.
- `recommendation_read` — served/clicks/conversions by strategy over 30d.
- `order_lookup` — recent `purchase` signal events (optionally by `visitor_id`).
- `nl_analytics` (`db-gpt.ts`) — the most interesting (§8.5).
- `gl_reconcile`, `month_end_close`, `statement_audit` (`finance.ts`) — read-only finance cookbooks over `signal_event` (`type='purchase'`). All explicitly "no journal entries posted (founder approval required)." Note `gl_reconcile` compares revenue against *itself* (`expected === recorded`, "same source here") so variance is always 0 — a stub honestly labeled "a real GL would compare two ledgers."
- `grade_drops` (`drops.ts`) — grades LIVE drops via shared `planDropActions`; proposals only.
- `vendor_select` (`vendor-select.ts`) — wraps shared `rankVendorOptions`; **read-only decision support, never submits**.
- `supplier_api` (`connectors.ts`) — vendor adapters via `quoteSupplierSku`; fixture-backed until creds.

**Discovery/scraping (degrade to empty without creds — fixture-safe):**
- `shein_scraper`, `price_scraper` (`scraper.ts`) — Oxylabs realtime via shared `oxylabsQuery`; empty unless `OXYLABS_USER`/`OXYLABS_PASS`. `price_scraper` parses price strings to cents with a `>1000 ? round : round*100` heuristic and reads `SUPPLIER_MARGIN_FLOOR` (default 0.38).
- `supplier_radar` (`radar.ts`) — shared `radarDiscover` over AliExpress/Alibaba/Shein/Amazon; explicitly **discovery-only** ("a scraped listing is not directly orderable; assign a fulfilment route + re-shoot media before publish").
- `apify` (`apify.ts`) — shared `runApifyActor`; empty unless `APIFY_TOKEN`.

**Generative/external (mock or unconfigured without keys — honest non-pass):**
- `higgsfield` (`higgsfield.ts`) — returns `status: 'unconfigured', jobId: null` without `HIGGSFIELD_API_KEY`; even *with* the key it's a `TODO` ("Higgsfield API call not yet implemented"). So image generation is currently a stub regardless.
- `image_write` (`stubs.ts`) — the one registry-resolvable gated tool; returns `[MOCK_IMAGE]` or `[HIGGSFIELD_URL]` placeholder + `iptc_label: 'TrainedAlgorithmicMedia'`. No real image is produced.
- `claude_seo` (`seo.ts`) — returns `status: 'unconfigured'` ("claude-seo plugin not wired; no audit was run"). A deliberate anti-pattern guard: it refuses to look like a clean empty-findings success.
- `voc_reviews` (`voc.ts`) — same honest `unconfigured` (review-analyzer pipeline not wired).
- `video_render` (`video.ts`) — Herald's MoneyPrinterTurbo pipeline: deterministically computes duration (~150 wpm) and chunks subtitles; returns a **STAGED** manifest (`status: 'STAGED_FOR_APPROVAL'`) with `asset_path: staged/video/…`. Real POST is a `TODO` gated on `MONEYPRINTER_API_URL`. Never publishes.

**Staged write/act connectors (never auto-execute — return `STAGED_FOR_APPROVAL`/`DRAFT`):** `reply_draft`, `calendar_write`, `invoice_generate` (computes total, `status: 'DRAFT'`), `pdf_render`, `recommendation_admin`, `experiment_admin`. These are the "draft, never send" tools.

**Stubs (`stubs.ts`):** `dataset_query` (mock product results), `product_draft` (mock draft, "not persisted to Medusa Admin. Awaiting Garrett approval"), `content_draft`, `schema_write` (mock JSON-LD), `image_templates`, `image_write` (above), `ledger` (reads `Ledger.history` + `openAudits`), and the notable `brand_audit`:

**`brand_audit` — the no-auto-pass guard (a genuinely good safety design).** It is "a lightweight heuristic, NOT a model." It scans for off-brand terms (`cheap`, `discount`, `sale!!!`, `🔥🔥`, `!!!`, etc.) and checks for a valid Lumera chapter. **Critically, it never returns `passed: true`** — even a clean heuristic run returns `status: 'needs_human_review', passed: false`, and with no content returns `status: 'needs_human_review'` (honest hold). This directly encodes the "off-brand assets don't ship" non-negotiable: there is no machine path to "on-brand certified." A reviewer should appreciate this — most systems would let a heuristic auto-approve.

`medusa-admin.ts` — `medusa_admin_read` (GET `/admin/:resource`) and `medusa_admin_write_order` (POST `/admin/orders/:id`). Both require `MEDUSA_ADMIN_API_TOKEN` (or `MEDUSA_ADMIN_TOKEN`) and return `blocked_missing_…` otherwise. **Security note:** the write tool's description says "Refunds/cancels are NOT permitted here (escalation)," but this is *not enforced in code* — it POSTs an arbitrary `patch` to the order endpoint. The actual safety against refunds/cancels relies on (a) Quartermaster's prompt not doing it, (b) `issue_refund`/`cancel_order` being escalation directives, and (c) Medusa's own API requiring specific endpoints for refunds. If the model sent a `patch` that Medusa interpreted as a state change, the tool would pass it through. This is a soft spot — the guardrail is prompt-level, not code-level, for the one write tool that talks to live commerce.

Env vars consumed by tools: `MEDUSA_BACKEND_URL`, `MEDUSA_ADMIN_API_TOKEN`/`MEDUSA_ADMIN_TOKEN`, `DATABASE_URL`, `ANTHROPIC_API_KEY`, `HIGGSFIELD_API_KEY`, `OXYLABS_USER`/`OXYLABS_PASS`, `APIFY_TOKEN`, `MONEYPRINTER_API_URL`, `SUPPLIER_MARGIN_FLOOR`, `MAX_SHIPPING_DAYS`.

---

### 8.5 `nl_analytics` (DB-GPT) — `src/tools/db-gpt.ts`

The Analyst's text-to-SQL engine, and the most security-sensitive read tool. Flow (`run({question, format})`):
1. `claudeSql(question)` — if `ANTHROPIC_API_KEY` set (and not a `...` placeholder), asks **`claude-haiku-4-5-20251001`** (a cheaper model, hard-coded, *not* `def.model`) with a `SCHEMA_CONTEXT` system prompt to emit "ONE SELECT only," returning the SQL only if `.toLowerCase().startsWith('select')`.
2. If no AI SQL, `matchQuery(question)` keyword-matches against **8 predefined parameterless queries** (chapter margin, conversion funnel, segment distribution, drop sell-through, top products, agent runs, audit findings, catalog overview).
3. `executeReadOnly(sql)` — runs inside `BEGIN READ ONLY` … `COMMIT`, with `ROLLBACK` on error. This is the real enforcement: the Postgres transaction is read-only, so even a model-generated `UPDATE`/`DELETE` would error at execution.
4. Builds a chart descriptor (`bar`/`multi-bar`/`table`), an `insight` string, returns `{ question, sql, row_count, columns, data: rows.slice(0,50), chart, insight, grounded: true }`.

**Critical security read:** the `startsWith('select')` guard is **not** sufficient injection protection on its own — `SELECT … ; DROP TABLE …` starts with select, and a CTE/function could attempt side effects. The genuine protection is `BEGIN READ ONLY`, which blocks writes at the DB level, *and* the model is constrained to one statement by prompt. Combined, this is defensible, but the string check is theater; the read-only transaction is the actual control. Two residual risks: (a) a read-only `SELECT` can still be expensive (no `LIMIT`/timeout on AI-generated SQL → potential DoS via a heavy query), and (b) the AI SQL bypasses the curated `columns` list, so `columns` falls back to `Object.keys(rows[0])` — fine, but it means the model can read *any* table in `SCHEMA_CONTEXT` (orders with `visitor_id` metadata, visitor profiles), a PII surface. There's no row-level redaction.

---

### 8.6 INTROSPECTION self-audit — `src/introspection.ts`

Exports `vendorHealthAudits` (pure), `runIntrospection`, and a `CHECKS` array of ~13 health checks. Each check runs SQL (all `.catch(() => ({rows:[]}))`) and emits `Audit[]` objects — each carrying a `finding`, `recommendation`, a **`falsifiable_check`** ("Check: …"), `severity`, and `entity_ref`. `runIntrospection()` runs every check, writes each finding via `Ledger.audit`, logs non-auto-corrected findings, and returns `{ total, errors }`. **No check auto-corrects anything destructive** — `auto_corrected: false` on every flag except the learning loop's sell-through note; the audits are advisory and route to the founder.

The checks (DB tables/columns touched in parentheses):
- **Catalog**: products created in last 24h missing `thumbnail`; products with `description` < 50 chars (`product`). → trigger Artisan/Scribe.
- **Integrity**: products with no `product_variant`; variants with no `product_variant_price_set` (cannot purchase, severity `error`); **vendor/supplier health** (calls `allVendorClients().healthCheck()` and `vendorHealthAudits`); **Lumens wallet reconciliation** — `credit_wallet.balance` must equal `SUM(credit_transaction.amount)` per customer (severity `error`, "never adjust balances without an offsetting ledger entry"); **tool/connector registry health** — *validates every `AgentDef.tools` resolves in `TOOLS`* and *flags any agent with an empty escalation array* (the "F01 lesson" — catch a misnamed connector in the control plane, never mid-loop). This last check is a self-referential guard on the agent definitions themselves.
- **Conversion**: chapters with no engagement in 7d; high-signal products (>5 signals/30d) not in any live drop (`signal_event`, `product`, `drop.product_ids::jsonb ? id`).
- **Margin**: live drops <15% units remaining (`drop`); curated products below `SUPPLIER_MARGIN_FLOOR` (default 0.38) (`lumera_product_candidate.gross_margin`).
- **SEO**: titles >150 chars or containing `pack`/`set of`/`compatible with` (keyword-stuffing smell).
- **VOC**: `high_intent` visitors active in 7d with no purchase (`visitor_profile`, `"order".metadata->>'visitor_id'`).

`vendorHealthAudits(healths, liveMode)` — pure, unit-testable: in live mode, flags any vendor that's `!connected` (orders would stall, severity `error`) or connected-but-`!can_submit_orders` (gated, `warn`). Skips `radar`.

**Smell:** the checks use `require('./agents')`/`require('./tools')` (CommonJS `require` inside an ESM/TS module) for the registry-health check — works under the tsc/CJS build but is stylistically inconsistent with the ESM `import`s elsewhere. Also, `runIntrospection` swallows per-check errors into a count; a persistently failing check (e.g. a renamed column) degrades silently to "0 findings" for that check, which could mask a real regression — the very failure mode the F01 lesson warns about, now possible one level up.

`introspection.test.ts` exercises `vendorHealthAudits` and likely the pure pieces.

---

### 8.7 The Learning Loop — `src/learning/loop.ts`

What makes Lumera "self-improving." Exports `claimReward`, `learnFrom`, `inferBlock`, `nightlyConsolidation`. Uses both `pg.Pool` and an optional `ioredis` client (lazy, `enableOfflineQueue: false`, errors swallowed).

**`learnFrom(event: SignalEvent)`** — called for every SIGNAL event by the orchestrator:
1. `reward = REWARD_WEIGHTS[event.type] ?? 0` (from shared: `purchase: 20, add_to_cart: 5, wishlist_add: 3, recommendation_click: 1, product_view: 1`). If `reward <= 0`, return.
2. **`claimReward(event.id)` — at-most-once dedup.** Authoritative path is Redis `SET reward:dedup:{id} '1' EX 86400 NX` (returns `'OK'` only if newly set); fallback is an in-memory `Set` (cap 5000, drops oldest 10%). The design rationale is explicitly stated and correct: a lost reward "barely moves a Beta posterior," whereas double-counting (crash-recovery reclaim re-applying) "skews it" — so at-most-once is the right trade for bandit rewards. Missing `id` → not deduped (let through).
3. Routes reward three ways: `rewardBandit` (always), and on `purchase`: `queueEmbeddingRefresh` + `recordSellThrough`; on `add_to_cart`: `queueEmbeddingRefresh`.

**`rewardBandit(event, reward)`** — looks up the visitor's `segment` from `visitor_profile` (default `new_seeker`), infers the block (`inferBlock`: purchase/add_to_cart→`for_you`, product_view→`trending_in_chapter`, drop_view→`live_drops`), reads `bandit:{segment}:{block}` as `"alpha beta"`, increments `alpha += reward`, writes back with `EX 30d`. This is the Thompson-sampling Beta(α,β) posterior update that ORACLE's bandit samples from at serve time. **Requires Redis** — without it, no bandit learning happens (silent no-op).

**`queueEmbeddingRefresh`** — `LPUSH embedding:refresh:queue` a JSON `{product_id, visitor_id, queued_at}` for nightly processing.

**`recordSellThrough`** — writes a `Ledger.audit` of type `conversion`, severity `info`, `auto_corrected: true`, with a falsifiable check, so Curator/Herald can read sell-through patterns from their Ledger history.

**`nightlyConsolidation()`** (cron 2am): drains up to 50 items from `embedding:refresh:queue` and calls `refreshProductEmbedding` per product; runs `analyseTopBlocks`; records an `oracle_keeper` `AgentRun`. `refreshProductEmbedding` recomputes a **5-dim chapter one-hot-ish embedding** (`product_embedding.embedding` as a pgvector) — `[0.95 for the observed chapter, 0.05 else]`, sharpened up to 30% by signal count. **Reviewer note:** this is a toy embedding (5 chapters, hand-set values), not a learned representation — the `sharpening` variable is computed but *never used* in the output `embedding` (dead code; the embedding is the same regardless of signal count). `analyseTopBlocks` reads each `bandit:{segment}:{block}` and picks the block with the highest `θ = α/(α+β)` per segment — a deterministic exploit-only summary (not the sampled bandit).

`loop.test.ts` covers idempotency (`claimReward`) and `inferBlock`.

---

### 8.8 Memory — the Ledger (`src/memory/ledger.ts`)

The persistence backbone. Exports `ensureLedgerTables`, `Ledger`. Single `pg.Pool` (default DSN `postgres://alterxiv:alterxiv@localhost:5432/alterxiv`).

**Schema (idempotent DDL, memoized via `_ensured`):**
- `agent_run(id pk, agent, trigger, input jsonb, output jsonb, tools_used text[], decisions text[], status, escalated bool, outcome, started_at, finished_at, pending_actions jsonb)` + index `(agent, started_at DESC)`.
- `audit(id pk, type, severity, finding, recommendation, falsifiable_check, auto_corrected, entity_ref, created_at)` + index `(severity, created_at DESC)`.

The header comment is candid about a real prior bug: these tables "previously had NO migration anywhere, so on a fresh DB every write threw → the circuit breaker wedged open → all history silently fell back to the volatile in-memory buffer (lost on restart)." Now `ensureLedgerTables()` runs before the first read/write and **does not cache a failure** (`_ensured = null` on error so the next call retries).

**Resilience — a circuit breaker + in-memory ring buffer (cap 500).** `withBreaker(op, fallback, label)`: if breaker `open` → use fallback immediately; else try `op`, `reset` on success, `trip` on failure (threshold 3 failures → open for 15s cooldown, then half-open). Every method (`record`, `outcome`, `history`, `audit`, `openAudits`, `recentRuns`) wraps its DB op. `record`/`audit` **always mirror to memory first** ("never lose a record"). `circuitState` ('open'/'half-open'/'closed') is the health probe the OPERATOR surfaces.

**Reviewer notes:**
- The in-memory fallback is **per-process** — under the documented degraded-DB scenario, a multi-replica deployment would have divergent histories, and a read during an open breaker returns only that process's recent runs (merged with whatever DB returns, but if DB is down, only memory). For an audit trail this is acceptable-but-lossy; for anything requiring a complete record it's a gap.
- `record` uses `ON CONFLICT (id) DO UPDATE` (upsert) — correct for re-recording an evolving run. `audit` uses `DO NOTHING` — correct for idempotent findings.
- No retention/pruning on the DB tables (only the in-memory buffer is bounded). `agent_run` will grow unbounded.

---

### 8.9 The orchestrator process — `src/orchestrator/index.ts`

The long-lived entrypoint (`boot()`), and the only piece that touches Redis streams directly. Two Redis clients (`redis`, `redisReader`), default `redis://localhost:6379`.

`boot()` wires:
1. **Cron agents** — for each `def.schedule`, validates with `cron.validate` and schedules `runAgent(def.name, 'cron', {})`.
2. **INTROSPECTION** every 30 min (`setInterval`).
3. **Nightly consolidation** at 2am (`cron`, lazy `require('../learning/loop')`).
4. **OPERATOR daily loop** at 5am (lazy `require('../operator')`).
5. **Two stream consumers** (background).

**Signal stream consumer (`consumeRedisStream`)** — `XGROUP CREATE signal:events congregation $ MKSTREAM`, then `reclaimPending` (crash recovery via `XAUTOCLAIM`, idle 60s, up to 20 passes), then a `XREADGROUP … BLOCK 2000 COUNT 10` loop. Each entry → `handleSignalEntry`: routes to event-subscribed agents (`agentsForEvent` matches `def.events` prefixes or `*`) via fire-and-forget `runAgent(…, 'event', …)`, then `learnFrom(…)` (deduped, so reprocessing is safe). ACKs after handling.

**Job stream consumer (`consumeAgentJobs`)** — `lumera:agent-jobs` / `congregation-jobs`. `handleJobEntry` parses `payload`:
- `payload.type === 'approval'` → **the founder-approval path from the Cockpit.** On `decision === 'approve'` → `executeApprovedAction(payload)` (the gated-execution path, §8.2). On reject with a `run_id` → `Ledger.outcome(run_id, 'rejected_by_founder')`. This is the wire that connects the Cockpit's approve/reject UI to the runtime.
- otherwise `payload.type` like `agent:<name>` → `runAgent(name, payload.trigger ?? 'event', payload)` for backend-scheduled work; unknown agents warn.

**Reviewer notes / risks:**
- **Single consumer name** (`'orchestrator'` / `'job-orchestrator'`) per group — if two replicas run, both use the same consumer name, undermining the consumer-group fan-out and `XAUTOCLAIM` semantics. The design assumes a single orchestrator instance.
- **No payload authentication** on the job stream. Anything able to `XADD` to `lumera:agent-jobs` with `{type:'approval', decision:'approve', agent, tool, input}` can trigger `executeApprovedAction`. The `isGated` refusal limits this to *actually-gated* actions for that agent — so the blast radius is "can approve a queued gated action" — but there's no check that this approval corresponds to a real pending run or came from an authenticated founder. The security boundary is therefore "whoever can write to Redis is trusted as the founder." For a system whose headline guarantee is human-in-the-loop on spend/publish, **the trust model of the approval channel is the thing a senior auditor should scrutinize most** (alongside the fact that, today, only `image_write` actually executes).
- `handleSignalEntry` parses fields pairwise (`fieldsToObj`) and coerces `value` with `parseFloat`; malformed entries degrade gracefully.

---

### 8.10 The OPERATOR — `src/operator/index.ts` + `workflow.ts`

The "manager agent" (crewAI hierarchical pattern) that makes this "a company of one." `runDailyLoop(opts)`:
- **PLAN/DELEGATE** over a fixed `DAILY_PIPELINE` order: `warden → sourcer → curator → artisan → scribe → herald → oracle_keeper → quartermaster → shepherd → treasurer → analyst` (compliance first, then source/curate/make/sell/account). Note this is **11 of the 15** agents — `loyalist`, `rainmaker`, `forecaster`, `refiner` are *not* in the daily loop (they run only on their own crons/events).
- For each agent: `runAgent(agent, 'cron', {source:'operator_daily_loop'})`, then `validate(run)` → a quality gate of `pass | fail | escalated` (escalated if `run.escalated || status==='awaiting_approval'`; fail if `error` or empty `output`). Escalated steps push a founder-inbox line extracted from `ESCALATE` decisions.
- **VALIDATE/AGGREGATE**: runs `runIntrospection` after the pipeline, writes one `operator` `AgentRun` summarizing `passed/failed/escalated`, the `founder_inbox`, `ledger_health` (`Ledger.circuitState`), and `audit_findings`. `status: failed.length ? 'error' : escalated.length ? 'awaiting_approval' : 'success'`. The OPERATOR itself "never publishes or spends; it delegates and validates."

**`operator/workflow.ts` (the "G03 durable workflow grammar")** — defines `WORKFLOW_STATES` (`proposed, needs_approval, approved, running, validating, escalated, complete, failed, rolled_back`), a `TRANSITIONS` map with `canTransition`/`isTerminal`, and `classifyRun` mapping an `AgentRun` to a state. The approval gate (`proposed → needs_approval → approved`) "cannot be bypassed for privileged work." **However** — this is a *descriptive* state machine for the Cockpit's display; `runAgent` does not actually drive runs through these transitions (it sets `status` directly and `classifyRun` reverse-maps). So the "guarded transitions" are not enforced on the real execution path; they're a lens, not a gate. The real gate remains `isGated` in `runAgent`.

`orchestrator/flow.ts` — composable multi-agent primitives (`sequence`, `parallel`, `forEach`, `oneOf`, `evaluator`) adapted from Anthropic's "Building Effective Agents." `agent(name)` wraps `runAgent(name, 'manual', …)`. These are **defined but not used by the orchestrator** (no import outside tests) — available building blocks for composing drop-launch flows, not currently wired into the daily loop.

---

### 8.11 Vendor fulfilment layer — `src/vendors/`

`vendors/clients.ts` — `BaseVendorClient` (abstract, implements shared `VendorConnector`) + concrete clients: **Printify, Printful, CJ, Spocket, Syncee (Alibaba-backed), Modalyst, Dropified, Manual**. `vendorClient(id)` factory (falls back to `ManualSupplierClient` for `manual`/`radar`/unknown); `allVendorClients()` returns the 8 (excludes radar). Each defines `requiredEnv`, `baseUrl`, `headers()`, and remote CRUD.

**The fulfilment safety ladder (the "no autonomous order submission" enforcement):**
- `healthCheck()` derives `mode` (`live`/`sandbox`/`missing_credentials`/`fixture`), `connected` (all `requiredEnv` present), `can_publish` (connected && `AUTO_PUBLISH_APPROVED !== 'false'`), and crucially `can_submit_orders = connected && VENDOR_LIVE_MODE==='true' && AUTO_SUBMIT_VENDOR_ORDERS==='true'`.
- `createDraftOrder` returns `fixture_draft` (not connected) or `draft_order_proof_gated` unless `VENDOR_DRAFT_ORDER_PROOF === 'true'` — so even *drafting* a real vendor order is gated behind an explicit proof flag.
- `submitOrder` returns `submission_gated` unless `health.can_submit_orders` — the triple-flag gate. Several bridges (Spocket/Syncee/Modalyst/Dropified) honestly return `bridge_managed_in_<vendor>` (order placement happens in their dashboard); CJ returns `submission_pending_provider_confirm` ("never claim a fabricated submitted"); Manual returns `manual_submission_requires_founder`. This honesty about *not* having actually submitted is a recurring, commendable pattern.
- `requestJson` retries 429/5xx up to twice with `retry-after` honored.

`vendors/index.ts` — `vendorConnections()` builds the connection list and **re-clamps** `can_submit_orders &&= liveMode && autoSubmit` (defense-in-depth, since `radar`/`manual` paths are added manually). `quoteSupplierSku(sku, preferred)` resolves a quote from the client or `fixtureCandidates`. `bestVendor()` picks the first connected non-radar vendor or `manual`. **Note:** `bestVendor()` calls `vendorConnections()` which calls `allVendorClients().map(c => syncHealth(c.id))` — `syncHealth` is pure (env reads only, no network), so no recursion/IO storm; fine.

Env vars: `VENDOR_LIVE_MODE`, `AUTO_SUBMIT_VENDOR_ORDERS`, `AUTO_PUBLISH_APPROVED`, `VENDOR_DRAFT_ORDER_PROOF`, `MANUAL_SUPPLIER_VERIFIED`, `CJ_SANDBOX`, and per-vendor `*_TOKEN`/`*_API_KEY`/`*_STORE_ID`/`*_SHOP_ID`. `clients.test.ts` exercises the gating; `vendor-select.test.ts` the ranking.

---

### 8.12 Shared contracts the Constellation depends on

The intelligence layer imports its decision logic from `@alterxiv/shared` (documented elsewhere, but load-bearing here): `rankVendorOptions` (margin 45% / reliability 30% / speed 25%, with deterministic priority tie-break and `failover` flag), `planDropActions`/`gradeDrop` (LATR: scale ≥60% sell-through after a 7-day window → 2.5× restock; kill ≤20%), `REWARD_WEIGHTS`, the `SignalEvent`/`EventType` taxonomy, `AgentRun`/`PendingAction`/`Audit` types, and the vendor types. Keeping these pure and shared means the cockpit, backend jobs, and agents all grade drops and rank vendors by **one** rule — a good architectural decision.

---

### 8.13 Consolidated critical findings (for the auditor)

1. **The "no autonomous spend/publish/delete" guarantee is real but largely vacuous today.** The gate (`isGated`) is correctly placed and unbypassable from the model side. But of all escalation entries, only `image_write` resolves to an executable tool; every spend/publish/delist directive is an *abstract record* with no execution code. So the guarantee currently holds trivially because the dangerous actions aren't implemented. As real execution is wired up (Medusa publish, refunds, vendor submit, store credit), each must route through `executeApprovedAction` *and* be made registry-resolvable — and the in-memory idempotency + unauthenticated approval channel (below) must be hardened first.
2. **Approval-channel trust model.** `executeApprovedAction` is reachable by anyone who can `XADD` to `lumera:agent-jobs`; there's no auth binding the approval to an authenticated founder or to a real pending run. Combined with the **per-process, volatile** `claimApproval` dedup, an approval for a money/order action could double-execute across replicas/restarts. Move dedup to Redis/DB and authenticate the approval origin before enabling any executable gated action.
3. **`medusa_admin_write_order` passes an arbitrary `patch` to live Medusa** — its "no refunds/cancels" guard is prompt-level only, not code-level. The one live-commerce write tool deserves an allow-list of permitted patch fields.
4. **`nl_analytics` injection guard is the read-only transaction, not the `startsWith('select')` string check** — and AI-generated SQL has no `LIMIT`/timeout (DoS risk) and can read PII tables (`order` metadata, `visitor_profile`) with no redaction.
5. **Self-audit / "verified, not assumed" is prompt-enforced, not code-enforced.** `selfAudit` is appended to the system prompt; nothing verifies it ran or passed. Same for the SKILLS.md playbooks and `mcp.config.ts` — declared, not wired (the Claude Agent SDK dep is unused; the loop is hand-rolled).
6. **Single-instance assumptions throughout** — stream consumer names, Ledger memory fallback, and approval dedup all break under horizontal scaling.
7. **Minor:** dead `sharpening` variable in `refreshProductEmbedding`; `gl_reconcile` variance is always 0 (honest stub); the 12-step loop cap produces a silent truncation with no marker; CommonJS `require` inside the introspection ESM module; `agent_run` table grows unbounded.

What works genuinely well: the structural escalation gate, the `brand_audit` no-auto-pass design, the honest `unconfigured`/`STAGED`/`gated` statuses (the system refuses to fake success), the at-most-once reward dedup rationale, the circuit-breaker Ledger with mirrored memory, the read-only transaction wrapper for analytics, and the multi-flag vendor submission ladder. The safety *architecture* is sound; the gaps are in the *trust boundary of the approval channel* and the fact that real execution is mostly still stubbed.


---

## 9. Scripts, Ops, Config, Build & Deploy

This section audits the entire operational surface: `scripts/**`, the launch‑gate ladder, build/deploy config (`turbo.json`, `pnpm-workspace.yaml`, root + per‑app `package.json` scripts, all `tsconfig`s, `medusa-config.ts`, `next.config.ts`, `tailwind.config.ts`, PostCSS/Vitest), Docker (`docker-compose.yml`, three `Dockerfile`s, `.dockerignore`), CI (`.github/**`), and the full `.env.example` surface grouped by purpose. The internal codename "Alter XIV" / `@alterxiv/shared` and the brand name "Lumera" are used interchangeably across these files; the npm package scope is `@alterxiv`, the product is Lumera.

### 9.1 Monorepo & workspace topology

- **`pnpm-workspace.yaml`** — two globs only: `apps/*` and `packages/*`. Workspaces resolved: `apps/backend` (`backend`), `apps/storefront` (`storefront`), `apps/intelligence` (`intelligence`), `packages/shared` (`@alterxiv/shared`), `packages/data` (no `package.json` — pure data, not a real workspace; it is referenced by relative path from `scripts/seed.ts`).
- **Root `package.json`** — `name: lumera`, `private: true`, `packageManager: pnpm@9.0.0`, `workspaces` mirrored for tooling that reads npm‑style workspaces. Dev deps are only `turbo@^2.1.0`, `typescript@^5.6.0`, `vitest@^2.1.0`. A `pnpm.overrides` block pins React 18.3.1 (`react`, `react-dom`, `@types/react`, `@types/react-dom`) across the whole tree — this is the mechanism that prevents a transitive React 19 from leaking into the Next storefront.
- **Root scripts (the operator's command palette)** — every ops entry point is a thin npm script. Note the two execution families:
  - **`turbo run …`**: `dev`, `build`, `test`, `lint`, plus `seed`/`bootstrap` (both `--filter=backend`).
  - **`tsx scripts/*.ts` directly** (bypassing Medusa's runtime): `setup:embeddings`, `backup`, `preflight`, `vendor:preflight`, `vendor:test`, `owner:actions`, `curation:e2e`, `fulfillment:sandbox`, `vendor-orders:submit`, `launch:proof`, `curate`, `radar`, `publish:approved`, `fulfillment:drill`, `paypal:proof`, `launch:preflight`, `test:regression`.
  - **`pnpm --filter backend exec medusa exec …`** (needs the Medusa container/DI): `seed:monetization`, `setup:commerce`, `setup:prices`, `setup:inventory`, `ensure:key`, `verify:rewards`.
  - **`verify:api`** → `bash scripts/verify-api.sh` (the full operational pipeline).

  This split is load‑bearing: scripts that touch Medusa models/services must run under `medusa exec` (they receive an `ExecArgs` with a resolved DI `container`); scripts that only need raw SQL or HTTP run under plain `tsx`.

- **`turbo.json`** — `"envMode": "loose"` (an explicit, commented decision: Turbo 2.x defaults to `strict`, which silently stripped runtime env like `DATABASE_URL`/vendor keys from tasks). `build` declares `dependsOn: ["^build"]`, `outputs: ["dist/**", ".next/**", ".medusa/**"]`, and `env: ["NEXT_PUBLIC_*"]` so the storefront build cache invalidates when the publishable key changes (NEXT_PUBLIC values are inlined at build time). `dev`/`seed`/`bootstrap` are `cache:false`; `dev` is `persistent`. `test` and `lint` both `dependsOn: ["^build"]` — important because `lint` in every workspace is `tsc --noEmit` and the backend/storefront import `@alterxiv/shared` from its built `dist`, so the shared package must build first.

### 9.2 The seed / bootstrap chain (store provisioning)

The "make a fresh Medusa into a real store" pipeline is `scripts/bootstrap.ts`, which sequentially runs a fixed list of step modules. All steps are idempotent and DI‑container based.

- **`scripts/bootstrap.ts`** — default export `bootstrap(args: ExecArgs)`. Runs, in order: `catalog` (`seed`) → `commerce` (`setup-commerce`) → `prices` (`setup-prices`) → `inventory` (`setup-inventory`) → `membership tiers` (`seed-monetization`) → `publishable API key` (`ensure-publishable-key`). It explicitly does **not** run migrations (Medusa Cloud runs those on deploy) and does **not** require pgvector — embeddings are a separate optional step. Ends with `process.exit(0)` to force a clean exit even if a module left a DB/Redis handle open (a real concern; several scripts open `pg.Pool`s). Prints the captured `PUBLISHABLE_KEY` and tells the operator to copy it into `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`.

- **`scripts/seed.ts`** — default export is the catalog seeder; also re‑exports `seedMembershipTiers` is *imported* from seed‑monetization. Reads Bright Data CSVs from `packages/data` (`amazon-products.sample.csv`, `shein-products.sample.csv`) with a committed‑fixture fallback map (`FALLBACK_FIXTURES`) so it works on a clean checkout without the large sample data (prints a `[seed] … using committed fixture` warning). CSV parsing uses `csv-parse/sync` with `relax_quotes`/`relax_column_count` (tolerant of dirty marketplace data).
  - **Chapter taxonomy is keyword‑derived**: `CHAPTER_KEYWORDS` maps the five chapters (`stillness`, `armor`, `signal`, `altar`, `relentless`) to keyword lists; `detectChapter(text)` returns the first match, defaulting to `relentless`. This is a naive substring classifier — e.g. "watch" → `signal`, "shoe" → `relentless` — and silently mis‑buckets anything off‑keyword (a quality risk for the editorial chapters, but acceptable for seed data).
  - **Mapping**: `amazonToProduct`/`sheinToProduct` build Medusa product payloads. Prices come straight from the source CSV `final_price` (`Math.round(finalPrice*100)` cents) — note these are later *overwritten* by `setup-prices.ts` chapter pricing, so the CSV price is effectively throwaway. Handles are slugified+truncated to 60 chars; titles to 200, descriptions to 2000. Metadata carries `chapter`, `sku`, `source`, `rating`, `reviews_count`, `main_image`, `brand`, and a `scripture_ref` field (always `undefined` here). `manage_inventory:true`/`inventory_quantity` are set here but later flipped to drop‑ship config by `setup-inventory.ts`.
  - **Idempotency**: seeds only the first **40** Amazon + **40** Shein rows; checks existing product handles and inserts only new ones in batches of 20, assigning each to its chapter category. Categories (`chapterDefs`) carry scripture refs (Psalm 46:10, Ephesians 6:11, etc.) — overt religious/"GSN" branding baked into the data model.
  - **Drops**: if no drops exist, creates two via the `drops` service — `THE IRON GATE — DROP I` (chapter `armor`, `status:'live'`, 144 units, now→+7d) and `UNBROKEN — DROP II` (`relentless`, `scheduled`, 72 units, +14d→+21d), assigning the first 10 / next 10 inserted product IDs respectively.
  - **Membership tiers**: wrapped in try/catch so a monetization hiccup never fails the catalog seed.

- **`scripts/seed-monetization.ts`** — exports `MONETIZATION_MODULE = 'monetization'`, `MEMBERSHIP_TIERS`, `seedMembershipTiers(svc)`, and a default `seedMonetization({container})`. Two tiers (note the key/name mismatch — the code keys are `disciple`/`patron`, the display names are `Ember`/`Luminary`):
  - `disciple` ("Ember", $9/mo, entitlements `early_access`, `member_pricing`)
  - `patron` ("Luminary", $25/mo, `early_access`, `patron_pricing`, `free_shipping`, `monthly_credits`, `patron_drops`).
  `seedMembershipTiers` upserts by `key` (list→update or create). The header comment is explicit that without these tiers `monetization.subscribe()` throws `'Unknown tier'` and the entire Patron feature (entitlements + 2× Luminance multiplier) silently no‑ops — a good example of a load‑bearing seed.

- **`scripts/setup-commerce.ts`** — default `setupCommerce({container})`. Builds the commerce spine with core‑flow workflows, each guarded by an existence check (idempotent): **Region** US/`usd`/`pp_system_default` → **Stock location** "Lumera Fulfillment" (LA) → **Fulfillment set** "Drop‑Ship Delivery" → **Service zone** US (`geo_zones` country `us`) → **provider→location link** → **Shipping profile** "Default" → **Shipping option** "Standard Delivery" (flat, **$0**) → **link all sales channels to the stock location**.
  - **Provider gating smell**: `fulfillmentProviderId = LUMERA_NATIVE_FULFILLMENT==='true' ? 'lumera_dropship' : 'manual_manual'`. The "does a link already exist?" check is `listLocationFulfillmentProviders?.(…)` with `?.` optional chaining — if the method is undefined it returns `null`, and the code treats `null`/falsey as "no link → create it" every run. So on Medusa builds where that method doesn't exist, the link‑create `batchLinksWorkflow` is attempted every invocation (errors are swallowed with a truncated warning). Functionally idempotent only because the workflow tolerates the duplicate, not because the guard works. Worth flagging.
  - Free $0 standard shipping is hard‑coded; there's no paid tier created here.

- **`scripts/setup-prices.ts`** — default export. Re‑prices every variant by **chapter** via `upsertVariantPricesWorkflow` in batches of 20: `CHAPTER_PRICES` = stillness $89 / armor $149 / signal $129 / altar $79 / relentless $99, default **$99** (9900¢) for any unknown chapter. This is what overrides the CSV‑derived prices from `seed.ts`. Batch errors are caught and warned, not fatal — a partial pricing failure passes silently.

- **`scripts/setup-inventory.ts`** — default export. Flips every variant to drop‑ship semantics: `manage_inventory:false`, `allow_backorder:true`, in batches of 20, per‑variant errors swallowed. This is why the catalog never shows out‑of‑stock and why no real inventory levels are needed.

- **`scripts/setup-embeddings.ts`** — standalone (`tsx`, **not** `medusa exec`) using a raw `pg.Pool`. Creates a pgvector table **outside** Medusa migrations: `product_embedding(product_id PK, chapter, embedding vector(5), updated_at)` + a chapter btree index + an HNSW cosine index (`vector_cosine_ops`, wrapped in `.catch(()=>{})` so old pgvector without HNSW degrades gracefully). Seeds **5‑dim chapter one‑hot vectors** (`CHAPTER_VEC`, ~0.95 on the chapter axis) matching the recommendation service's `CHAPTER_VEC`; default `[0.2×5]`. Reads products straight from the `product` table (`COALESCE(metadata->>'chapter','relentless')`). **Safety**: in `NODE_ENV=production` it throws if `DATABASE_URL` is unset rather than silently falling back to the `postgres://alterxiv:alterxiv@localhost:5432/alterxiv` dev DSN — good. Env: `DATABASE_URL`. DB objects: `product_embedding`, extension `vector`.

- **`scripts/ensure-publishable-key.ts`** — default `ensurePublishableKey({container})`. Find‑or‑create a `publishable` API key, link it to **every** sales channel (`linkSalesChannelsToApiKeyWorkflow`), then `console.log('PUBLISHABLE_KEY=<token>')` so callers can capture it, and **writes the token to `/tmp/alterxiv-pk`**. The comment is accurate that without a linked publishable key every `/store/*` route returns 400. **Smells**: (1) writes a secret token to a world‑readable `/tmp` path; (2) `require('fs')` mid‑function in an otherwise ESM/TS file.

### 9.3 Curation, radar, publish & vendor lane (the dropship pipeline)

These scripts implement the founder‑gated curation→publish→fulfillment flow. All money/publish/vendor‑submit actions are gated.

- **`scripts/radar.ts`** (`pnpm radar -- "query" --source aliexpress --limit 8`) — a **read‑only** sourcing preview. Calls `radarDiscover`/`radarConfigured` from `@alterxiv/shared`. Honest‑by‑design: prints `configured=false` and an empty result with guidance when `OXYLABS_USER`/`OXYLABS_PASS` or `APIFY_TOKEN` are absent — it never fabricates discovery data. Writes nothing to the board. Args via flags or positional; env fallbacks `LUMERA_RADAR_SOURCE`, `LUMERA_RADAR_LIMIT`. Prints per‑candidate score/margin/cost/retail/lead/stock and blockers.

- **`scripts/curate.ts`** (`pnpm curate [--force]`) — POSTs `/admin/lumera/curation/run` on `MEDUSA_BACKEND_URL` (default `http://localhost:9000`) with header `x-cockpit-key: $COCKPIT_KEY`. This is the only script that *triggers* curation; it prints `source`, candidate count, and per‑candidate `status score/100 title`.

- **`scripts/curation-e2e.ts`** (`pnpm curation:e2e`) — a **gate proof** with no external dependency required. Pulls candidates from `/admin/lumera/curation-board`; if unreachable, falls back to deterministic `fixtureCandidates('printify')` (so it passes in CI without a running backend). Asserts each candidate has id/title/supplier_sku/cost/retail/variants/score/compliance, that **≥1 unblocked ready** and **≥1 blocked** candidate exist (proving the gate both passes and blocks), then runs the first ready candidate through `buildProductPayload(approved, false)` and `candidateToProductTruth`. Critical assertions: the approve‑draft payload **stays `status:'draft'`** (no auto‑publish), metadata carries `lumera_candidate_id`/`supplier_sku`/`fulfillment_provider`, variant counts match, and **`truth.verified_reviews_count === 0`** ("Product Truth must not invent reviews"). This is the integrity check that backstops the "no fake reviews" non‑negotiable.

- **`scripts/publish-approved.ts`** (`pnpm publish:approved`) — GETs the curation board, filters to `status ∈ {ready_for_review, approved}` with no `score.blockers`, then POSTs `…/candidates/:id/approve` with `{publish:true}`. This is a **real publish path** (founder‑intent script per CLAUDE.md `/lumera-publish-approved`). It relies entirely on the server‑side approve route for any further gating; the script itself does not re‑check vendor live‑mode flags.

- **`scripts/vendor-preflight.ts`** (`pnpm vendor:preflight`) — pure env audit, **no network**. Checks the three vendor lanes (`printify`/`printful`/`cj`) for required env pairs; computes `orderReady = connected && VENDOR_LIVE_MODE && AUTO_SUBMIT_VENDOR_ORDERS`. Echoes flags, `SUPPLIER_MARGIN_FLOOR` (default 0.38), `MAX_SHIPPING_DAYS` (12), admin‑token presence, and whether `STRIPE_API_KEY` is a live key (`!startsWith('sk_test')`). **Blocks (exit 1) only when `VENDOR_LIVE_MODE=true`** and Stripe isn't live / admin token missing / a lane is missing creds. Otherwise prints "vendor lane configured safely."

- **`scripts/vendor-test.ts`** (`pnpm vendor:test`) — exercises `allVendorClients()` from `apps/intelligence/src/vendors`. For each: `healthCheck()`, `searchProducts('lumera',2)`, `createDraftOrder(...)`. Detects **fixture fallback** (any `source_url` containing `lumera.local`) and **fails** if a vendor has credentials present *but* search still fell back to fixtures (i.e. a broken live integration masquerading as working) — a sharp, well‑designed check. Also fails on zero candidates. The draft order returns `draft_order_proof_gated` unless `VENDOR_DRAFT_ORDER_PROOF=true`.

- **`scripts/fulfillment-sandbox.ts`** (`pnpm fulfillment:sandbox`) — **refuses to run** (throws) if `VENDOR_LIVE_MODE` or `AUTO_SUBMIT_VENDOR_ORDERS` is `true`. For each client: draft → `submitOrder`, and **asserts** `submit.status === 'submission_gated'` (proves submission stays gated) and that external draft proof is gated unless `VENDOR_DRAFT_ORDER_PROOF=true`. This is the proof that the live‑order boundary holds.

- **`scripts/vendor-order-submit.ts`** (`pnpm vendor-orders:submit`) — the **only script that can submit live supplier orders**. Hard‑gated: returns immediately ("submission gated") unless **both** `VENDOR_LIVE_MODE=true` and `AUTO_SUBMIT_VENDOR_ORDERS=true`. When enabled, requires `DATABASE_URL`, opens a `pg.Pool`, selects up to 25 rows from **`lumera_vendor_order`** where `status ∈ {ready_for_vendor_submission, retry_staged}` ordered by `updated_at`, and for each: validates `supplier_sku`/`quantity`, builds a draft via `vendorClient(row.vendor)`, and only submits if the draft is "real" (`source !== 'fixture' && status !== 'draft_order_proof_gated'`). Persists status transitions back to `lumera_vendor_order` via a JSONB merge (`payload = payload || $patch || jsonb_build_object('vendor_submitter_checked_at', now())`). DB table: `lumera_vendor_order` (columns `id, order_id, vendor, vendor_order_id, status, payload, updated_at`). This is the most dangerous script in the repo and its triple gate (two env flags + per‑order draft‑reality check + the underlying client's `can_submit_orders`) is the core safety mechanism.

- **`scripts/fulfillment-drill.ts`** (`pnpm fulfillment:drill`) — read‑only GET `/admin/lumera/fulfillment`; prints live‑mode flags, per‑connection mode/publish/submit capability, vendor‑order/webhook/return‑case counts. No submission. The vendor‑client gating it surfaces lives in `apps/intelligence/src/vendors/clients.ts`: `healthCheck()` computes `can_submit_orders = connected && VENDOR_LIVE_MODE && AUTO_SUBMIT_VENDOR_ORDERS`; `createDraftOrder` returns `fixture_draft` (no creds) / `draft_order_proof_gated` (creds but no proof flag) / real; `submitOrder` returns `submission_gated` unless `can_submit_orders`.

### 9.4 Payment / money‑boundary proof

- **`scripts/paypal-capture-proof.ts`** (`pnpm paypal:proof`) — proves the **integer‑cents ↔ PayPal 2‑decimal string** boundary against the **real PayPal sandbox** by reusing the production helpers `formatPayPalAmount`/`paypalBaseUrl` from `apps/backend/src/modules/lumera-payment-paypal/money`. OAuth2 client‑credentials → CREATE an Orders v2 order for representative cent amounts (`[100, 99, 4200, 4914, 1234567]`) → read back → assert PayPal echoes the exact value. **No money moves** (create, never capture; buyer approval can't be automated). Safety: no‑op exit 0 when `PAYPAL_CLIENT_ID/SECRET` unset (CI‑safe); defaults to sandbox; **refuses live** unless `PAYPAL_PROOF_ALLOW_LIVE=true`. 15s timeouts. Prints the first approve URL for an optional manual capture. Env: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV`, `PAYPAL_PROOF_ALLOW_LIVE`.

### 9.5 Verification, regression & backup

- **`scripts/api-regression.ts`** (`pnpm test:regression` / driven by `verify:api`) — a hand‑rolled smoke suite (the header says "21", `verify-api.sh` says "23", CI job name says "22" — **the count is out of sync across three places**, a doc smell). Hits `MEDUSA_BACKEND_URL` with `x-publishable-api-key` (`PUBLISHABLE_KEY`/`NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`) and `x-cockpit-key` (`COCKPIT_KEY`). Covers: `/health`; `/store/products` (catalog + chapter metadata); `/store/regions` (USD); cart create; `/store/broadcast` (personalization, incl. populated `graph_rec` block + followed‑rail steering via `/store/preferences`); `/store/signal` POST; `/store/analyst` (grounded margin query, missing‑`q` 400, predictive demand forecast, churn risk); `/store/drops`; `/store/recommendations?strategy=graph_rec`; `/store/pricing` (asserts **`would_apply===false`** — dynamic pricing is staged, never auto‑applied, and within `[floor,ceiling]`); monetization tiers + subscribe/credits round‑trip; `/store/rewards` (Spark→Glow math); `/store/search` (hybrid, score+reason+facets); `/store/shepherd`; a **full money path** (`carts → address → shipping‑options → shipping‑method → payment‑collections → payment‑sessions(pp_system_default) → complete`, asserting an `order` is returned); and the dropship trio `/store/shipping-estimate`, `/store/product-truth/:handle`, `/store/rma` (empty body ⇒ 400, valid ⇒ 202 `submitted`). Exits non‑zero on any failure.

- **`scripts/verify-api.sh`** (`pnpm verify:api`) — the reproducible operational pipeline. `set -euo pipefail`, trap‑based cleanup that kills the spawned backend. Steps: ensure Postgres (5432) / optional Redis (6379, falls back to in‑memory) → **build `@alterxiv/shared`** (mandatory — Medusa's loader resolves the workspace dep from `dist/index.js` and does not transpile it; without the build, every migrate/seed/boot crashes at config load) → `medusa db:migrate` (180s timeout) → idempotent seed chain (only if `product` count < 1, via a `psql` count against the DB name parsed out of `DATABASE_URL`) → `setup-embeddings` → `seed-monetization` → `ensure-publishable-key` (captures the `pk_…` from stdout) → build + boot the backend **in production mode** (so the `medusa-config.ts` launch‑safety guard is exercised) → run `api-regression.ts`. Injects **ephemeral throwaway secrets** (`JWT_SECRET`, `COOKIE_SECRET`, CORS, `COCKPIT_KEY=verify_ephemeral_cockpit_key`) clearly labelled "never real credentials." `_build_ok` reuses a complete build (admin needs `.medusa/server/public/admin/index.html`; admin‑disabled needs only `.medusa/server`). Default DSN/PK are the dev `alterxiv` values.

- **`scripts/verify-rewards.ts`** (`pnpm verify:rewards`, via `medusa exec`) — resolves the `monetization` service, awards for a $100 order non‑patron (expect 500 credits = 5%) then patron (expect 1000 = 5%×2), and asserts lifetime 1500, `reward_tier === 'Seeker'`, `credits_to_next === 1000`, `multiplier === 2`. Prints PASS/FAIL (does not exit non‑zero on FAIL — informational).

- **`scripts/backup.ts`** (`pnpm backup`) — defensive `pg_dump` wrapper. Streams `pg_dump --no-owner --no-privileges --clean --if-exists $DATABASE_URL | gzip > $BACKUP_DIR/lumera-<ts>.sql.gz` (default `./backups`). **Never throws**: missing `DATABASE_URL` or `pg_dump` → prints guidance, exits 0; redacts credentials in logs (`safeUrl`); cleans up partial files; prints restore command. Optional `BACKUP_S3_BUCKET`/`BACKUP_S3_PREFIX` only *prints* an `aws s3 cp` hint (it deliberately does not shell out to the AWS CLI). Env: `DATABASE_URL`, `BACKUP_DIR`, `BACKUP_S3_BUCKET`, `BACKUP_S3_PREFIX`.

### 9.6 The launch‑gate ladder

There are **three** distinct preflight scripts forming a ladder from "is the code pushable?" to "are we live‑launch ready?". Understanding which is a blocker vs. advisory is essential.

1. **`scripts/preflight.ts`** (`pnpm preflight`) — **commerce/deployment readiness**. Two modes: default **code‑readiness** (deployment gaps are `warn`, never block) vs **`--live`** / `--mode=live` / `LUMERA_LIVE_PROOF=true` / `VENDOR_LIVE_MODE=true` (gaps become `fail` blockers). Opens `DATABASE_URL` and counts: products, publishable keys, regions, sales channels, shipping options, the `vector` extension, and `product_embedding` rows. Env checks: `JWT_SECRET`, `COOKIE_SECRET`, `STORE_CORS`, `ADMIN_CORS` (deployment‑grouped); `REDIS_URL`, `ANTHROPIC_API_KEY`, `COCKPIT_KEY`, S3 trio, transactional‑email combo (recommended). Vendor readiness (Printify/Printful/CJ creds, live Stripe key, `MEDUSA_ADMIN_API_TOKEN`) is a blocker only under `--live`. Computes a weighted **readiness %** (`70×blockerRatio + 30×recommendedRatio`), prints a redacted DSN, and exits `0` only if all blockers pass (else `1`; `2` on crash). DB tables read: `product`, `api_key`, `region`, `sales_channel`, `shipping_option`, `pg_extension`, `product_embedding`.

2. **`scripts/launch-preflight.ts`** (`pnpm launch:preflight`) — the **local gate chain**. Sequentially `spawnSync`s `pnpm test` → `pnpm build` → `pnpm preflight` → `pnpm vendor:preflight` → `pnpm launch:proof`, failing fast at the first non‑zero exit. This is the "everything green before push" command.

3. **`scripts/launch-proof.ts`** (`pnpm launch:proof`) — the **safety/integrity proof**. Runs `vendor:preflight` → `vendor:test` → `curation:e2e` → `fulfillment:sandbox` → `vendor-orders:submit` (gate), then three bespoke proofs:
   - **`owner:actions`** (see below) — non‑zero ⇒ blocker.
   - **`legalPlaceholderFailures()`** — scans `apps/storefront/src/app/legal/{terms,privacy,returns}/page.tsx` line‑by‑line for placeholder patterns (`[…]`, "company legal name", "registered address", `lumera.example`, "jurisdiction", "venue", "tailor every figure"). Any match blocks launch — prevents shipping templated legal copy.
   - **`fakeReviewFailures()`** — scans `p/[handle]/page.tsx`, `packages/shared/src/curation.ts`, `apps/backend/src/lib/lumera-publish.ts` for "fake review / generated review / placeholder review / 5‑star review" language. Any match blocks.
   Aggregates all blockers and throws if any exist. This script is the mechanical enforcement of the "no fabricated trust signals / no placeholder legal" non‑negotiables.

- **`scripts/owner-actions.ts`** (`pnpm owner:actions`) — the **human‑action ledger**. Lists `requiredEnv` (24 keys incl. `DATABASE_URL`, `REDIS_URL`, secrets, CORS, `MEDUSA_ADMIN_API_TOKEN`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `LUMERA_SALES_CHANNEL_ID`, `LUMERA_SHIPPING_PROFILE_ID`, Stripe + all vendor creds/webhook secrets, `COCKPIT_KEY`) and flags any that are missing or contain `change_me`/`...`. Lists seven **founder approvals that code cannot complete** (legal copy live; supplier list approved; first 20 products approved; sample purchases approved; Stripe live approved after test proof; vendor live submission approved after sandbox proof; paid campaign spend approved separately). Warns if `VENDOR_LIVE_MODE`/`AUTO_SUBMIT_VENDOR_ORDERS` are on. **Only exits 1 in `--live` mode with missing env** — in code mode it's purely advisory.

**Ladder summary**: `launch:preflight` (orchestrator) → `{test, build, preflight (commerce), vendor:preflight (vendor env), launch:proof}`; `launch:proof` → `{vendor:test, curation:e2e, fulfillment:sandbox, vendor-orders:submit-gate, owner:actions, legal-placeholder, no-fake-review}`. The design cleanly separates **proof layers** (build/test ≠ commerce env ≠ vendor readiness ≠ founder approvals), matching the CLAUDE.md requirement.

### 9.7 Backend runtime config — `medusa-config.ts`

- **Launch safety guard** (top of file): in `NODE_ENV=production`, throws a fatal error if any of `JWT_SECRET, COOKIE_SECRET, DATABASE_URL, STORE_CORS, ADMIN_CORS` are unset — "refusing to boot on insecure/localhost defaults." This is why `verify-api.sh` injects ephemeral secrets to boot in prod mode.
- **Admin**: `disable: MEDUSA_ADMIN_DISABLED === 'true'` (CI uses this for headless boot).
- **`projectConfig.http`**: CORS from env; `authCors` falls back to `STORE_CORS` then `http://localhost:3000`; `jwtSecret`/`cookieSecret` fall back to the literal `'supersecret'` — **but only reachable in non‑prod**, since the guard above blocks prod boot without them. Still, `'supersecret'` as a dev default is a smell if the guard is ever bypassed.
- **Custom modules** (the "nervous system"): `drops`, `signal`, `personalization`, `recommendation`, `monetization`, `lumera`.
- **Conditional infra**: Redis event‑bus + workflow‑engine modules are added **only when `REDIS_URL` is set** — otherwise in‑memory defaults (so migrate/seed/boot never hang on a missing Redis). Good operational hygiene.
- **Payment providers** (conditional, layered on top of always‑on `pp_system_default`): Stripe added only when `STRIPE_API_KEY` set (`webhookSecret: STRIPE_WEBHOOK_SECRET`, `capture: STRIPE_MANUAL_CAPTURE !== 'true'`, `automaticPaymentMethods:true`; native webhook route `{BACKEND_URL}/hooks/payment/stripe_stripe`); PayPal (`./src/modules/lumera-payment-paypal`) added only when `PAYPAL_CLIENT_ID` set (`env: PAYPAL_ENV==='live'?'live':'sandbox'`).
- **Fulfillment**: two providers — `@medusajs/medusa/fulfillment-manual` (id `manual`) and the native `./src/modules/lumera-fulfillment` (id `dropship`). Manual stays default until a shipping option is pointed at `lumera_dropship`.
- **File storage**: S3/MinIO provider **only when all three of `S3_FILE_URL`+`S3_ACCESS_KEY_ID`+`S3_SECRET_ACCESS_KEY`** are present (`forcePathStyle:true` for MinIO); otherwise local disk (`upload_dir:'static'`). The comment correctly notes a half‑set `S3_FILE_URL` must not boot the S3 provider — the AND‑guard prevents a startup crash.
- **Promotions** module always on.

### 9.8 Storefront config

- **`next.config.ts`** — `transpilePackages:['@alterxiv/shared']`, `reactStrictMode:true`, `outputFileTracingRoot` set to repo root (silences the monorepo multi‑lockfile warning), `experimental.reactCompiler:true` (automatic memoization; full PPR deferred — needs Next canary). `images.remotePatterns` allows **any HTTPS host** (`hostname:'**'`) — necessary because product images come from arbitrary marketplace CDNs, but it's a broad allowance (SSRF/abuse surface for the Next image optimizer; worth noting). **Security headers** on `/:path*`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, **HSTS** `max-age=63072000; includeSubDomains; preload`, `Permissions-Policy` (camera/mic/geo off), and a **`Content-Security-Policy-Report-Only`** (not enforcing — by design, so it can't break the app; the allowlist includes Plausible/PostHog/Sentry). The CSP is Report‑Only, so it provides telemetry but **no actual XSS mitigation yet** — a deliberate, documented "promote later" gap.
- **`tailwind.config.ts`** — the Lumera design system as tokens: palette (`eclipse #0B0B0D`, `corona #E9D8A6`, `firstlight #F4EEDD`, `signal #6E5BD6`, `umbra`), back‑compat aliases (`obsidian`/`void`/`altar.*` remapped onto the new palette), per‑chapter accent colors, sacred letter‑spacing (`0.42em`/`0.28em`), micro/label font sizes, CSS‑only sacred textures (`sacred-grain`, `altar-veil`, `gold-foil`), a reverent ease (`cubic-bezier(0.22,1,0.36,1)`) + 700ms duration, and keyframes (`fade-up`, `shimmer`, `pulse-scarce`). `darkMode:'class'`. Fonts wired to `next/font` CSS vars (`--font-serif`/`--font-sans`).
- **`postcss.config.js`** — `tailwindcss` + `autoprefixer`. **`vitest.config.ts`** — only sets `esbuild.jsx:'automatic'` so JSX modules (e.g. the `next/og` share card) transform without an explicit React import under Vitest.

### 9.9 TypeScript configs

- **backend** — `target ES2022`, `module/moduleResolution NodeNext`, `strict`, `experimentalDecorators`+`emitDecoratorMetadata` (Medusa/MikroORM models), `outDir .medusa/server`, includes `src`+`medusa-config.ts`, ts‑node `transpileOnly`. `lint` = `tsc --noEmit -p tsconfig.json`.
- **storefront** — `target ES2017`, `moduleResolution bundler`, `noEmit`, `jsx preserve`, `incremental`, Next plugin, paths `@/* → ./src/*` and **`@alterxiv/shared → ../../packages/shared/src/index.ts`** (storefront imports the shared *source*, not dist — diverges from the backend, which imports the built dist; this is why the backend Dockerfile/verify must build shared first but the storefront doesn't strictly need to).
- **intelligence** — `target ES2022`, `module commonjs`, `outDir dist`, `strict`. `start` runs the compiled `dist/orchestrator/index.js`.
- **shared** — `target ES2021`, `module commonjs`, `declaration:true`, `outDir dist`, `rootDir src` (emits `.d.ts` so consumers get types from dist).

### 9.10 Docker & Compose

- **`docker-compose.yml`** — full local/staging stack. `postgres` = **`pgvector/pgvector:pg16`** (so the `vector` extension is available out of the box) with healthcheck + named volume `pgdata`; `redis:7-alpine` + `redisdata`. Three app services build from repo‑root context with per‑app Dockerfiles:
  - `backend` — `NODE_ENV=production`, internal DSN/Redis, secrets default to `dev_*_change_me`, `ANTHROPIC_API_KEY` passthrough, port 9000. Depends on healthy Postgres.
  - `storefront` — `NEXT_PUBLIC_*` passed as **build args** (inlined at build time; comment correctly warns a localhost‑baked image points the browser at localhost), port 3000.
  - `intelligence` — runs the CONGREGATION orchestrator, `CLAUDE_MODEL` default `claude-opus-4-8`, no published ports (worker).
  Header documents the one‑time `db:migrate` + seed run. **All defaults are explicitly DEV‑ONLY** (`dev_jwt_change_me` etc.) — production must override; nothing here would pass the prod launch guard with defaults.
- **Three `Dockerfile`s** — identical pattern: `node:22-slim`, `corepack enable`, copy lockfile+workspace manifests first (layer caching), `pnpm install --frozen-lockfile --filter @alterxiv/shared... --filter <app>...` (only the needed subtree), copy source, **build shared first then the app**, `NODE_ENV=production`, app‑specific `CMD`.
  - **backend** additionally installs `python3`+`build-essential` (native deps like `sharp`), supports `--build-arg MEDUSA_ADMIN_DISABLED=true` for an API‑only image, and **fails the build** if admin is enabled but `.medusa/server/public/admin/index.html` is missing (catches restricted‑egress build failures at build time instead of crash‑looping at runtime). `CMD pnpm exec medusa start`.
  - **storefront** declares `NEXT_PUBLIC_MEDUSA_URL`/`NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` ARGs; fonts are self‑hosted (`next/font/local`) so no outbound Google Fonts at build. `CMD pnpm --filter storefront start`.
  - **intelligence** runs the long‑lived orchestrator (`CMD pnpm --filter intelligence start`); comment notes override with `start:operator` for the one‑shot OPERATOR.
  - All three are explicitly "correctness‑first; harden/slim later" — i.e. **single‑stage, not multi‑stage**, no non‑root `USER`, dev toolchain left in the backend image. Reasonable for now but a hardening backlog item (image size + running as root).
- **`.dockerignore`** — keeps the context small/secret‑free: ignores all `node_modules`, pnpm/npm stores, **all `.env`/`.env.*` except `.env.example`/`.env.local.example`**, build outputs (`.next`, `.medusa`, `dist`, `build`, `.turbo`), `.git`/`.github`/editor dirs, coverage/logs/`.DS_Store`. Correctly prevents secrets and host build artifacts from leaking into images.

### 9.11 CI & GitHub config

- **`.github/workflows/ci.yml`** — triggers on `push` to three specific branches (`deploy/medusa-cloud`, `claude/epic-clarke-XPZhF`, `claude/affectionate-clarke-KJ8O1`), **all PRs**, and `workflow_dispatch`. Concurrency cancels in‑progress runs per ref. Two jobs:
  - **green‑gates**: `pnpm install --frozen-lockfile` → `lint` → `test` → `build` → `pnpm audit --audit-level=high || true` (non‑blocking) → a **secret scan** that `grep`s `apps packages scripts` for PEM private keys / `sk_live_…` / `AKIA…` AWS keys and **fails hard** on a hit.
  - **verify-api**: spins up `pgvector/pgvector:pg16` (DB `alterxiv_verify`) + `redis:7` service containers, sets `MEDUSA_ADMIN_DISABLED=true` and `RATE_LIMIT_DISABLED=true`, installs `postgresql-client` (needed by the idempotency check in `verify-api.sh`), then `pnpm verify:api`.
  - **Smells**: the branch‑push trigger list is hard‑coded to ephemeral `claude/*` branches (won't fire on the current `claude/status-check-jd5zmw` branch — only the PR trigger would). The job name says "22 regressions" while the script header says 21 and the shell says 23 — the regression count is stale in three independent places. Node 22 in CI matches the Dockerfiles (`node:22-slim`); good consistency.
- **`.github/dependabot.yml`** — weekly (Monday) grouped npm updates for `/`, `/apps/backend`, `/apps/intelligence`, `/apps/storefront`, `/packages/shared` (one grouped PR per workspace, limit 5 each) plus a github‑actions stream. Labels + conventional `chore(deps)`/`chore(ci)` prefixes. `packages/data` is correctly excluded (no manifest).
- **`.github/CODEOWNERS`** — `* @Beexly` (single owner, all paths). **`pull_request_template.md`** — enforces the project ethos: a "Verification" checklist (`test`/`lint`/`build`/`verify:api` — "do not check a box you did not run"), a "Gates respected" checklist (no autonomous money/publish/destructive action; vendor live flags not enabled; no secrets committed; least‑privilege; docs match reality), and a mandatory screenshots section for UI changes.

### 9.12 The full `.env.example` surface (grouped)

`.env.example` is ~212 lines. Every var, grouped by purpose:

- **Core**: `DATABASE_URL`, `REDIS_URL`, `NODE_ENV`.
- **Medusa / storefront wiring**: `MEDUSA_BACKEND_URL`, `NEXT_PUBLIC_MEDUSA_URL`, `JWT_SECRET`, `COOKIE_SECRET`, `STORE_CORS`, `ADMIN_CORS`, `PUBLISHABLE_KEY`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SOCIAL_LINKS` (deliberately empty — "placeholder handles must not ship", enforced indirectly by the SEO `sameAs` logic).
- **AI / Intelligence**: `ANTHROPIC_API_KEY`, `CLAUDE_MODEL` (`claude-opus-4-8`), `EMBEDDING_DIM` (1536 — note: a vestige; the actual seeded embeddings are 5‑dim chapter vectors, so this var is misleading).
- **Alternative LLM (concierge only)**: `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, `SHEPHERD_MODEL` — points Polaris/Shepherd at any OpenAI‑compatible endpoint; explicitly scoped to the concierge, not the autonomous agents.
- **Imagery**: `HIGGSFIELD_API_KEY`.
- **Data radar (sourcing)**: `OXYLABS_USER`, `OXYLABS_PASS`, `APIFY_TOKEN`, `APIFY_{ALIEXPRESS,ALIBABA,SHEIN,AMAZON}_ACTOR`, `LUMERA_RADAR_SOURCE`, `LUMERA_RADAR_LIMIT`, `LUMERA_RADAR_FULFILLMENT`, `LUMERA_RADAR_QUERIES`.
- **Vendor curation/fulfillment**: `PRINTIFY_{TOKEN,SHOP_ID,WEBHOOK_SECRET}`, `PRINTFUL_{TOKEN,STORE_ID,WEBHOOK_SECRET}`, `CJ_{EMAIL,API_KEY,ACCESS_TOKEN,WEBHOOK_SECRET,SANDBOX}`; SaaS bridges `SPOCKET/SYNCEE/MODALYST/DROPIFIED_{API_KEY,API_URL}`; flags `VENDOR_LIVE_MODE=false`, `AUTO_PUBLISH_APPROVED=true`, `AUTO_SUBMIT_VENDOR_ORDERS=false`, `VENDOR_DRAFT_ORDER_PROOF=false`, `DEFAULT_FULFILLMENT_VENDOR`, `MANUAL_SUPPLIER_VERIFIED`, `LUMERA_NATIVE_FULFILLMENT=false`, `SUPPLIER_MARGIN_FLOOR=0.38`, `MAX_SHIPPING_DAYS=12`, `MEDUSA_ADMIN_API_TOKEN`, `LUMERA_SALES_CHANNEL_ID`, `LUMERA_SHIPPING_PROFILE_ID`. **Note the default posture: every dangerous flag defaults to the safe value** (`VENDOR_LIVE_MODE=false`, `AUTO_SUBMIT_VENDOR_ORDERS=false`).
- **Outbound marketplaces**: `SHOPIFY_{SHOP,ACCESS_TOKEN}`, `WOOCOMMERCE_{URL,KEY,SECRET}`, `ETSY_{API_KEY,ACCESS_TOKEN,SHOP_ID}`, `AMAZON_SP_{CLIENT_ID,CLIENT_SECRET,REFRESH_TOKEN,SELLER_ID,ACCESS_TOKEN}` (comment: SigV4 not implemented — Amazon listing stays gated `requires_sp_api_auth`), `CHANNEL_LIVE_MODE=false`.
- **Payments**: `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_MANUAL_CAPTURE`, `SOLANA_RPC_URL` (web3, phase 3+). PayPal under the shipping group (below).
- **Asset storage**: `S3_FILE_URL`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION=us-east-1`, `S3_BUCKET=lumera`.
- **Security/hardening**: `RATE_LIMIT_WINDOW_MS=60000`, `RATE_LIMIT_MAX=240`, `RATE_LIMIT_OPS_MAX=120`, `RATE_LIMIT_DISABLED=false`.
- **Observability & email**: `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `NEXT_PUBLIC_POSTHOG_{KEY,HOST}`, `NEXT_PUBLIC_UMAMI_{WEBSITE_ID,SRC}`, `NEXT_PUBLIC_CONSENT_REQUIRED` (GDPR gate — analytics load only after consent unless `'false'`), `RESEND_API_KEY`, `NOTIFICATION_EMAIL_FROM`, `KLAVIYO_API_KEY`, `KLAVIYO_API_REVISION`; lifecycle job toggles `ABANDONED_CART_{ENABLED=false,MIN_AGE_HOURS,MAX_AGE_HOURS}`, `REVIEW_REQUEST_{ENABLED=false,DELAY_DAYS,MAX_DAYS}`, `DROP_GRADER_ENABLED=false` (the LATR loop that *proposes* restock/kill into the founder inbox — explicitly "never executes").
- **Shipping & PayPal**: `EASYPOST_API_KEY`, `SHIPPO_API_KEY` (EasyPost precedence; flat fallback when neither), `LUMERA_FLAT_SHIPPING_USD=0`, `SHIP_FROM_POSTAL`, `SHIP_FROM_COUNTRY=US`, `PAYPAL_{CLIENT_ID,CLIENT_SECRET,ENV=sandbox}`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (both render‑gated client‑side).
- **Launch hardening / compliance**: `COMPANY_POSTAL_ADDRESS` (CAN‑SPAM — required in prod or marketing jobs skip the send), `UNSUBSCRIBE_SECRET` (HMAC for one‑click unsubscribe; falls back to `COCKPIT_KEY` then a dev constant), `COCKPIT_REQUIRE_KEY=false` (force ops‑API auth even outside prod — should be `true` on any reachable staging), `REVIEWS_REQUIRE_VERIFIED_PURCHASE` (defaults ON in prod — backstops AggregateRating integrity).

**Documentation gaps / risks worth flagging to the reviewer:**

- **`COCKPIT_KEY` has no assignment line in `.env.example`** — it appears only inside two *comments* (lines 203, 206). Yet `owner-actions.ts` lists it as required, `preflight.ts` treats its absence as a `warn`, `verify-api.sh` injects an ephemeral one, and `curate.ts`/`publish-approved.ts`/`fulfillment-drill.ts` send it as `x-cockpit-key`. An operator copying `.env.example` will not have a `COCKPIT_KEY=` line to fill, which can silently leave ops/BI APIs unauthenticated in a non‑prod deploy unless `COCKPIT_REQUIRE_KEY` is also set. This is a real config‑hygiene bug.
- **Vendor‑provider link guard in `setup-commerce.ts`** (`listLocationFulfillmentProviders?.(...)` ⇒ `null` ⇒ "create") is effectively a no‑op guard on builds lacking that method; relies on the workflow tolerating duplicates.
- **`ensure-publishable-key.ts` writes a live token to world‑readable `/tmp/alterxiv-pk`** — minor secret‑handling smell.
- **Regression count is stale in three places** (21 / 22 / 23) across the script header, `verify-api.sh`, and the CI job name.
- **CI push trigger branches are hard‑coded ephemeral `claude/*` names** — push CI won't fire on most branches; only PR/dispatch will.
- **`next.config.ts` allows any HTTPS image host** (`hostname:'**'`) and the **CSP is Report‑Only** (no enforced XSS mitigation yet) — both are documented/intentional but remain open hardening items.
- **Dockerfiles are single‑stage, run as root, and the backend ships its build toolchain** — explicitly deferred hardening.
- **`EMBEDDING_DIM=1536` in `.env.example` contradicts the actual 5‑dim chapter embeddings** seeded by `setup-embeddings.ts` — a misleading leftover.
- **Dev secret defaults** (`'supersecret'` in `medusa-config.ts`, `dev_*_change_me` in compose) are only reachable in non‑prod thanks to the production launch guard, but the guard is the only thing standing between those defaults and a misconfigured prod boot.

Key files referenced: `/home/user/Clouds-bruh/scripts/*` (25 files), `/home/user/Clouds-bruh/turbo.json`, `/home/user/Clouds-bruh/package.json`, `/home/user/Clouds-bruh/pnpm-workspace.yaml`, `/home/user/Clouds-bruh/docker-compose.yml`, `/home/user/Clouds-bruh/.dockerignore`, `/home/user/Clouds-bruh/.env.example`, `/home/user/Clouds-bruh/apps/{backend,storefront,intelligence}/Dockerfile`, `/home/user/Clouds-bruh/apps/backend/medusa-config.ts`, `/home/user/Clouds-bruh/apps/storefront/{next.config.ts,tailwind.config.ts,postcss.config.js,vitest.config.ts}`, all four `tsconfig.json`, and `/home/user/Clouds-bruh/.github/{workflows/ci.yml,dependabot.yml,CODEOWNERS,pull_request_template.md}`.


---

## 10. Cross-Cutting: Security Model, Intelligence Layer, Data Flow & Test Coverage

This section synthesizes the platform's security posture, the end-to-end intelligence pipeline, the data-flow topology, and the test suite, and closes with a prioritized risk list for the reviewer. Lumera is a Turborepo/pnpm monorepo: `apps/backend` (Medusa v2), `apps/storefront` (Next.js 15), `apps/intelligence` (the agent runtime + Learning Loop + INTROSPECTION), `packages/shared` (the SIGNAL taxonomy + types — the inter-app contract), and `packages/data`. The npm scope is `@alterxiv/*` (the project's prior name, "AlterXIV/Lumera"); the brand is "Lumera."

---

### 10.A SECURITY MODEL

The platform exposes four trust boundaries: (1) the public storefront-facing store API, (2) the founder ops surfaces (cockpit/approvals/analyst/admin-lumera), (3) inbound webhooks (Stripe + dropship vendors), and (4) the autonomous-agent action plane. Each has a distinct gate.

#### 10.A.1 Authentication & authorization

**Customer JWT (Medusa-native).** Storefront customer identity is standard Medusa v2 emailpass auth, implemented client-side in `apps/storefront/src/lib/customer.ts`:
- `register()` → `POST /auth/customer/emailpass/register` (auth identity) then `POST /store/customers` (profile).
- `login()` → `POST /auth/customer/emailpass` returns a JWT.
- `authHeaders(token)` attaches `Authorization: Bearer` + the publishable key (`NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`).

The JWT is **persisted in a cookie via a Next.js `/api/session` route handler, not `localStorage`** — a deliberate XSS-exfiltration mitigation documented in the file header. Good hygiene.

**Cockpit key (founder ops).** `apps/backend/src/lib/lumera-auth.ts` exports `authorizeOps(req,res)`. The logic:
```ts
const required = process.env.COCKPIT_KEY;
const provided = req.headers['x-cockpit-key'] as string;
if (required && provided !== required) { res.status(401)...; return false; }
const mustHaveKey = NODE_ENV === 'production' || COCKPIT_REQUIRE_KEY === 'true';
if (!required && mustHaveKey) { res.status(401)... return false; }  // fail-closed
return true;
```
Key is **header-only** (never query string — explicitly to avoid leaking into logs/proxies/history) and **fails closed in production** and on any deploy with `COCKPIT_REQUIRE_KEY=true` (intended for staging/preview). Every `/admin/lumera/*` route and `/store/cockpit*`, `/store/analyst` route calls `authorizeOps` first (verified across all 10 admin routes + cockpit/approvals). **Two weaknesses:** (a) the comparison `provided !== required` is **not constant-time** — a timing side-channel on the cockpit key, minor but real for a single shared secret; (b) it is a **single shared static secret with no rotation, no per-user identity, and no audit of who acted** — every founder-plane action is attributable only to "whoever holds the key."

**Admin token (agent → Medusa).** The intelligence app publishes products through the Medusa **Admin API** using a bearer token from `MEDUSA_ADMIN_API_TOKEN` / `MEDUSA_ADMIN_TOKEN` (`apps/backend/src/lib/lumera-publish.ts`, `adminHeaders()`). If absent, publish is blocked and returns the would-be payload (a useful dry-run rather than a silent failure).

**IDOR posture — partially hardened, partially open.** `apps/backend/src/api/middlewares.ts` adds `authenticate('customer', ['bearer','session'])` to **only** `GET /store/monetization/wallet` and `GET /store/monetization/entitlements`. Those routes then read `req.auth_context.actor_id` (not a client-supplied id), correctly closing the IDOR that previously let any `?customer_id=` read another customer's balance/ledger. **However, several adjacent money/identity routes still trust a client-supplied `customer_id`** with no auth binding:
- `POST /store/monetization/credits` — `{ customer_id, amount }` mints Lumens to an arbitrary id.
- `POST /store/monetization/subscribe` — `{ customer_id, tier_key }` grants membership to an arbitrary id.
- `POST /store/monetization/gift-cards` (redeem) — `{ code, customer_id }`.
- `GET /store/rewards?customer_id=` — reads anyone's Luminance balance/tier.

These are guarded by the **minting gate** (below) in production, but `rewards` GET and gift-card redemption are an IDOR/abuse surface independent of minting. **Reviewer: confirm whether these are intended to be behind auth.**

#### 10.A.2 Rate limiting

`apps/backend/src/lib/security.ts` → `rateLimit()`: in-memory per-IP token bucket, `RATE_LIMIT_WINDOW_MS` (default 60s) / `RATE_LIMIT_MAX` (default 240); ops routes get `RATE_LIMIT_OPS_MAX` (default 120). Applied to `/store/*` globally and `/admin/lumera/*` in middlewares. Auto-disabled when `NODE_ENV=test` or `RATE_LIMIT_DISABLED=true`. Client IP is taken from `x-forwarded-for` (first hop). **Limitations the code itself flags:** it is **per-process in-memory** — in a multi-instance deploy the real limit is `N × max`, and `x-forwarded-for` is **spoofable** unless a trusted proxy overwrites it, so an attacker rotating that header trivially evades the limiter. The header comment correctly recommends a Redis-backed limiter for production. An `setInterval` cleanup (`.unref()`) bounds the bucket map.

#### 10.A.3 Webhook signature verification

Two schemes, both in `apps/backend/src/lib/lumera-db.ts`, both verifying over **raw bytes** preserved by `bodyParser: { preserveRawBody: true }` on `/hooks/stripe` and `/hooks/vendor/*` (middlewares.ts):

- `verifyStripeWebhook(rawBody, sigHeader, secret=STRIPE_WEBHOOK_SECRET, toleranceSec=300)` — implements Stripe's real `t=…,v1=…` scheme: HMAC-SHA256 over `${t}.${rawBody}`, **300s timestamp tolerance** (replay protection), constant-time compare via `safeEqual` (length-check then `crypto.timingSafeEqual`). Returns typed proofs (`stripe_signature_verified`, `timestamp_outside_tolerance`, `malformed_signature`, etc.).
- `verifyVendorWebhook(vendor, payload, headers, rawBody?)` — generic HMAC-SHA256 over the raw body, secret per vendor (`PRINTIFY_/PRINTFUL_/CJ_WEBHOOK_SECRET`), accepts multiple header names and strips a `sha256=` prefix.

**Both fail closed in production** when no secret is configured (`missing_secret_in_production`) and **accept-and-flag in dev** (`unsigned_no_secret_configured`) — the correct dual-mode posture. All four hook routes return `401` on `!verification.valid` before any DB write. **Caveats:** (1) the Stripe hook route (`api/hooks/stripe/route.ts`) only *records* the event (`recordWebhook`) and returns 202 — it does **not** drive Medusa order/payment state from it, so the Stripe webhook is currently an audit log, not a payment-reconciliation path. (2) `verifyVendorWebhook` falls back to `JSON.stringify(payload)` when `rawBody` is absent, which won't match a real provider HMAC — only safe because raw body is preserved by middleware. The webhook test (`lumera-webhook.test.ts`) explicitly proves the raw-vs-reserialized distinction.

#### 10.A.4 Money-minting / publish / vendor gates (the "no autonomous money movement" rule)

This is the platform's signature control and it is enforced at multiple layers:

- **`mintingBlocked()`** (security.ts): returns true (refuse) when `NODE_ENV=production` AND a **live** Stripe key is present (`STRIPE_API_KEY` not starting with `sk_test`) AND `MONETIZATION_ALLOW_UNPAID_ISSUE !== 'true'`. Gates gift-card issuance, Lumens credit purchase, and subscribe. The invariant: store value cannot be minted unbound from a captured payment in real-money mode.
- **`paymentSimulationAllowed()`**: `NODE_ENV !== 'production'`. Consumed by the PayPal provider (`apps/backend/src/modules/lumera-payment-paypal/service.ts`): in production, an unconfigured/failed capture or refund **throws** (`paypal_capture_unavailable`, `paypal_refund_failed`) instead of returning a simulated success. This is the **"money-honesty invariant"** — a charge/refund that didn't actually happen can never be reported to Medusa as success. Well-implemented: `capturePayment`/`refundPayment` throw on a real attempt that doesn't return `res.ok`.
- **Publish gate** (`lumera-publish.ts` → `publishBlockers()`): a candidate cannot be published unless status ∈ {ready_for_review, approved, published, live}, media_rights is not unknown/blocked, `gross_margin >= SUPPLIER_MARGIN_FLOOR` (default 0.38), `lead_time_days <= MAX_SHIPPING_DAYS` (default 12), manual suppliers are `MANUAL_SUPPLIER_VERIFIED`, and notably it **blocks if `VENDOR_LIVE_MODE=true` while the Stripe key is still test mode** (`stripe_still_test_mode`) — preventing live fulfillment on fake payments.
- **Vendor order gate** (`lumera-order-routing.ts`): order drafts are only `ready_for_vendor_submission` when **both** `VENDOR_LIVE_MODE=true` AND `AUTO_SUBMIT_VENDOR_ORDERS=true`; otherwise `staged_for_approval`. Missing supplier SKUs → `blocked_missing_supplier_sku`.
- **Agent escalation gate** (see 10.B.4): privileged tool calls never auto-execute.

#### 10.A.5 Input validation, SSRF, CORS, secrets

- **SIGNAL validation** (`api/store/signal/route.ts`, `validateSignal`): the storefront fires this **unauthenticated**, so the route caps body to `MAX_BODY_BYTES=16384` (413), validates `type` against the `EVENT_TYPES` set, requires `visitor_id` (≤256 chars), truncates all string fields to 256 chars, caps context to 16 keys. Strong defensive validation on the one open write path into MIND/ORACLE.
- **Shepherd LLM endpoint** (`api/store/shepherd/route.ts`): unauthenticated and **costs tokens per call** — guarded by `MAX_MESSAGES=20`, `MAX_TEXT=4000`, last-10-turn truncation, and IP rate limiting. Falls back to a scripted reply when no provider is live.
- **Analyst BI** (`api/store/analyst/bi.ts`): natural-language questions are matched (keyword scoring) to a **static allowlist of parameterized SQL** — there is **no dynamic SQL from user input**, eliminating injection on this path. All cockpit/BI SQL is parameterized and run under `BEGIN READ ONLY` transactions.
- **SSRF guard** (`assertSafeOutboundUrl`): blocks non-http(s), loopback, link-local (`169.254.169.254`, cloud metadata), and RFC-1918 ranges (`10/8`, `192.168/16`, `172.16-31/12`), with optional host allowlist. Intended for any fetch over user/scraped input. **Smell:** grep shows it is **not consistently invoked** across the agent connector/scraper tools (the publish path and several outbound fetches use raw `fetch` without it). `fetchWithTimeout` (10s `AbortSignal.timeout`) prevents hung agent loops.
- **CORS**: `STORE_CORS`/`ADMIN_CORS` in `.env.example` default to localhost — Medusa-standard, must be set per environment.
- **Secrets**: `.env.example` ships `JWT_SECRET=change_me`, `COOKIE_SECRET=change_me`, `ANTHROPIC_API_KEY=sk-ant-...` placeholders. The unsubscribe-link HMAC (`email-compliance.ts`) falls back `UNSUBSCRIBE_SECRET || COCKPIT_KEY || 'lumera-dev-unsubscribe-secret'` — a **hardcoded dev secret** if neither env is set, which would let anyone forge unsubscribe links in a misconfigured deploy (the comment says to set it in prod; there is no fail-closed assertion). Unsubscribe signature compare is constant-time.

---

### 10.B INTELLIGENCE LAYER — END TO END

The five subsystems (SIGNAL, MIND, ORACLE, CONGREGATION, Learning Loop + INTROSPECTION) form one closed loop. Trace one event:

#### 10.B.1 SIGNAL emission → ingest
The storefront emits via `apps/storefront/src/lib/signal.ts` `signal(type, entity_id, value, context)` — anonymous-first `visitor_id` (cookie `axiv_vid`, set by middleware so SSR and client agree), `session_id` (sessionStorage), `keepalive: true` fetch to `POST /store/signal`. `PageSignal.tsx` fires the primary event once per page plus dwell/scroll via `useBehavior`. Every meaningful interaction component (`ProductCard`, `DropBoard`, `ProductRail`, etc.) emits.

`POST /store/signal` validates, then `signal.ingest(event)` (`modules/signal/service.ts`): **dual write** — Postgres `signal_event` (via `createSignalEvents`) AND a Redis stream `signal:events` (`XADD … MAXLEN ~ 50000` — bounded). It then calls `mind.observe(event)` synchronously for real-time personalization.

#### 10.B.2 MIND — real-time profile update
`modules/personalization/service.ts` `observe(event)`: O(1) per event. Loads/creates the `visitor_profile`, **decays** all affinity maps by `DECAY=0.95`, then adds `REWARD_WEIGHTS[type] × 0.1` to the chapter/category/price_band/aesthetic dimensions present in `event.context`, accumulates an `_intent` score for high-intent events, and reassigns a **segment** (`segmentFor`): `intent≥20 → high_intent`, dominant chapter armor → `armor_devotee`, `intent≥5 → patron`, else `new_seeker`. `identify(visitorId, customerId)` merges the anonymous profile forward (element-wise max) on login. `setPreferences()` ("Tune the Broadcast") lets a visitor follow (boost to 5) or mute (zero) a chapter — explicit user steering of the algorithm. Affinity is stored as JSON, not the `vector(1536)` the architecture doc describes (see risks).

#### 10.B.3 ORACLE — recs + dynamic merchandising
`modules/recommendation/service.ts`:
- `forVisitor(visitorId, strategy, limit)`: five strategies via **pgvector** `embedding <=> $vec` cosine: `for_you` (visitor affinity → 5-dim chapter query vector built in `visitorVector`), `because_you_viewed` (k-NN off last viewed product), `complete_the_set` (dominant-chapter, excludes recently viewed), `trending_in_chapter` (7-day velocity with random cold-start fallback), and `graph_rec` (item-based collaborative filtering over a co-engagement graph in `strategies/graph-rec`, topped up with cosine). Every served rec is recorded to `recommendation` for attribution.
- `rankBroadcastBlocks(visitorId, blocks)`: **Thompson-sampling contextual bandit**. Per `bandit:{segment}:{block}` Redis hash holding `alpha/beta`, draws θ from an approximate Beta (Normal approximation, Box-Muller) and sorts blocks by θ. Used by `GET /store/broadcast` to personalize homepage block order per visitor.
- `dynamicPrice(productId)`: demand (7-day weighted engagement percentile) + scarcity (tightest live drop's remaining fraction) → an **up-only** multiplier in [1.0, 1.25], clamped to `[floor, ceiling]` (floor = base × `PRICING_COST_RATIO` × (1+`PRICING_MIN_MARGIN`)). Returns `would_apply: false` — **staged only; applying a price is a founder escalation.** Correctly never auto-mutates price.

`GET /store/broadcast` orchestrates: pulls live drops + 4 rec rails in parallel, filters to non-empty blocks, pins the followed-chapter rail first, and bandit-orders the rest.

#### 10.B.4 CONGREGATION — the agents
The runtime is a **hand-rolled tool-use loop on the raw `@anthropic-ai/sdk`** (`apps/intelligence/src/orchestrator/run-agent.ts`) — the `@anthropic-ai/claude-agent-sdk` dep is declared but unused (confirmed; the architecture doc is honest about this). 15 agents in `agents/index.ts` (Curator, Artisan, Scribe, Quartermaster, Shepherd, Herald, Sourcer, Treasurer, OracleKeeper, Analyst, Loyalist, Rainmaker, Forecaster, Refiner, Warden). Each is an `AgentDef` (`agents/types.ts`): `{name, mission, model, tools[], skills?, schedule?, events?, escalation[], selfAudit, systemPrompt}`.

`runAgent(name, trigger, input)`:
1. Reads last 10 Ledger runs (the agent learns from its own past).
2. **Mock mode** if no real `ANTHROPIC_API_KEY` — records a no-op run.
3. Bounded tool-use loop (**12 steps max**), `max_tokens: 4096`, system prompt from `buildSystemPrompt` (identity + skills + self-audit clause).
4. **ESCALATION GATE** — `isGated(def, toolName, input)` checks `def.escalation.includes(toolName)` or `input.action`. A gated tool-use is **never executed**: it's pushed to `pending_actions`, the model is told `QUEUED_FOR_APPROVAL`, and the run ends `awaiting_approval`. Example: Curator escalates `publish_product`/`publish_drop`; Warden escalates `delist_product`/`suspend_supplier`. INTROSPECTION even audits that every agent declares a non-empty `escalation[]`.

**Approval circuit**: founder approves via `POST /store/cockpit/approvals` (gated by `authorizeOps`). Crucially, the route **reads the action the agent stored** in `agent_run.pending_actions` (via `selectPendingAction`) — it **never executes a tool/input from the request body**, so approval can't become an arbitrary-tool-execution API behind the shared key. It guards against double-dispatch with a conditional `UPDATE … WHERE status='awaiting_approval'`, then XADDs an `approval` job to `lumera:agent-jobs`. The orchestrator consumes it and calls `executeApprovedAction` (`run-agent.ts`), which re-checks `isGated` (refuses non-gated actions), dedupes via `claimApproval` (at-least-once stream delivery), executes the tool with founder authority, and records the run. Notably **approvals execute even with no `ANTHROPIC_API_KEY`** ("even with the LLM asleep"). The whole lifecycle is also modeled as an explicit state machine in `operator/workflow.ts` with guarded transitions that can't skip the approval gate.

#### 10.B.5 Learning Loop — closing the circuit
`apps/intelligence/src/learning/loop.ts` `learnFrom(event)` is called by the orchestrator (`orchestrator/index.ts` `handleSignalEntry`) for **every** stream event:
1. **Idempotency** via `claimReward(id)`: `SET reward:dedup:{id} NX EX 1d` in Redis (authoritative across restarts/instances), in-memory fallback when Redis down. At-most-once is the deliberate choice (a double-counted bandit reward skews the Beta posterior worse than a lost one).
2. **Bandit reward**: infers the block from event type (`purchase/add_to_cart→for_you`, `product_view→trending_in_chapter`, `drop_view→live_drops`), increments `alpha` by the reward weight on `bandit:{segment}:{block}`.
3. On `purchase`: queues an embedding refresh (`embedding:refresh:queue`) and writes a sell-through Audit to the Ledger for Curator/Herald memory.

`nightlyConsolidation()` (OracleKeeper cron, 2am): drains the refresh queue (`refreshProductEmbedding` sharpens the product's 5-dim chapter embedding toward observed signal), analyzes top blocks per segment, records to Ledger.

**The purchase round-trip**: `subscribers/order-placed.ts` (on Medusa `order.placed`) decrements drop `units_remaining`, awards Luminance credits, persists vendor-order drafts, and emits a canonical `purchase` SignalEvent (`satisfies SignalEvent` to keep `chapter` in `context`) — which re-enters the loop as reward weight 20.

**INTROSPECTION** (`introspection.ts`, 30-min interval): 13 self-audit checks (missing thumbnails/descriptions, variantless/priceless products, dead chapters, sell-out risk, vendor health, margin-floor breaches, keyword-stuffed titles, high-intent non-buyers, **Lumens wallet ↔ ledger reconciliation**, and **tool-registry/escalation hygiene**). Each produces an `Audit` with a `falsifiable_check` ("how would we know this failed?"), flagged not auto-fixed (all `auto_corrected: false` in practice).

---

### 10.C DATA FLOW (in words)

```
Visitor → Broadcast (Next.js)
  │  signal(type,…)  [keepalive POST, x-publishable-key, unauthenticated]
  ▼
POST /store/signal  →  validateSignal (size/type/length caps)
  ├─► Postgres  signal_event           (durable)
  ├─► Redis stream  signal:events  (XADD MAXLEN ~50k)
  └─► mind.observe()  →  visitor_profile (decay 0.95, affinity++, segment)   [synchronous, real-time]

Redis signal:events  ──(XREADGROUP "congregation")──►  intelligence/orchestrator
  ├─► agentsForEvent(type)  →  runAgent(...,'event')        [Shepherd, Quartermaster, Artisan, Analyst…]
  └─► learnFrom(event)
        ├─ claimReward (SET NX EX 1d — at-most-once)
        ├─ bandit:{segment}:{block}  alpha += reward         (Redis)
        └─ purchase → embedding:refresh:queue + Ledger audit

GET /store/broadcast ─► oracle.forVisitor (pgvector cosine / graph) + oracle.rankBroadcastBlocks (Thompson)
                        reads visitor_profile.affinity + bandit:* → personalized rails + block order
GET /store/recommendations ─► same ORACLE strategies, records `recommendation` rows

Order placed (Medusa) ─► subscribers/order-placed.ts
   ├─ drops.consumeUnits (units_remaining--)
   ├─ monetization.awardForPurchase (Luminance credits)
   ├─ persistVendorOrderDrafts (lumera_vendor_order: staged_for_approval | ready | blocked)
   └─ signal.ingest({type:'purchase'})  → re-enters the loop (reward 20)

Agent escalation ─► agent_run.pending_actions (status=awaiting_approval)
   founder → POST /store/cockpit/approvals [x-cockpit-key] → XADD lumera:agent-jobs
   orchestrator → executeApprovedAction (re-gate, dedup, execute, Ledger)

Webhooks: Stripe/vendor → preserveRawBody → verify(HMAC/Stripe t,v1) → 401 | recordWebhook + processVendorWebhook
INTROSPECTION (30m) + nightlyConsolidation (2am) + OPERATOR (5am) read Postgres/Redis → Ledger audits/escalations.
```

Persistence summary — **Postgres tables touched**: `signal_event`, `visitor_profile`, `product_embedding`, `recommendation`, `product`/`product_variant`/`price`*, `order`/`order_item`/`order_line_item`, `drop`, `agent_run`, `audit`, `credit_wallet`/`credit_transaction`, `lumera_product_candidate`, `lumera_approval_request`, `lumera_vendor_order`, `lumera_vendor_webhook_event`, `lumera_return_case`, `lumera_newsletter_subscriber`. **Redis keys/streams**: `signal:events`, `lumera:agent-jobs` (streams w/ consumer groups `congregation`/`congregation-jobs`), `bandit:{segment}:{block}`, `reward:dedup:{id}`, `embedding:refresh:queue`.

---

### 10.D TEST COVERAGE

**54 project `*.test.ts(x)` files** (node_modules excluded), Vitest, ~430 assertions. Coverage is **strongly weighted toward pure logic, security gates, and money-honesty** — the highest-risk surfaces — and thin on integration/route wiring.

**Security & money (well covered):**
- `lib/security.test.ts` — `mintingBlocked` (dev allow / prod-live-key block / test-key pass), `assertSafeOutboundUrl` SSRF (loopback/metadata/private-IP/protocol/allowlist), `rateLimit` (429 after max, disabled under test).
- `lib/lumera-webhook.test.ts` — both webhook verifiers: correct/forged/missing sig, `sha256=` prefix, **fail-closed-in-prod**, Stripe `t,v1` tolerance, raw-vs-reserialized body.
- `lib/lumera-auth.test.ts` — `authorizeOps` key match / fail-closed / dev-open.
- `lib/lumera-publish.test.ts` — `publishBlockers` (status/media-rights/margin/lead-time/manual/stripe-test) + payload build.
- `modules/lumera-payment-paypal/service.test.ts` — the money-honesty invariant (capture/refund throw in prod when unconfigured/failed; simulate only outside prod), status mapping, webhook actions.
- `lib/approvals.test.ts` + `orchestrator/approval.test.ts` — `selectPendingAction` refuses client input; `isGated`/`claimApproval` dedup/refusal of non-gated actions.

**Intelligence layer:** `learning/loop.test.ts` (reward dedup, `inferBlock`, claim semantics), `introspection.test.ts` (`vendorHealthAudits` pure logic), `agents/constellation.test.ts` + `skills.test.ts` (agent roster integrity, `buildSystemPrompt`), `tools/registry.test.ts`/`stubs.test.ts`/`connectors.test.ts`/`vendor-select.test.ts`, `operator/workflow.test.ts` (state-machine transitions).

**Backend libs/routes:** `api/store/signal/signal.test.ts` (validation/size caps), `api/store/analyst/bi.test.ts` (24 tests — query matching/insights), `api/store/search/search.test.ts`, plus `abandoned-cart`, `email`/`email-compliance`, `reviews-db`, `shipping-rates`, `order-lookup`, `lumera-order-routing`, `lumera-db`, `drop-grader`, `newsletter`, `observability`, `integrations`, drops/monetization module services.

**Storefront:** `customer.test.ts` (auth header/money/tracking helpers), `jsonld`, `stripe`, `wishlist`, `gift-cards`, `catalog`, `og`, `brand`, `site`, `shipping-ladder`. **Shared:** `events`, `curation`, `drop-grading`, `sourcing`, `vendor-routing`.

**NOT tested (gaps the reviewer should weigh):**
- **No integration/HTTP tests** for the live routes — `/store/signal` POST handler, `/store/broadcast`, `/store/recommendations`, `/store/cockpit`, `/store/cockpit/approvals`, the webhook routes, and the admin/lumera routes are exercised only via their extracted pure helpers, **not end-to-end** (no test asserts `authorizeOps` is actually wired into each admin route, or that middlewares apply auth to wallet/entitlements).
- **No tests for the ORACLE service** (`forVisitor`, `rankBroadcastBlocks`, `dynamicPrice`, `betaSample`) — the pgvector SQL, the bandit math, and the price floor/ceiling clamp are **entirely unverified by tests** despite directly touching pricing.
- **No tests for MIND** (`PersonalizationService.observe/identify/segmentFor/mergeAffinity`) — the decay/segment logic is untested.
- **No tests for `run-agent`'s loop** (the 12-step bound, escalation-gate behavior inside the loop, tool dispatch) beyond the pure `isGated`.
- **No test** for the IDOR-prone `credits`/`subscribe`/`rewards` routes, nor for the `order-placed` subscriber's purchase-signal round-trip.
- **No e2e/Playwright** despite the architecture doc citing "APIAuto + Vitest"; APIAuto is not present.

---

### 10.E KNOWN RISKS / GAPS — where to focus a review

1. **IDOR on money/identity routes.** `POST /store/monetization/credits`, `/subscribe`, gift-card redeem, and `GET /store/rewards` accept a client-supplied `customer_id` with no `auth_context` binding (only `wallet`+`entitlements` were hardened). In real-money mode the minting gate blocks issuance, but reward-balance disclosure and gift-card redemption to an arbitrary id remain open. **Highest-priority confirm.**
2. **Cockpit security is a single shared static secret.** No rotation, no per-actor identity/audit, and `authorizeOps` compares the key **non-constant-time**. Every founder-plane mutation (approvals, curation runs, vendor connections) sits behind one header. A leaked `COCKPIT_KEY` is total ops compromise.
3. **Rate limiting is per-process and IP-spoofable.** In-memory buckets + first-hop `x-forwarded-for` mean horizontal scaling multiplies the limit and a header-rotating attacker evades it — directly weakening the LLM-cost defense on `/store/shepherd` and the brute-force defense on auth.
4. **Hardcoded fallback unsubscribe secret.** `email-compliance.ts` silently uses `'lumera-dev-unsubscribe-secret'` if `UNSUBSCRIBE_SECRET`/`COCKPIT_KEY` are unset — forgeable unsubscribe links in a misconfigured prod. No fail-closed.
5. **SSRF guard is opt-in and inconsistently applied.** `assertSafeOutboundUrl` exists and is tested, but agent scraper/connector tools and the publish path issue raw `fetch` to externally-influenced URLs without it. Scraped/radar data is a realistic SSRF/credential-exfil vector for the agent plane.
6. **Embeddings are 5-dim chapter one-hots, not `vector(1536)`.** The architecture doc and product schema describe 1536-dim semantic embeddings from title/description/image-tags; the realized `product_embedding` is a 5-dim chapter vector and `visitorVector` blends a chapter one-hot. `for_you`/`because_you_viewed` therefore recommend essentially "same chapter," not true semantic similarity — a substantial fidelity gap vs. the stated design. MIND's affinity is JSON, not a vector column.
7. **Bandit `betaSample` uses a Normal approximation** (Box-Muller), inaccurate for the cold-start `Beta(1,1)` (uniform) prior where most arms live early — block ordering is noisier than true Thompson sampling implies.
8. **Stripe webhook is record-only.** `/hooks/stripe` verifies and logs but does not reconcile payment/order state; payment truth flows through the Medusa provider, not the webhook. Confirm this matches intent (no out-of-band capture confirmation).
9. **Stubbed tools presented as capabilities.** `claude_seo`, `higgsfield`/image-gen, `voc_reviews`, `video_render`, and the Apify/DB-GPT integrations are **stubs returning placeholders** (the doc is honest about this, but the Artisan/Scribe/Warden agents' missions assume them). INTROSPECTION's "off-brand image regeneration" and SEO-drift correction are aspirational, not wired.
10. **Approval execution dedup is per-process in-memory** (`processedApprovals` Set in `run-agent.ts`) — across multiple orchestrator instances the same approved action could execute on two consumers (the Redis `reward:dedup` pattern used by the Learning Loop was not applied here). The cockpit route's DB `WHERE status='awaiting_approval'` guard mitigates double-*dispatch*, but not double-*execution* across instances.
11. **`order-placed` decrements drops and awards credits with `allowPartial`/best-effort `catch`** — silent failures mean inventory/credit drift is possible; the wallet-reconciliation INTROSPECTION check is the only backstop and is flag-only.
12. **Build-status caveat:** I documented from source on branch `claude/status-check-jd5zmw`; I did not execute the suite this pass. The prior task log marks tests/build as passing, but the integration gaps above mean green unit tests do **not** prove the wired routes enforce these gates — a reviewer should run an actual HTTP-level pass against `/store/monetization/*` and the admin routes.

Key files for the reviewer to read first: `apps/backend/src/lib/security.ts`, `apps/backend/src/lib/lumera-auth.ts`, `apps/backend/src/api/middlewares.ts`, `apps/backend/src/lib/lumera-db.ts` (webhook verifiers, lines 320–387), `apps/backend/src/lib/lumera-publish.ts` (`publishBlockers`), `apps/intelligence/src/orchestrator/run-agent.ts` (escalation gate + approval execution), `apps/intelligence/src/learning/loop.ts`, `apps/backend/src/modules/recommendation/service.ts`, and the four `apps/backend/src/api/store/monetization/*` routes (the IDOR delta).



---

## 11. Verified Runtime State (end-to-end, this session)

The platform was not just compiled — it was **run against real infrastructure** (Postgres 16 + pgvector + Redis, the Medusa backend on :9000, the Next.js storefront) and exercised:

| Step | Result |
|---|---|
| `medusa db:migrate` | 156 tables created, incl. the pgvector `product_embedding` table |
| pgvector migration safety | Proven to create the table on a capable DB **and** degrade to a no-op NOTICE under an under-privileged role (never aborts the deploy) |
| `pnpm bootstrap` | Checkout-ready store: region, stock location, fulfillment set, service zone, payment provider, shipping option, prices, inventory, membership tiers, publishable key — idempotent |
| `setup:embeddings` | 10 product vectors populated |
| `pnpm preflight` (real DB) | READY (code mode), 84% |
| Live store APIs | `/store/products`, `/regions`, `/recommendations` (for_you), `/search` (hybrid keyword+vector), `/signal` (validation + 413 size guard + happy-path write) — all correct |
| **Full purchase** | cart → line item ($149) → shipping → payment session → **order placed (display_id 1)** → **purchase SIGNAL written** → **vendor order auto-staged** |
| Storefront (live) | Real catalog, Product Truth panel, hybrid search, recommendations, **no fake reviews** — verified by screenshot |
| Personalization (live) | Enriched signals populate **chapter + category + price_band** affinity (verified by reading `visitor_profile` back) |

This converts the previously "reviewed-by-inspection" parts of the system into **observed-working** behavior. The reviewer can reproduce locally with: real DB env → `pnpm bootstrap` → `pnpm setup:embeddings` → `medusa start`.

---

## 12. Launch Readiness & Human-Only Gates

Per the platform's own `docs/LUMERA_LAUNCH_GATE_CHECKLIST.md`, launch proof is layered (code health · commerce env · vendor · curation · publishing · fulfillment · legal). **Code health is green and runtime is proven.** What remains is *only* what no agent can or should do autonomously (`docs/LUMERA_OWNER_ACTIONS.md`):

- Real `DATABASE_URL` / `REDIS_URL` / `JWT_SECRET` / `COOKIE_SECRET`.
- Medusa publishable key + `LUMERA_SALES_CHANNEL_ID` / `LUMERA_SHIPPING_PROFILE_ID`.
- Stripe (and/or PayPal) live keys + webhook secrets.
- Printify / Printful / CJ tokens + webhook URLs.
- S3/object storage + transactional email provider.
- A seeded **real** catalog (shipped fixtures are synthetic).
- Founder approvals: first suppliers, first products, sample purchases, live vendor-order submission (`VENDOR_LIVE_MODE` + `AUTO_SUBMIT_VENDOR_ORDERS`), ad spend.
- Final legal-copy sign-off (terms/privacy/returns exist with real content; have counsel confirm for the entity).

**Every live-mode flag defaults OFF and fails closed** — the code is wired and waiting for these.

---

## 13. What to Scrutinize (suggested reviewer focus)

Areas where independent review is most valuable, with the relevant files:

1. **Money & ledger integrity** — `modules/monetization` (Lumens append-only ledger, minting guards), `modules/lumera-payment-paypal` (Orders v2 capture), Stripe webhook (`api/hooks/stripe`). Look for double-spend, idempotency, and signature-verification gaps.
2. **Oversell safety** — `modules/drops` atomic decrement and `modules/lumera-fulfillment` order staging under concurrency.
3. **Recommendation correctness** — `modules/recommendation` pgvector cosine + Thompson-sampling bandit; embedding dimensionality (5-dim chapter vectors) and the graceful-degradation paths.
4. **AuthN/Z** — customer JWT binding on `/store/monetization/*` (a prior IDOR was fixed this session), `cockpit` key gating, admin-token paths. Confirm no remaining object-level authorization gaps.
5. **The unauthenticated SIGNAL firehose** — `api/store/signal` validation, the 16KB cap, rate limiting; ensure it can't be used to poison personalization or exhaust resources.
6. **Agent guardrails** — `apps/intelligence/src/agents/_contract.md` + each agent's tool scope; verify there is genuinely no path to autonomous spend/publish/delete without the approval gate.
7. **Migration & deploy safety** — `modules/recommendation/migrations` pgvector guard (privilege-aware), the Dockerfiles, and `turbo.json` env handling.
8. **Brand/trust truthfulness** — Product Truth + the "no fake reviews" guarantee; confirm no fabricated social proof or scarcity is rendered or emitted as structured data.
9. **Test gaps** — see §10's coverage map for what is *not* under test (notably DB-integration paths exercised only via the live run, and the intelligence creative tools).

### Known non-blocking gaps (already acknowledged)
- `aesthetic` affinity dimension has no data source yet (reserved).
- Intelligence creative tools (Artisan image gen, Scribe SEO) are honest `unconfigured` no-ops; `product_draft` doesn't yet persist to Medusa Admin.
- Full in-sandbox `docker build` was blocked by an egress proxy (apt 405 / registry TLS) — Dockerfiles pass `docker build --check` and are host-equivalent; validate in real CI.
- The agent runtime still uses the raw Anthropic SDK (planned migration to the Agent SDK).

---

## 14. Source Appendix

The complete, unabridged source of every file referenced here is in **`LUMERA_FULL_SOURCE.md`** (405 files, ~33,000 lines), grouped A–I:
A. Root config · B. `packages/shared` · C. `packages/data` · D. `apps/backend` · E. `apps/storefront` · F. `apps/intelligence` · G. `scripts` · H. CI · I. Documentation.

_End of dossier. Together with the source appendix, this is the complete platform._
