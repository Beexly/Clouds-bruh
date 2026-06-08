# Lumera Sourcing & Dropship Stack — Reference Benefits → Integration

**Purpose.** A grounded "what to borrow, why, and what key turns it on" map across the
open-source commerce / dropship / scraping ecosystem, written against Lumera's *actual* code
(the `lumera` Medusa module, the `VendorConnector` clients, and the new `@alterxiv/shared/sourcing`
radar). Goal: **flip the keys and start shipping.**

Legend: **ADOPTED** = wired in this repo · **BORROW** = pattern adopted/adaptable · **VALIDATE** =
confirms our architecture, nothing to import · **SKIP** = not applicable to our stack.

---

## 1. Commerce engines

| Repo | Verdict | Benefit / how it lands in Lumera |
|---|---|---|
| **medusajs/medusa** (v2, TS) | **ADOPTED** | Our spine. The dropship lane is a custom Medusa module (`apps/backend/src/modules/lumera`) + workflows + an `order.placed` subscriber. The highest-leverage *native* pattern still to adopt is the **custom Fulfillment Provider** (see §6) so a paid order auto-creates a vendor fulfilment instead of routing in app code. |
| **saleor/saleor** (Py/GraphQL) | VALIDATE | Confirms composable-headless + webhook-driven fulfilment. Its "App + async webhook" model mirrors our vendor webhooks (`/hooks/vendor/*`). Nothing to port (different language). |
| **bagisto/bagisto** (Laravel) | VALIDATE | Its first-class **AliExpress dropship** plugin (see §2) is the relevant artifact, not the core engine. |
| **spree / shopware / sylius / magento2 / vue-storefront** | SKIP | Different runtimes (Ruby/PHP/Vue). No dropship domain model worth porting that we don't already have in `curation.ts`. |
| **vercel/commerce** | SKIP/VALIDATE | Next.js storefront patterns we already exceed; our PDP "Product Truth" panel + fulfilment promise is more honest than its generic ETA. |

**Takeaway:** stay on Medusa v2; the only engine-level borrow is Medusa's own Fulfillment Provider interface (§6).

---

## 2. Dropship-specific repos (the real sourcing IP)

| Repo | Verdict | What we pulled out |
|---|---|---|
| **sudheer-ranga/aliexpress-product-scraper** (JS) | **BORROW (adopted)** | Its product JSON shape — `title`, `salePrice`/`originalPrice`, `currency`, `ratings.averageStar`, `totalOrders`, `images[]`, `variants`, `storeName`, `shipping` — is the de-facto field vocabulary. Our `normalizeScrapedProduct()` (`packages/shared/src/sourcing.ts`) reads exactly these aliases. Caveat: it scrapes AliExpress HTML directly → fragile + ToS-risky, so we keep only the **field mapping**, not the transport. |
| **ducdev/aliexscrape** (JS) | BORROW | Same idea, returns flat product JSON. Reinforced our alias list (`app_sale_price`, `product_id`). |
| **bagisto/laravel-aliexpress-dropship** (PHP) | **BORROW (adopted)** | The reusable IP is the **mapping + markup + order-import** logic: supplier product → store product (attributes/variants/images), a configurable **markup multiple** on supplier cost, and "import → review → publish". We mirror this: `normalizeScrapedProduct` applies a markup (`LUMERA_RADAR_FULFILLMENT` + `markup`), lands candidates as review-gated, and `lumera-publish.ts` maps them to a Medusa product. |
| **inventorypapa/free-dropshipping-automation-software** | VALIDATE | Confirms the four automation loops we already have: product import, **price/stock sync**, order routing, tracking sync. Our equivalents: `supplier_radar`/`curate`, `price_scraper` + Sourcer, `lumera-order-routing.ts`, vendor webhooks. |
| **Inikoo-Ltd/aiku**, **serlo/dropshipping-tool-demo**, **gopub/dropshipping-framework** | SKIP | No clean, current domain model beyond what `curation.ts` already encodes (candidate → score → compliance → approval → vendor order). |
| **429er/shopify-spy** | BORROW (later) | Competitor Shopify store extraction (best-sellers, price points, new drops) → a future demand signal for Curator/Sourcer via an Apify Shopify Actor. Not wired yet. |

