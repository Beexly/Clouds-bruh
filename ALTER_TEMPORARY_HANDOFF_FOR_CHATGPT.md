# ALTER — TEMPORARY HANDOFF FOR CHATGPT
_Generated 2026-06-01 from the Claude/Codex cloud build session. **Temporary context bridge — Claude remains the primary build partner.** ChatGPT's role here is strategy, review, prompt design, architecture, risk analysis, and next-step planning — not to take over the build._

## 0. TL;DR
"Alter XIV" — a faith-rooted, drop-culture luxury commerce platform ("The Broadcast") with a GSN-class intelligence layer. Built on **Medusa v2 (backend) + Next.js 15 (storefront) + a Node/TS autonomous-agent runtime**, Postgres 16 + pgvector + Redis. The canonical branch `claude/epic-clarke-XPZhF` is **implementation-green and operationally-green** (one-command `pnpm verify:api` → 21/21 API checks from a clean DB; 52 unit tests; 4/4 build). It is **not launch-green** (needs API keys, a deploy, live object store, founder approvals).

## 1. What we are building
- A self-running "company of one" commerce platform. Six pillars: real-time **personalization** (SIGNAL→MIND→ORACLE), **dynamic** storefront (bandit-ordered Broadcast), **learning loop**, **automation** (CONGREGATION of 10 Claude agents + an OPERATOR manager), **self-direction**, **introspection** (continuous self-audit).
- Storefront "The Broadcast": departure-board of drops across 5 chapters — **Stillness · Armor · Signal · Altar · Relentless** — personalized, with scarcity/social-proof, conversational commerce, and visitor controls.
- Source of truth: `alter-xiv/ALTER_XIV_MASTER_PLAN.md` (12-phase plan). Bar: "best website of 2026."

## 2. Repo / location / branch status
- **GitHub repo:** `Beexly/Clouds-bruh` (MCP scope: `beexly/clouds-bruh`).
- **Canonical branch:** `claude/epic-clarke-XPZhF` — **HEAD `ca17ce3`**, working tree **CLEAN**, all work pushed.
- **Cloud container path:** repo root `/home/user/Clouds-bruh`; project under `alter-xiv/`.
- **Other remote branches (do NOT build on / do NOT merge):**
  - `claude/quirky-meitner-VrHVy` — a *separate* dependency-free Node experiment ("galaxy-eclipse"). Different architecture; NOT the chosen stack.
  - `claude/altar-conversion-optimization-DNJYV` — an early ancestor (contained in epic-clarke).
  - `codex/verify-api-clean-checkout` — Codex's own audit/verify branch.
- **Monorepo layout:** `apps/backend` (Medusa v2 + custom modules), `apps/storefront` (Next 15), `apps/intelligence` (agents/OPERATOR/INTROSPECTION/Learning Loop), `packages/shared` (types + SIGNAL taxonomy), `scripts/` (seed + bootstrap + verify).

## 3. Files changed or created (by area — representative paths)
**Backend (Medusa v2) — `apps/backend/src`:**
- Custom modules: `modules/{signal,personalization,recommendation,drops,monetization}/` (model + service + migration + index).
  - `modules/monetization/` — memberships/Patron tier (Autumn pattern), Altar Credits wallet + ledger (Flexprice pattern), gift cards, `awardForPurchase`/`rewardsSummary`.
  - `modules/recommendation/strategies/graph-rec.ts` + `service.ts` — cosine + Thompson bandit + `graph_rec` (co-engagement CF) + `dynamicPrice` (staged).
  - `modules/personalization/` — affinity/segment/identity-merge + `setPreferences`/`getPreferences` (+ `preferences` json column, migration).
