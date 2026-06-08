# Lumera — Cost & Keys Guide

What each live key unlocks, why, and how to run Lumera as cheaply as possible. **Design principle:
nothing costs anything until you set its key** — every integration is gated + mock-until-keyed, so an
unconfigured Lumera is $0 to run idle. No paid npm SDKs are used (all HTTP `fetch` + CDN), and almost
every dependency is self-hostable or has a free tier.

## Recommended $0-software starter stack (you pay only DB hosting + payment %)
| Need | Cheapest choice | Cost |
|---|---|---|
| Postgres + pgvector | self-host, or Neon/Supabase free tier | $0 |
| Redis | self-host or Upstash free (optional — in-memory fallback) | $0 |
| App secrets | `openssl rand -base64 32` | $0 |
| Payments | Stripe **or** PayPal | % per sale, no monthly |
| AI | Anthropic, `CLAUDE_MODEL=claude-haiku-4-5` | per-token (low on Haiku) |
| Email | Resend free (3k/mo) | $0 |
| Errors | Sentry free (5k/mo) | $0 |
| Analytics | PostHog free (1M events) or self-host umami | $0 |
| Object storage | Cloudflare R2 free tier (S3-compatible) or MinIO | $0 |
| Dropship suppliers | Printify + CJ (free APIs) | per-order to supplier |
| Discovery (optional) | Apify free ($5/mo credit) | $0 to start |

## Keys by tier
**T1 — required to run (mostly $0, self-generated):** `DATABASE_URL`, `JWT_SECRET`, `COOKIE_SECRET`,
`COCKPIT_KEY`, `STORE_CORS`, `ADMIN_CORS`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`,
`MEDUSA_ADMIN_API_TOKEN`. `REDIS_URL` optional (recommended in prod).

**T2 — take real money (≥1):** `STRIPE_API_KEY`+`STRIPE_WEBHOOK_SECRET` and/or `PAYPAL_CLIENT_ID`+
`PAYPAL_CLIENT_SECRET`+`NEXT_PUBLIC_PAYPAL_CLIENT_ID`. No monthly fee; per-transaction % only.

**T3 — intelligence (the cost that scales):** `ANTHROPIC_API_KEY`. Pay-per-token. See levers below.

**T4 — dropship lane (only if used):** `PRINTIFY_*`, `CJ_*`, `PRINTFUL_*` = free APIs (pay supplier per
order). **`SPOCKET/SYNCEE/MODALYST/DROPIFIED` are paid monthly SaaS (~$25–40+/mo each) — skip unless
needed; Printify+CJ cover the same for $0 API.**

**T5 — optional enhancers (free tier / self-host, gated off):** Email `RESEND_API_KEY`,`KLAVIYO_API_KEY`;
Observability `SENTRY_DSN` + one of Plausible/PostHog/umami; Discovery `APIFY_TOKEN` (skip the pricey
`OXYLABS_*`); Shipping `EASYPOST/SHIPPO` (flat-rate fallback is $0); Storage `S3_*` (R2/MinIO);
Channels `SHOPIFY/ETSY/AMAZON_SP/WOOCOMMERCE` (only if selling there); `HIGGSFIELD_API_KEY` (imagery).

## Cost-control levers (already built in)
- **Gated/mock-until-keyed** — unconfigured features no-op; you pay only for what you enable.
- **Agent runs are cron-bounded** (daily / 6-hourly), not per-request → predictable spend.
- **Polaris (the only per-user AI call)** is capped at 400 tokens / 20 messages and rate-limited.
- **Rate limiting** on `/store/*` + `/admin/lumera/*` protects against cost-spike abuse.
- **No paid SDKs / no new deps** → leaner hosting.

## The one model lever to set
Agents + Polaris default to **`claude-opus-4-8`** (the priciest model). For routine agent work and
concierge chat you rarely need Opus:
- Set **`CLAUDE_MODEL=claude-haiku-4-5`** → ~10–20× cheaper per token, faster, minimal practical loss.
- Or split: cheap model for routine agents, Opus only for high-stakes reasoning (ask to wire an
  `AGENTS_MODEL`/`SHEPHERD_MODEL` split if you want that).

## What stays $0 forever (internal)
Self-host Postgres/Redis/MinIO/umami; free tiers for Resend/Sentry/PostHog/Apify; flat-rate shipping;
fixture/manual sourcing. The only unavoidable costs are: DB hosting, payment processor %, and Anthropic
tokens (minimized via Haiku + cron). Everything else is opt-in.
