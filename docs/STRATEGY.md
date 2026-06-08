# Lumera — Positioning & Roadmap (Now → Future)

Capstone strategy: what Lumera is today, why it wins, the **fastest path to kick off**, and how every
tool/API in our research set maps to a phased future. Pairs with `docs/COST.md`,
`docs/SELF_HOSTED_STACK.md`, `docs/LUMERA_SOURCING_STACK.md`, and the go-live checklist in
`docs/LUMERA_DROPSHIP_SESSION_HANDOFF.md`.

---

## 1. What Lumera is today (verified, 282 tests · lint · build · proofs green)
An **autonomous, agent-run commerce platform** with an editorial-luxury storefront ("The Broadcast"):
- **Commerce core** — Medusa v2 + custom modules (signal, personalization, recommendation, drops, monetization, lumera).
- **Intelligence layer** — 10 Claude agents (CONGREGATION) + a daily OPERATOR loop + Learning Loop (bandit + embeddings) + INTROSPECTION self-audit, all behind a hard founder-approval escalation gate.
- **Personalization** — SIGNAL → MIND (affinity) → ORACLE (recs + dynamic pricing, staged) on first paint.
- **Dropship lane** — curation board → score/compliance → founder approve → publish to Medusa → vendor order staging → gated submission → tracking; real Printify/Printful/CJ clients + Spocket/Syncee/Modalyst/Dropified bridges; AliExpress/Alibaba/Shein **radar** discovery; native Medusa fulfillment provider; vendor routing intelligence.
- **Customer lifecycle** — accounts + httpOnly sessions, order history + tracking, self-serve returns, first-party reviews, wishlist, gift cards.
- **Ops/infra** — Stripe + PayPal rails, Resend email + Klaviyo events, Sentry + Plausible/PostHog/umami, EasyPost/Shippo rates, R2/MinIO storage, abandoned-cart automation — all **gated + mock-until-keyed**.
- **Trust** — OWASP-hardened (XSS-safe JSON-LD, fail-closed webhooks, rate limiting, SSRF guard, no unpaid minting), backups + DR/incident runbooks, CI green-gates.

## 2. Why this wins — the moat
1. **Company-of-one autonomy.** Agents run merchandising, sourcing, ops, support, finance, marketing, and BI; the founder only approves money/publish/submit. Competitors (Shopify + a stack of paid apps; generic dropship tools) are **manual + per-app fees + no brand**.
2. **Compounding intelligence flywheel.** Every interaction → SIGNAL → learning → better recs/pricing/curation. The moat **grows with usage and data** — a structural advantage no plugin gives.
3. **Editorial brand + personalization.** GSN-class "dark luminous luxury," real-time per-visitor Broadcast — vs. the interchangeable look of typical dropship stores.
4. **Near-$0 cost base.** Free-LLM-capable + self-hostable + gated → high margin and fast, cheap experimentation. Cost *is* a moat for a solo operator.
5. **Multi-vendor + multichannel.** Source across Printify/CJ/AliExpress/bridges; sell across our storefront + (scaffolded) Shopify/Etsy/Amazon/Woo → reach + supplier resilience.