- Store API routes `api/store/`: `signal`, `broadcast`, `recommendations`, `drops`, `analyst` (`bi.ts` text-to-SQL + predictive), `pricing`, `monetization/*`, `rewards`, `preferences`, `cockpit`, `shepherd`, `search` (hybrid).
- `subscribers/order-placed.ts` — drop consume + Altar Rewards grant + purchase SIGNAL (FIX: now selects `items.unit_price`+`customer_id`).
- `medusa-config.ts` — conditional Redis modules (load only when `REDIS_URL` set), conditional Stripe, file module (local↔S3/MinIO gated on `S3_FILE_URL`).
**Intelligence — `apps/intelligence/src`:**
- `agents/*` (10 agents + `_contract.md`), `orchestrator/{index,run-agent}.ts`, `operator/index.ts` (daily loop), `operator/workflow.ts` (G03 state machine, + test), `memory/ledger.ts` (resilient: circuit-breaker + in-memory fallback), `introspection.ts` (8+ self-audit checks incl. connector-registry + wallet-integrity), `learning/loop.ts`, `tools/{index,connectors,video,finance,...}.ts` (+ `tools/registry.test.ts`).
**Storefront (Next 15) — `apps/storefront/src`:**
- `app/{page,layout}.tsx`, `middleware.ts` (visitor cookie), `app/{chapter/[chapter],p/[handle],drop/[id],drops,cart,checkout,cockpit}/page.tsx`, `app/{manifest.ts,icon.svg,sitemap.ts,robots.ts,error.tsx,global-error.tsx,loading.tsx,not-found.tsx}`.
- `components/*` — `Hero, DropBoard, ProductRail, ProductCard, SiteHeader, PageSignal, Countdown, Shepherd, CommandPalette, TuneBroadcast, RewardsPanel, PageTransition, Reveal, Skeletons`.
- `lib/{signal,catalog,useBehavior}.ts` (+ `catalog.test.ts`). `tailwind.config.ts` + `globals.css` (design-token system). `next.config.ts` (React Compiler on; PPR is canary-gated, using Suspense streaming on stable).
**Scripts / ops — `alter-xiv/scripts` + root:**
- `verify-api.sh` (the one-command bootstrap+verify), `ensure-publishable-key.ts`, `setup-embeddings.ts`, `seed.ts`, `setup-{commerce,prices,inventory}.ts`, `seed-monetization.ts`, `verify-rewards.ts`, `api-regression.ts`.
- Docs: `PROGRESS.md`, `CODEX_HANDOFF.md`, `RUNBOOK.md`, `ALTER_XIV_MASTER_PLAN.md`.
- `package.json` scripts: `verify:api`, real per-package `lint` (= `tsc --noEmit`).

## 4. Major decisions already made (do not relitigate without reason)
1. **Stack = Medusa v2 + Next 15 + Postgres/pgvector + Redis** (per MASTER_PLAN). `quirky-meitner` "galaxy-eclipse" is a separate experiment — **do not merge**.
2. **Mock-until-keyed**: agents, Shepherd, imagery, scrapers run in mock mode without API keys and flip live when keys are set. Mocks are intentional, not bugs.
3. **Escalation gate is sacred**: agents only ever DRAFT/STAGE; nothing publishes, sends, spends, or moves money without founder approval. Stripe **test mode only**.
4. **Redis is optional for dev/verify** — modules load only when `REDIS_URL` is set (fixed a clean-checkout migrate hang).
5. **Search (G01)** is pgvector-native (no new infra); **agent workflow (G03)** is pure-code state machine (no Temporal dep). Both upgrade to heavier infra later behind the same contract.
6. **License gates honored** from Codex's V7 ledger: GPL/AGPL repos stay pattern-only; no external source copied into product paths.
7. **PPR** deferred (canary-only); sub-second-perceived Broadcast achieved via React Compiler + Suspense streaming on stable Next.

## 5. Bugs, blockers, unresolved questions
- **Codex's 24h research (`docs/alter14/`, ~561 evidence files, V5/V6/V7 ledgers) is LOCAL-ONLY** on Garrett's Windows machine and the external cache `C:\Users\Garrett\Documents\Codex\lumera-repo-intel`. It is **NOT in the cloud repo and NOT on any remote branch** Claude-cloud can fetch. To use it, push `docs/alter14` to a branch or upload it.
- **API keys absent**: `ANTHROPIC_API_KEY`, `STRIPE_API_KEY` (test), `HIGGSFIELD_API_KEY`, `APIFY_TOKEN`, `COMPOSIO_API_KEY`, MinIO `S3_*`. Until set, the respective surfaces are mocked.
- **Codex audit pinned the wrong commit**: the Special Assignment Audit reviewed `f5af762` (PRE-FIX) and flagged "API regression unverified — migrate hangs." That blocker is **resolved at HEAD** (`472c597`/`e9fba90`): `verify:api` → 21/21 from a clean DB. ChatGPT/Codex should re-audit HEAD `ca17ce3`, not `f5af762`.
- **Cloud sandbox infra is ephemeral** — Postgres/Redis get OOM-recycled between/within sessions; `verify-api.sh` and ad-hoc guards restart them. Not a code bug.
- **Launch-green gaps (human/hosted, by design):** Lighthouse/perf (needs a deploy), live MinIO upload (needs endpoint), tax/shipping providers, legal/domain/DNS, payment go-live.
- **Open question for ChatGPT/strategy:** sequence + license decisions for V7 gaps flagged `adopt-with-license-review` (Meilisearch, Novu, GrowthBook, Flipt, Remotion, Phoenix, pgvector NOASSERTION).