**Normalized output (already shipped):** every scraper above collapses into one
`ProductCandidate` via `normalizeScrapedProduct`, then `attachReview()` scores + compliance-gates it.

---

## 3. Scraping & automation stack (the transport)

Posture: **managed-first, compliant-by-default.** We never run a hand-rolled browser farm against
marketplace ToS. Discovery routes through Oxylabs/Apify; self-hosted frameworks are a fallback only.

| Tool | Verdict | Benefit / when to use | Key to turn on |
|---|---|---|---|
| **Apify** (+ Actors, `crawlee`) | **ADOPTED** | Thousands of ready-made AliExpress/Alibaba/Amazon/Shein/TikTok Actors; `run-sync-get-dataset-items` returns parsed JSON in one call. Richest source for variant/review data. `runApifyActor()` wired; per-source Actor IDs via `APIFY_*_ACTOR`. | `APIFY_TOKEN` (+ optional Actor slugs) |
| **Oxylabs** E-Commerce/Web Scraper API | **ADOPTED** | Rotating-proxy realtime endpoint with structured parsers; `source:'universal'` handles any URL incl. AliExpress search. `oxylabsQuery()` wired. | `OXYLABS_USER` / `OXYLABS_PASS` |
| **apify/crawlee** (TS) | BORROW (later) | Self-hosted scraping framework (Playwright/Puppeteer + Cheerio) for when we want to own the pipeline. Reuses the `playwright.config.ts` already in-repo. Fallback to managed Apify. | self-host |
| **Firecrawl** | BORROW (later) | LLM-oriented `scrape`/`extract` for unstructured supplier pages; pairs well with the Claude agents for spec/variant extraction. | `FIRECRAWL_API_KEY` |
| **ScrapeGraphAI** | SKIP (now) | LLM extraction but Python — interop cost not worth it; Claude agents + Firecrawl cover the need. |
| **Playwright** | VALIDATE | Already in-repo for E2E/screenshots; also the engine under Crawlee if we self-host. |
| **Puppeteer / puppeteer-extra-stealth** | SKIP (now) | Only if we self-host against anti-bot pages; managed providers handle this. |
| **Cheerio** | BORROW (as-needed) | Tiny HTML parser for the rare case we fetch a raw page ourselves. No dependency added yet. |
| **Scrapy / Selenium / Heritrix / Maxun / Colly** | SKIP | Wrong runtime or wrong scale for our needs. |
| **axios / node-fetch** | SKIP | Node 22 has global `fetch`; the transport uses it directly. No HTTP dep added. |

---

## 4. SaaS bridges & official supplier APIs (true automated order placement)

The scrapers above are for **discovery**. To actually *place and track orders* you need an order API.

