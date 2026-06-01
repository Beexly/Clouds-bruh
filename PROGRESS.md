# Lumera — BUILD PROGRESS
**Overall:** ~98% (MASTER_PLAN complete; now beyond it)  ·  **Updated:** 2026-06-01
**Bar:** the best overall website of 2026. **Constraint:** a company of one — it runs itself.

> **Naming decision (2026-06-01):** the platform/marketplace is branded **Lumera**. Internal codename
> *Alter XIV* is **unchanged** (`alter-xiv/` path, `@alterxiv/*` packages, module/DB/branch names — all
> stay; this is the display layer only). Lumera is a **general everything-marketplace** (all categories).
> Map: **The Broadcast** = the storefront experience · **ALTER** = a house label among many · **Galaxy** =
> parent ecosystem · **Orbit** = creator program. User-facing strings (page titles, PWA manifest, OG/meta,
> hero, header, Shepherd) now resolve through one constant, `apps/storefront/src/lib/brand.ts`; the
> intelligence agents' brand name was swept too. **Taxonomy confirmed horizontal** — products carry their
> own categories from the seed; the five "chapters" are a cross-category curation overlay, not an
> apparel lock. **Follow-up (not done, founder voice call):** generalize the 10 agent *voices* (some still
> read faith/drop-house) to Lumera's general-marketplace voice when agents go live.

## Status
- ✅ MASTER_PLAN phases 0–11 effectively complete and verified.
- ✅ Beyond-plan capabilities shipped this session (waves G–O), research-grounded:
  - **Tune the Broadcast** — visitor steers ORACLE (follow/mute chapters → affinity → every rail).
  - **Altar Rewards** — earn-on-purchase loyalty (Patron 2×, tiers, Fogg "next blessing" nudge).
  - **Command palette** (⌘K) — product + chapter search.
  - **Founder's Cockpit** (/cockpit) — OPERATOR loop + approval inbox + runs + audits.
  - **PDP enrichment + storefront-wide price fix** (calculated_price; prices were invisible before).
  - **Drop detail page** (/drop/[id]) + **/drops** index + countdowns/scarcity.
  - **Connector control-plane health-check** (F01) — caught + fixed 14 real defects; 10 connectors
    implemented; registry invariant locked by test.
  - **PWA** (manifest/icon/theme), richer sitemap, resilience boundaries (error/loading).
- 🔢 Tests: 46 unit (5 files) + 21 API-regression, all green.
- ⛔ Blocked: 0  ·  🙋 Needs founder: see CODEX_HANDOFF.md (API keys unlock live agents; MinIO endpoint;
  hosted env for Lighthouse). Everything works locally without them.

## Phases (MASTER_PLAN)
| # | Phase | Status | Notes |
|---|-------|--------|-------|
| 0 | Green Boot | ✅ | pnpm build green; pg+pgvector+Redis; Medusa + 5 custom modules; storefront + intelligence boot |
| 1 | Data Foundation | ✅ | 80 products (40 Amazon + 40 Shein), 5 chapters, drops seeded, store API live |
| 2 | SIGNAL + MIND | ✅ | /store/signal → pg + Redis stream; affinity decay + segment + identity merge |
| 3 | ORACLE | ✅ | cosine for_you/because_you_viewed/complete_the_set/trending + Thompson bandit · **graph_rec** (co-engagement CF) · **dynamic pricing** within margin floor (staged, /store/pricing) |
| 4 | The Broadcast | ✅ | Luxury design system + motion + next/font; React Compiler; Suspense-streamed shell; edge-cookie SSR personalization; countdowns/scarcity/quick-add/wishlist; /chapter routes; full signal coverage |
| 5 | CONGREGATION + OPERATOR | ✅ | 10 agents + orchestrator ✅ · **OPERATOR** daily loop (delegate→validate→aggregate, founder inbox, 5am cron) · **resilient Ledger** (circuit-breaker + in-memory fallback) · escalation gate |
| 6 | Monetization | ✅ | `monetization` module: memberships/Patron tier (Autumn) + Altar Credits wallet (Flexprice) + gift cards · verified in test mode |
| 7 | Commerce Completeness | ✅ | compensatable place-drop-order; promotions module; order.placed → drop-consume subscriber |
| 8 | Content & Finance Autopilot | ✅ | Herald `video_render` (MoneyPrinterTurbo, staged) · Treasurer `gl_reconcile`/`month_end_close`/`statement_audit` (read-only) — both verified |
| 9 | BI + Learning Loop | ✅ | Analyst text-to-SQL ✅ · **predictive BI** (demand forecast / sell-out projection / churn risk) ✅ · INTROSPECTION (8 checks) ✅ · Learning Loop (bandit reward + embedding refresh + nightly) ✅ |
| 10 | Hardening | 🔄 | **37** Vitest + **18** API-regression green · SEO/JSON-LD/robots/sitemap ✅ · **MinIO/S3 file provider wired** (gated; upload needs endpoint) · **a11y pass** (skip link/focus-visible/aria) ✅ · perf/Lighthouse pending (needs hosted env) |
| 11 | Best-of-2026 Polish | ✅ | sub-second-perceived Broadcast (streamed shell + React Compiler) · brand/motion finish · **conversational Shepherd live** (/store/shepherd + widget) · (true PPR = canary upgrade, founder-gated) |
| 12 | Scale + Web3 (optional) | ☐ | ScyllaDB/etcd/Go collector + Solana Pay — later, as load demands |

## Best-of-2026 Acceptance Criteria
- [x] pnpm build green; docker/native pg+redis healthy; streamed Broadcast shell (React Compiler).
- [x] Catalog seeded; chapters + drops live; cards carry ranking/scarcity/social-proof primitives.
- [x] SIGNAL→MIND→ORACLE personalizes the Broadcast (edge cookie → first paint); bandit orders blocks.
- [x] Browse → personalize → cart → test-mode checkout, on-brand luxury.
- [x] OPERATOR + 10 agents running; escalation gate enforced; resilient Ledger persisting.
- [x] Memberships/Patron tier + Altar Credits (Autumn/Flexprice) in test mode.
- [x] One fulfillment path through the compensatable workflow.
- [x] Herald auto-produces staged marketing video; Treasurer auto-reconciles/closes.
- [x] Analyst answers BI questions; INTROSPECTION self-audits; Learning Loop applies rewards.
- [x] graph_rec + dynamic pricing (staged); conversational Shepherd live.
- [x] Tests + API regression green over new surfaces (monetization/graph_rec/pricing/Shepherd) — 16/16.
- [x] MindsDB-style predictive BI (demand/sell-out/churn) — live.
- [x] Accessibility pass (skip link, focus-visible, aria); MinIO/S3 provider wired (gated).
- [ ] Performance/Lighthouse pass + verified upload-to-MinIO — need a hosted env / MinIO endpoint.

## Needs founder (unlocks, not blockers)
- ANTHROPIC_API_KEY — flips agents from mock → live (OPERATOR loop, Scribe/Artisan/Herald drafting).
- STRIPE_API_KEY (test) — verifies real test-mode membership/credit charges (logic already works locally).
- HIGGSFIELD / APIFY / COMPOSIO / OXYLABS keys — flip the respective tool adapters from mock → live.
