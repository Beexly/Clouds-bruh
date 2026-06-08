# Lumera — Free & Self-Hosted Toolkit

A curated map of OSS / free-tier tools to Lumera's needs, so a company-of-one can run as close to **$0**
as possible. Pairs with [`docs/COST.md`](COST.md) (keys + cost tiers). Lumera is Medusa v2 + Next.js +
a Claude-agent runtime; every external integration is HTTP/`fetch`-based and **gated** (no cost until a
key is set). Free-tier limits change — verify current limits before relying on them.

## 1. Free / cheap LLM inference — the one cost that scales
The agents (cron-bounded) and the Polaris concierge (per-user) are the only recurring AI spend. Lumera
now speaks **any OpenAI-compatible endpoint** for the concierge via `LLM_BASE_URL` + `LLM_API_KEY`
(+ `LLM_MODEL`/`SHEPHERD_MODEL`) — Anthropic stays the default/highest-quality option.

| Provider | Note | Cost |
|---|---|---|
| **Groq** | OpenAI-compatible, very fast; generous free tier | $0 free tier |
| **OpenRouter** | many models incl. `:free` variants | $0 free models |
| **Google AI Studio (Gemini)** | OpenAI-compat endpoint; free tier | $0 free tier |
| **Cerebras / Together** | OpenAI-compatible, free credits | low/free |
| **Ollama / vLLM (self-host)** | run local models; full control | $0 (your hardware) |
| **Anthropic (default)** | highest quality for agent reasoning | per-token (use `CLAUDE_MODEL=claude-haiku-4-5` to cut ~10–20×) |

Set `LLM_BASE_URL`+`LLM_API_KEY` → Polaris runs on a free model at ~$0. Keep Anthropic for the agent
loop (its tool-use format is Anthropic-native; an OpenAI tool-calling adapter is a future option).
Refs: `mnfst/awesome-free-llm-apis`, `cheahjs/free-llm-api-resources`.

## 2. Analytics / session replay (self-host = $0)
Lumera already gates Plausible/PostHog/umami via `NEXT_PUBLIC_*` (pick one).

| Tool | For | Cost |
|---|---|---|
| **umami** (self-host) | privacy-first page analytics | $0 |
| **Matomo** (self-host) | full analytics suite | $0 |
| **PostHog** | product analytics + flags; free tier or self-host | $0 free tier (1M events) |
| **OpenReplay** (self-host) | session replay / UX debugging | $0 |

## 3. Automation / workflow / no-code ops
Wire Lumera webhooks + agent escalations to external actions without bespoke code.

| Tool | For | Cost |
|---|---|---|
| **n8n** | flexible workflow automation (webhooks → actions) | $0 self-host |
| **Activepieces** | no-code automations, MIT | $0 self-host |
| **Automatisch** | open Zapier alternative | $0 self-host |
| **Windmill** | scripts + workflows + internal UIs | $0 self-host |
| **Huginn** | agent/monitoring automations | $0 self-host |

Pattern: point Lumera's vendor/Stripe webhooks or the cockpit approval events at an n8n/Activepieces
webhook to fan out to Slack/Sheets/etc. — no Lumera code change.

## 4. Scraping / monitoring (self-host vs managed)
Lumera's radar uses managed Oxylabs/Apify (gated). Self-host alternatives:

| Tool | For | Cost |
|---|---|---|
| **Crawlee** (TS) | self-host scraping framework (Playwright/Cheerio) | $0 |
| **Browserless** | headless-Chrome service for scraping/screenshots | $0 self-host |
| **Playwright** | browser automation under Crawlee | $0 |
| **changedetection.io** | watch competitor price/stock pages | $0 self-host |

Trade-off: managed (Apify free tier / Oxylabs paid) = zero ops; self-host (Crawlee+Browserless) = $0 but
you run + maintain it and handle anti-bot/ToS yourself.

## 5. Search
Current: pgvector hybrid search (already in Postgres, $0). Consider a dedicated engine only at scale:

| Tool | When | Cost |
|---|---|---|
| **Meilisearch** | typo-tolerant instant search, simple ops | $0 self-host |
| **Typesense** | fast faceted search, geo | $0 self-host |

Stay on pgvector until catalog/traffic make a dedicated engine worth the extra service.

## 6. Data / PIM / ERP / headless admin (heavier — only as you scale)
| Tool | For | Cost |
|---|---|---|
| **Directus / NocoDB** | instant admin/DB UI over Postgres | $0 self-host |
| **Akeneo / Pimcore** | PIM for rich, multi-attribute catalogs | $0 community |
| **ERPNext / Odoo** | back-office (accounting, inventory, HR) | $0 community |

Lumera's cockpit + Medusa admin cover the company-of-one today; adopt these only when catalog/ops scale.

## 7. Support & marketing (self-host alternatives)
Lumera already has Resend (transactional email) + Klaviyo (events), both gated.

| Tool | For | Cost |
|---|---|---|
| **Chatwoot** (self-host) | support inbox / live chat (pairs with Polaris) | $0 |
| **Mautic** (self-host) | marketing automation (vs Klaviyo) | $0 |

## 8. Official SDKs vs Lumera's hand-rolled clients
Lumera deliberately hand-rolls `fetch` clients (Printify/CJ/Resend/Klaviyo/Apify/EasyPost/Shippo/MinIO)
to avoid dependencies + keep the bundle lean. The official SDKs are the **reference for correct
endpoints/payloads** if we ever adopt them: `printipy`/`nasa8x/printify-api`, `python-cjdropshipping-api`,
`resend-node`, `klaviyo-api-node`, `apify-client-js` + `crawlee`, EasyPost/Shippo SDKs, `minio-js`,
Cloudflare R2 (S3-compatible — works with the existing `S3_*` provider).

## 9. Public-API directories (future catalog/enrichment)
`public-apis/public-apis`, `apis.guru/openapi-directory`, `ripienaar/free-for-dev` — sourcing references
for free data/enrichment APIs (currency, shipping zones, taxonomy, etc.) when needed.

## Recommended $0 self-hosted stack
Self-host Postgres+pgvector, Redis, and MinIO (or Cloudflare R2 free tier); run analytics on umami or
self-hosted PostHog and errors on self-hosted Sentry or its free tier; send transactional email via
Resend's free tier; point Polaris at a **free OpenAI-compatible LLM** (Groq/OpenRouter) via `LLM_BASE_URL`
while keeping `CLAUDE_MODEL=claude-haiku-4-5` for cheap agent runs; source via Printify + CJ (free APIs)
and Apify's free tier for discovery; automate ops with self-hosted n8n. Net unavoidable cost: DB/compute
hosting + payment-processor % only.