## 6. Next highest-leverage tasks (buildable now, no keys/infra/spend)
From Codex's V7 gap ledger (`docs/alter14/59_GAP_LEDGER.md`) — **G01 and G03 already implemented this session.** Remaining buildable-now:
- **G06** Reviews/UGC — `ReviewProof` model (verified-purchase + moderation), replace static metadata ratings, honest empty state.
- **G09** Wishlist persistence — currently `wishlist_add` only fires a signal; add a saved-wishlist module + account seam.
- **G08** ExperimentPlan schema — make `experiment_admin` real (static experiments evaluated against the bandit).
- **G13** Playwright E2E + k6 smoke as CI gates.
- **G10** OpenTelemetry trace/event taxonomy (instrumentation grammar before any backend).
- **G16** Radix/Zag interaction contract + Motion polish (license-clean pieces only).
**Founder-gated (need a decision/key/infra — do NOT auto-adopt):** G05 video, G07 messaging, G11 tax/shipping, G12 CMS, G14 paid security, G15 deploy.

## 7. What Claude is currently responsible for
- All **platform implementation** on `claude/epic-clarke-XPZhF`: build → run/verify → commit → push.
- Turning Codex's research/gap findings into shipped, tested code within guardrails.
- Keeping the green baseline (`pnpm build`, `pnpm test`, `pnpm lint`, `pnpm verify:api`) and the founder docs (`PROGRESS.md`, `CODEX_HANDOFF.md`, `RUNBOOK.md`) current.

## 8. What Codex is currently responsible for
- **Repo-intelligence research** (V5 full-source review → V6 non-stopping operator loop → V7 gap-driven frontier discovery). Outputs: `docs/alter14/49–61` (ledgers, decision register, gap ledger `59`, candidates `60`, integration plan `61`) + external evidence cache.
- **Adversarial audits** of Claude's branch (e.g. `SPECIAL_ASSIGNMENT_AUDIT.md`) — clone, verify build/test, reproduce.
- License/maintenance vetting of candidate repos (NOASSERTION flags, GPL/AGPL pattern-only).

## 9. What ChatGPT must know to continue without repeating work / breaking things
- **Do NOT** propose migrating off Medusa+Next, or merging `quirky-meitner` — settled.
- **Do NOT** revert: `verify-api.sh`, conditional-Redis in `medusa-config.ts`, `ensure-publishable-key.ts`, `setup-embeddings.ts`, the `order-placed.ts` `unit_price` fix, the per-package `lint` scripts. These fix the clean-checkout/operational path.
- **Do NOT** treat mocked agent/Shepherd/imagery output as bugs — they are guardrail-intentional until keys exist.
- **Use the V7 gap ledger (G01–G16) as the roadmap.** G01 (hybrid search) and G03 (agent workflow state machine) are DONE; don't re-spec them. Don't re-review already-adopted seed repos (Medusa/Spree/etc.).
- **Re-audit HEAD `ca17ce3`**, not `f5af762`. Reproduce with: `pnpm install --frozen-lockfile` → `DATABASE_URL=postgres://lumera:lumera@localhost:5432/lumera_verify pnpm verify:api`.
- **Highest-value strategic asks for ChatGPT:** (a) license decisions for the `adopt-with-license-review` V7 candidates; (b) sequencing G06/G08/G09/G10/G13/G16; (c) the launch-green checklist ordering (deploy target, observability, perf budget); (d) prompt design for the next Codex research wave; (e) risk review of the escalation-gate + money paths.

## Exact build/test status (HEAD ca17ce3)
- `pnpm build` → 4/4 packages green.
- `pnpm test` → **52 unit tests** (6 files: shared events, analyst bi ×24, intelligence learning-loop, tools registry, operator workflow, storefront catalog).
- `pnpm lint` → **4 real `tsc --noEmit` tasks** (was a no-op before).
- `pnpm verify:api` → **21/21 API regressions from a fresh empty DB** (proven against `lumera_verify`); `scripts/api-regression.ts` itself is 22 checks against a warm DB.
- `git diff --check` clean; tree clean.

## Constraints / guardrails (must hold)
No real money movement (Stripe test only), no publishing/social/customer email, no production deploy, no DNS/hosting changes, no new external accounts, no secrets committed. Develop on `claude/epic-clarke-XPZhF` only. Sports/Galaxy analytics is a firewalled separate project — never import.