| Provider | Verdict | What it turns on | Key Garrett supplies |
|---|---|---|---|
| **CJ Dropshipping** API | **ADOPTED** | Broadest AliExpress-style catalog *with* an order API → the realistic path to auto-ship a scraped-style product. `CjClient` implements search/draft/submit/cancel/tracking. | `CJ_API_KEY`, `CJ_ACCESS_TOKEN` (+ `CJ_SANDBOX`) |
| **Printify** API | **ADOPTED** | POD / house-label; cleanest order API; **fastest path to a first real shipped order.** `PrintifyClient` full lifecycle. | `PRINTIFY_TOKEN`, `PRINTIFY_SHOP_ID` |
| **Printful** API | **ADOPTED** | Premium POD; `PrintfulClient` full lifecycle. | `PRINTFUL_TOKEN`, `PRINTFUL_STORE_ID` |
| **Spocket / Modalyst / Syncee** | BORROW (later) | US/EU + Alibaba-backed catalogs behind a SaaS bridge. Add as a new `VendorConnector` (catalog/inventory read; order placement where their API allows). Syncee↔Alibaba is the cleanest Alibaba automation route (pure-OSS Alibaba ordering doesn't exist). | provider API key (per bridge) |
| **Dropified** | BORROW (later) | Order-automation layer over multiple suppliers; same connector slot. | provider API key |
| **AliExpress Dropshipping/affiliate API** | BORROW (later) | Official program for order placement + tracking (vs scraping). Add as `AliExpressClient` once approved. | AE app key/secret |

**Single seam:** all of the above implement the one `VendorConnector` interface in `curation.ts`
(`health/search/getProductDetails/inventory/quoteShipping/createDraftOrder/submitOrder/cancel/getTracking/handleWebhook`).
New providers drop in via `vendorClient(id)` with zero changes elsewhere.

---

## 5. Payments & data layer

- **stripe/stripe-node** — **ADOPTED.** Stripe is the Medusa payment provider; `api/hooks/stripe`
  receives events. For returns/RMA we use Stripe **Refunds**; webhook signature is verified
  (`STRIPE_WEBHOOK_SECRET`). Turn on live: `STRIPE_API_KEY` (live) + `STRIPE_WEBHOOK_SECRET`.
- **sequelize / typeorm / graphql-js** — **SKIP.** Medusa v2 ships its own module ORM (MikroORM/DML);
  the `lumera` module uses it (+ an idempotent raw-SQL helper in `lumera-db.ts`). We expose REST, not GraphQL.

---

## 6. The one native pattern still worth adopting: Medusa Fulfillment Provider

Today a paid order is routed to a vendor in application code (`lumera-order-routing.ts` +
`order.placed` subscriber) — which works and is fully gated. The cleaner, Medusa-native upgrade is a
**custom Fulfillment Provider** so fulfilment is first-class in the order lifecycle. A provider
implements roughly: `getFulfillmentOptions`, `validateOption`, `canCalculate`/`calculatePrice`,
`createFulfillment` (→ `vendorClient(id).createDraftOrder/submitOrder`), `cancelFulfillment`,
`createReturnFulfillment`, `getFulfillmentDocuments`, and registers in `medusa-config` under the
`fulfillment` module. **Status:** planned next; the routing already enforces the same gates, so this
is a refactor toward native, not new capability.

---

## 7. Turn-on checklist (fastest path to a first real shipped order)

1. **Printify** (fastest): set `PRINTIFY_TOKEN` + `PRINTIFY_SHOP_ID` → `pnpm vendor:test` shows
   `mode=sandbox/live`. (CJ for broad catalog: `CJ_API_KEY`/`CJ_ACCESS_TOKEN`.)
2. **Discovery** (optional, for AliExpress/Alibaba sourcing): `OXYLABS_USER`/`OXYLABS_PASS` and/or
   `APIFY_TOKEN` (+ `APIFY_ALIEXPRESS_ACTOR`) → `pnpm radar -- "your query"` returns scored finds.
3. **Publish path:** `MEDUSA_ADMIN_API_TOKEN`, `LUMERA_SALES_CHANNEL_ID`, `LUMERA_SHIPPING_PROFILE_ID`.
4. **Payments:** `STRIPE_API_KEY` (live) + `STRIPE_WEBHOOK_SECRET`.
5. **Flip live behavior (founder-gated):** `VENDOR_LIVE_MODE=true`, then per-step
   `VENDOR_DRAFT_ORDER_PROOF=true` and `AUTO_SUBMIT_VENDOR_ORDERS=true` only after a sandbox drill.
6. Verify: `pnpm vendor:preflight` → `pnpm curate -- --force` → approve on `/cockpit` →
   `pnpm publish:approved` → test order → `pnpm fulfillment:sandbox`.

Everything above is **wired and gated**: with no keys the system runs safely on fixtures and never
publishes, charges, or submits an order. Each key unlocks exactly one capability — nothing moves
money or goes live without Garrett's explicit flags.
