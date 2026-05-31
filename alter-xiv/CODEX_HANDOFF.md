# ALTER XIV — CODEX HANDOFF

_Only genuine blockers + human-only items. Everything else is built, mocked, or in progress._

## Needs Garrett (human-only inputs — these UNLOCK, they don't block the build)

### API keys (agents + tools run in mock mode until provided)
- **ANTHROPIC_API_KEY** — flips the CONGREGATION + OPERATOR from mock to live Claude tool-use
  (Curator/Artisan/Scribe/Herald drafting, Shepherd chat, Analyst NL→SQL fallback). Until set,
  `run-agent` returns mock runs; the daily loop still executes and validates structurally.
- **STRIPE_API_KEY** (test mode) — the monetization module already completes memberships +
  credit purchases locally; with a test key these mirror to real Stripe test subscriptions.
- **HIGGSFIELD_API_KEY** — Artisan imagery (gpt-image2 templates + ISR upscaling). Mock staged now.
- **APIFY_TOKEN / OXYLABS_USER+PASS** — Sourcer/Curator data radar (scrapers, price/restock). Mock now.
- **COMPOSIO_API_KEY** — Congregation action integrations (email/social/ops). Mock now.
- **MONEYPRINTER_API_URL** — Herald live video render; without it `video_render` stages a manifest.

### Deployment (founder action)
- Deploy backend (Medusa) + storefront (Next.js) + intelligence (Node) to hosts; point DNS.
- Run `medusa db:migrate` + `pnpm seed` + `npx medusa exec ../../scripts/seed-monetization.ts` on first deploy.
- Create a publishable API key in Medusa Admin → set NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY.

### Money / publishing (require explicit approval — escalation gate enforces this)
- Go-live / publish content / launch a real drop / switch Stripe to live keys / move money.
  Agents only ever DRAFT and STAGE; the OPERATOR routes these to the founder inbox.

## Optional engineering upgrades (founder-gated, non-blocking)
- **True PPR**: full Partial Prerendering needs the Next.js **canary** channel. We run stable
  15.5 and achieve the sub-second-perceived Broadcast via a static shell + Suspense-streamed
  rails + React Compiler. To adopt true PPR: `pnpm add next@canary` in apps/storefront and set
  `experimental.ppr: 'incremental'` in next.config.ts (verify the rest of the build stays green).

## Known remaining work (tracked in PROGRESS.md, not blockers)
- ORACLE: implement graph_rec (RecoGCN co-view/co-purchase) + dynamic pricing within margin floor.
- BI depth: Metabase dashboard spec + MindsDB predictive (demand/churn) on the Analyst.
- Infra: MinIO/S3 asset provider; accessibility + performance pass; expand tests/regression to
  cover monetization, OPERATOR, and graph_rec.
- Storefront: conversational Shepherd (chat widget + order context).
