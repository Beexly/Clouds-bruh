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

## Asset storage (MinIO/S3) — needs an endpoint to fully verify
The Medusa File module is wired: set `S3_FILE_URL`, `S3_ENDPOINT` (MinIO), `S3_ACCESS_KEY_ID`,
`S3_SECRET_ACCESS_KEY`, `S3_BUCKET` to switch from local disk to MinIO (forcePathStyle on).
Stand up a MinIO server (or any S3) and set those env vars; then uploads land in the bucket.
Verified locally only on the default (local-disk) path — no object store runs in this sandbox.

## Known remaining work (tracked in PROGRESS.md, not blockers)
- Performance/Lighthouse pass — needs a hosted/preview environment to measure.
- Verified upload-to-MinIO — needs a running MinIO/S3 endpoint (see above).
- DONE since last handoff: graph_rec + dynamic pricing, predictive BI (demand/sell-out/churn),
  conversational Shepherd, OPERATOR + resilient Ledger, monetization, a11y pass, MinIO wiring.