## 3. Fastest kickoff path (take real orders in days — the code is ready)
The platform is built; launch is **configuration + a few founder gates**, not development.
1. **Infra ($0 tier):** Postgres+pgvector (Neon/Supabase free or Medusa Cloud) · Redis (Upstash free, optional) · secrets via `openssl rand -base64 32`.
2. **Deploy + seed:** Medusa Cloud/Vercel (already live in dev); set core env; `pnpm bootstrap`; enable pgvector.
3. **AI on, cheaply:** `ANTHROPIC_API_KEY` + `CLAUDE_MODEL=claude-haiku-4-5` for agents; optionally point Polaris at a **free** OpenAI-compatible LLM via `LLM_BASE_URL`/`LLM_API_KEY`.
4. **Payments:** Stripe (or PayPal) keys → run the **one PayPal/Stripe sandbox capture** to confirm the cents↔decimal money unit (the single pre-live money check).
5. **Email + eyes:** Resend free + Sentry free + one analytics (PostHog free / self-host umami).
6. **Prove it:** open a PR → CI runs `verify:api` against real Postgres+Redis (the one check the dev sandbox can't run).
7. **First product lane:** Printify (POD, fastest) → connect → `pnpm curate` → approve 10–20 on `/cockpit` → `pnpm publish:approved`.
8. **Go live (gated):** after a `pnpm fulfillment:drill`, flip `VENDOR_LIVE_MODE` → `VENDOR_DRAFT_ORDER_PROOF` → `AUTO_SUBMIT_VENDOR_ORDERS`.

**Day-one KPIs** (already in the cockpit): revenue/AOV/conversion/margin/return-rate/top-products/low-stock + the agent approval inbox.

## 4. Roadmap
- **Phase A — Launch (0–2 wks):** §3 path + first drops + analytics baseline + backups scheduled.
- **Phase B — Harden (2–6 wks):** Stripe Elements (real cards), lifecycle email flows on, abandoned-cart on, Sentry alert rules, Lighthouse/perf pass, promote CSP to enforcing, a11y/contrast pass.
- **Phase C — Scale (1–3 mo):** multichannel selling live (Shopify/Etsy/Amazon/Woo), AliExpress **official** order API, dedicated search (Meilisearch/Typesense) if catalog/traffic warrant, **self-hosted automation** (n8n/Activepieces) for ops fan-out, PIM (Akeneo/Pimcore) if the catalog gets rich, **free-LLM for the agent loop** (OpenAI tool-calling adapter), Chatwoot support + Mautic marketing.
- **Phase D — Platform/future (3–12 mo):** multi-region/currency/tax, creator program (Orbit), a vendor/creator **marketplace network**, web3 (Solana Pay + on-chain loyalty), and the big one — **productize the agent runtime** ("company-of-one engine") as a licensable layer others run their stores on.

## 5. Research set → phase mapping (what to use, when)
| Need | Use now (launch) | Add as we scale | Source refs |
|---|---|---|---|
| LLM inference | Anthropic (Haiku) / free OpenAI-compat for concierge | free-LLM for agents (tool-calling adapter); self-host Ollama | awesome-free-llm-apis, free-llm-api-resources |
| Payments | Stripe / PayPal | more methods (Klarna, etc.) | stripe-node, paypal-server-sdk |
| Email/marketing | Resend free + Klaviyo events | self-host Mautic | resend, klaviyo, mautic |
| Analytics/replay | PostHog free / umami self-host | Matomo, OpenReplay | posthog, umami, matomo, openreplay |
| Shipping | flat-rate → EasyPost/Shippo | multi-carrier rules | easypost, shippo |
| Storage | R2 free / MinIO | — | minio-js, r2 |
| Sourcing | Printify + CJ (free APIs) | AliExpress official API; (skip paid bridges) | printipy, cjdropshipping, ae SDKs |
| Discovery | Apify free tier | Crawlee+Browserless self-host; changedetection.io | crawlee, browserless, changedetection |
| Search | pgvector (built-in) | Meilisearch / Typesense | meilisearch, typesense |
| Automation | — | n8n / Activepieces / Windmill | n8n, activepieces, windmill, huginn |
| Catalog/back-office | cockpit + Medusa admin | Directus/NocoDB; Akeneo/Pimcore; ERPNext/Odoo | directus, nocodb, akeneo, pimcore, erpnext, odoo |
| Support | Polaris concierge | Chatwoot self-host | chatwoot |
| Data enrichment | — | free public APIs (currency/shipping/taxonomy) | public-apis, apis.guru, free-for-dev |
| Security posture | OWASP hardening done | nuclei self-scan, OWASP cheatsheets in CI | nuclei, OWASP CheatSheetSeries |

Guiding rule: **prefer free-tier/self-host; skip recurring SaaS fees** (the paid dropship bridges, Oxylabs) until a clear ROI; adopt heavier systems (PIM/ERP/search) only when scale demands.

## 6. Risks & gates (eyes open)
- **Money unit** — confirm with one sandbox capture before any live charge.
- **Free-LLM quality** — fine for the concierge; keep Anthropic for high-stakes agent reasoning.
- **Scraping ToS** — route discovery through managed providers; respect marketplace terms.
- **Founder gates stay on** — no autonomous money/publish/live-submit without explicit flags + approval.
- **DB-backed verification** — runs in CI (needs the PR); the dev sandbox can't.

## 7. The one-line thesis
**Lumera is a self-running, self-improving, brand-grade commerce company that costs almost nothing to
operate** — launch it on the $0 stack now, let the intelligence flywheel compound, and grow it into a
multichannel network and, eventually, a productized autonomous-commerce engine.
