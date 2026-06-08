# LUMERA — ARCHITECTURE & BUILD BLUEPRINT
> The intelligent commerce platform. Modeled on Galaxy Sports Network's standard: introspective, dynamic, personalized, self-improving.
> **Brand:** dark luminous editorial luxury · "The Broadcast" live-commerce channel.
> **This document is the source of truth.** Claude Code and Codex build from this. Nothing ships ugly or unverified.

---

## 0. THE THESIS

Most stores are catalogs with a checkout. Lumera is a **living system** that watches, learns, personalizes, and runs itself. Five qualities define it — the same ones driving Galaxy Sports Network to be the best site of 2026:

| Quality | What it means here | Subsystem that delivers it |
|---|---|---|
| **Intelligence / introspection** | The platform audits *itself* — catalog gaps, off-brand images, conversion drops, SEO drift — and fixes or flags. | **INTROSPECTION** |
| **Dynamic ability** | The storefront re-composes in real time per visitor and per signal. | **ORACLE** (bandit merchandising) |
| **Personalization** | Every visitor gets their own Broadcast — drops, chapters, copy, recs. | **MIND** + **SIGNAL** |
| **Learning** | Every interaction (view, dwell, cart, buy) improves the next decision. | **Learning Loop** |
| **Automations** | Autonomous "departments" (Claude agents) source, curate, market, support, account. | **CONGREGATION** |

The intelligence is not a feature bolted on. It is the spine. Commerce (Medusa) is the skeleton; the intelligence layer is the nervous system.

---

## 1. STACK (2026, TypeScript-native, Claude/Codex-friendly)

```
Commerce core ...... Medusa v2 (modular + workflow orchestration)
Database ........... PostgreSQL 16 + pgvector (embeddings live with the data)
Cache / streams .... Redis 7 (event streams, bandit state, locks)
Storefront ......... Next.js 15 (App Router) + React 19 + Tailwind  →  "The Broadcast"
Agent runtime ...... custom tool-use loop on the Anthropic SDK (TypeScript)  →  the autonomous departments
AI ................. Anthropic Claude (agents, copy, self-audit, conversational commerce)
Imagery ............ Higgsfield (Soul + Marketing Studio) — planned; the in-app tool is a stub (no API call yet)
SEO ................ claude-seo (Claude Code plugin) — planned; the in-app `claude_seo` tool is a stub
Intelligence ....... custom Medusa modules: signal · personalization · recommendation · drops
Data radar ......... Oxylabs Shein scraper · scraper-master price tracking · Bright Data seed
Orchestration ...... Medusa workflows + scheduled jobs + the intelligence orchestrator
QA ................. APIAuto + Vitest (verify-before-done)
Monorepo ........... Turborepo (pnpm workspaces)
```

Why this stack: it's all TypeScript end-to-end (one language for Claude Code/Codex to reason about), Medusa gives modular commerce + compensatable workflows, and pgvector keeps personalization simple (no separate vector DB).

> **Agent runtime — as built (not as originally planned).** The autonomous departments do **not** currently use the Claude Agent SDK. The orchestrator hand-rolls a bounded tool-use loop directly on the raw Anthropic SDK (`@anthropic-ai/sdk`) in `apps/intelligence/src/orchestrator/run-agent.ts`. The `@anthropic-ai/claude-agent-sdk` package is a declared dependency of `apps/intelligence` but is **not imported anywhere** — it is currently unused. Migrating the loop onto the agent SDK (to reuse its agent loop, tool use, and memory primitives) remains a worthwhile future step, but the docs describe the custom loop because that is what runs today.

---

## 2. SYSTEM MAP

```
                          ┌──────────────────────────────────────┐
                          │        THE BROADCAST (Next.js)        │
                          │  departure-board home · 5 chapters    │
                          │  personalized rails · scarcity ·      │
                          │  social proof · conversational store  │
                          └───────────────┬──────────────────────┘
                                          │  GraphQL/REST  +  /signal events
            ┌─────────────────────────────┼─────────────────────────────┐
            │                                                            │
   ┌────────▼─────────────────────────────────────────────────┐   ┌─────▼──────────┐
   │  COMMERCE CORE — MEDUSA v2                                 │   │  SIGNAL        │
   │  product cart pricing inventory fulfillment payment        │◄──┤  event ingest  │
   │  promotion region sales-channel tax customer order         │   │  → pg + redis  │
   │  + custom modules: drops · personalization · recommendation│   └─────┬──────────┘
   │  + workflows (durable, compensatable)                      │         │
   └───┬───────────────────────┬───────────────────────┬───────┘         │
       │                       │                       │                 │
 ┌─────▼──────┐        ┌───────▼────────┐      ┌────────▼───────┐  ┌──────▼─────────┐
 │  MIND      │        │  ORACLE        │      │ INTROSPECTION  │  │  Learning Loop │
 │ profiles + │        │ recs + dynamic │      │ self-audit +   │  │ outcomes →     │
 │ affinity   │───────►│ merchandising  │─────►│ self-correct/  │◄─┤ embeddings +   │
 │ vectors    │        │ (bandit)       │      │ flag           │  │ bandit + agents│
 └────────────┘        └────────────────┘      └───────┬────────┘  └──────▲─────────┘
                                                        │                  │
                          ┌─────────────────────────────▼──────────────────┴──────────┐
                          │  CONGREGATION — autonomous Claude agent departments        │
                          │  Curator · Sourcer · Quartermaster · Herald · Scribe ·     │
                          │  Artisan · Shepherd · Treasurer · OracleKeeper             │
                          │  tools: Medusa Admin · scrapers · Higgsfield · claude-seo  │
                          │  scheduled + event-driven · shared Ledger (memory/audit)   │
                          └────────────────────────────────────────────────────────────┘
```

---

## 3. THE INTELLIGENCE LAYER (the part that makes it GSN-class)

Five subsystems. Three live in the Medusa backend as custom modules (SIGNAL, MIND/personalization, ORACLE/recommendation). Two live in the `intelligence` app (CONGREGATION agents, the Learning Loop) plus INTROSPECTION which spans both.

### 3.1 SIGNAL — behavioral event ingestion
Capture everything, in real time. The storefront fires events to `POST /store/signal`; they land in Postgres (`signal_event`) and a Redis stream for live consumers.

Event taxonomy (`packages/shared/src/events.ts`):
`page_view, product_view, dwell, scroll_depth, search, filter_apply, add_to_cart, remove_from_cart, wishlist_add, checkout_step, purchase, drop_view, countdown_view, chapter_enter, share, recommendation_click, recommendation_impression`.

Each event: `{ id, visitor_id, session_id, type, entity_id?, value?, context{chapter,channel,device,referrer}, ts }`.

### 3.2 MIND — visitor profiles & affinity
Anonymous-first. A `visitor_profile` accrues **affinity vectors**: per-chapter, per-category, per-price-band, per-aesthetic. Updated from SIGNAL events (recency-weighted). Assigns a **segment** in real time (e.g. `new_seeker`, `armor_devotee`, `high_intent`, `lapsed`). When a visitor identifies (email/account), the anonymous profile merges forward.

`visitor_profile`: `{ visitor_id, customer_id?, segment, affinity{chapter,category,price_band,aesthetic}, embedding vector(1536), last_seen, ltv_estimate }`.

### 3.3 ORACLE — recommendations & dynamic merchandising
Product **embeddings** (pgvector) built from title + description + attributes + image tags. Recommendation strategies:
- **For You** — visitor embedding ↔ product embedding cosine similarity.
- **Because you viewed** — item-item similarity.
- **Complete the set** — co-purchase / same-chapter affinity.
- **Trending in chapter** — velocity-weighted views/buys.

**Dynamic Broadcast** — the homepage block order is chosen per visitor by a **contextual bandit** (Thompson sampling over candidate blocks; reward = click→cart→purchase). This is the "dynamic ability": two visitors never see the same Broadcast, and the layout *learns* what converts. Bandit state in Redis.

Dynamic pricing hook: ORACLE can request margin-aware price adjustments through Medusa's pricing module (guardrailed by min-margin — never below floor).

### 3.4 CONGREGATION — autonomous agent departments
Each department is a **Claude agent** (today: a custom tool-use loop on the raw Anthropic SDK — see §1; not the Claude Agent SDK) with: an identity + mission system prompt, a tool set, persistent memory (the Ledger), a schedule, a **self-audit contract**, and **escalation rules** (what it must ask Garrett before doing). Full specs in `apps/intelligence/src/agents/*` and §5 below.

The roster:
| Agent | Department | Core job |
|---|---|---|
| **Curator** | Merchandising/Curation | Mine trends (Shein scraper + datasets), propose drops, write product copy, define chapters |
| **Sourcer** | Sourcing/Purchasing | Check supplier stock+price, track margins (price scraper), flag compression |
| **Quartermaster** | Operations/OMS | Order routing, fulfillment monitoring, returns/exchanges |
| **Herald** | Marketing/Social | Content calendar, social posts, campaign briefs |
| **Scribe** | SEO/Content | Run claude-seo agents, schema, blog, GEO/AI-search optimization |
| **Artisan** | Creative/Media | Generate product imagery (Higgsfield + ported templates), enforce anti-AI-look + brand |
| **Shepherd** | Customer Service | Conversational support, order help, RMA, FAQ |
| **Treasurer** | Finance | Invoicing/accounting (iDURAR patterns), margin & cash reports |
| **OracleKeeper** | Merch Intelligence | Tune ORACLE recs/bandit, design + read experiments |

Agents are orchestrated by `intelligence/src/orchestrator` — some run on cron (Curator daily, Treasurer weekly), some on events (Shepherd on support message, Quartermaster on order.placed, Artisan on product.created-without-image).

> **Tool status (verified, not assumed).** Several agent tools are **stubs** today: they return placeholder/empty results and do not call the external service. Notably `claude_seo` (Scribe), `higgsfield`/image-generation (Artisan), `voc_reviews` (Voice-of-Customer), and `video_render` are stubs/unconfigured. The Apify/DB-GPT integrations described in `docs/INTEGRATIONS.md` are likewise connect-when-needed, not yet wired. Treat anything not explicitly confirmed as "wired" as planned. See each tool file under `apps/intelligence/src/tools/` for the exact state.

### 3.5 INTROSPECTION — self-audit & the Learning Loop
**Self-audit agents** run continuously and embody your "verified, not assumed" rule:
- **Catalog health** — missing images/descriptions/prices/variants, orphan products, broken category trees.
- **Brand/aesthetic consistency** — vision-audit product images against the brand spec; off-brand → Artisan regenerates.
- **Conversion anomaly** — funnel drop detection per chapter/product.
- **SEO drift** — claude-seo `seo-drift` agent; schema validity.
- **Margin/inventory** — price compression, oversell risk, stale stock.
- **Integrity** — broken links, checkout failures, payment errors.

Each finding is either **auto-corrected** (safe: fix metadata, regenerate an off-brand image, re-rank a block) or **flagged to Garrett** with a recommendation + the falsifiable check behind it ("how would we know this failed?"). Audits write to the Ledger.

**The Learning Loop** closes everything: outcomes (did the recommended block convert? did the drop sell through? did the agent's copy/imagery outperform? did the experiment win?) flow back to (a) re-train product/visitor embeddings, (b) update bandit rewards, (c) update agent memory/heuristics. The system measurably improves every day. This is the "learns from every interaction, self-improving" requirement, made concrete.

---

## 4. DATA MODELS (build these first — hard to reverse)

Defined in `packages/shared/src/types.ts` and realized as Medusa module models. Product schema merges marketplace data patterns with Lumera curation/drop fields.

```ts
// PRODUCT (extends Medusa product with custom fields via metadata/module)
Product {
  id, sku, gtin?, upc?, model_number?, brand
  title, description, handle
  category_tree: string[]          // ["Apparel","Outerwear"]
  chapter: 'stillness'|'armor'|'signal'|'altar'|'relentless'
  scripture_ref?: string
  price: { initial, final, currency }
  variants: Variant[]              // color, size, all_available_sizes
  media: { main_image, image_urls[], image_count, video? }
  social: { rating?, reviews_count?, badge? }   // "Altar Selected", bestseller rank
  merch: { related_product_ids[], bs_rank?, units_total?, units_remaining? }
  supplier: { id, supplier_sku, supplier_price, lead_time_days }  // drop-ship
  ai: { embedding: vector(1536), image_audit_status, copy_audit_status,
        trained_algorithmic_media: boolean }    // IPTC AI-image labeling
}

Drop {                              // the unit of "The Broadcast"
  id, name, series, chapter, status: 'scheduled'|'live'|'sold_out'|'archived'
  starts_at, ends_at, units_total, units_remaining, product_ids[]
}

SignalEvent { id, visitor_id, session_id, type, entity_id?, value?, context, ts }

VisitorProfile {
  visitor_id, customer_id?, segment, embedding: vector(1536),
  affinity: { chapter{}, category{}, price_band{}, aesthetic{} },
  last_seen, ltv_estimate
}

Recommendation { id, visitor_id, strategy, product_ids[], score, served_at, clicked, converted }

AgentRun {                          // every autonomous action, auditable
  id, agent, trigger, input, output, tools_used[], decisions[],
  outcome?, status, escalated, started_at, finished_at
}

Audit { id, type, severity, finding, recommendation, falsifiable_check,
        auto_corrected, entity_ref, created_at }

Experiment { id, name, hypothesis, variants[], metric, status, winner?, lift? }
```

---

## 5. AGENT CONTRACT (every department agent follows this)

Each agent file in `apps/intelligence/src/agents/` exports `{ name, mission, model, tools, schedule, systemPrompt, selfAudit, escalation }`. The shared contract:

1. **Mission** — one sentence. The agent optimizes for it.
2. **Tools** — least-privilege. Curator can read the catalog + scrapers + write *draft* products; it cannot publish without Garrett (escalation). Shepherd can read orders + draft replies; refunds escalate.
3. **Memory (Ledger)** — every run reads relevant history and writes its decisions + rationale. Agents learn from their own past outcomes.
4. **Self-audit** — after acting, the agent checks its own work against a falsifiable test and logs the result.
5. **Escalation** — explicit list of actions requiring Garrett's approval (publish, refund, spend, price changes beyond guardrails, anything destructive). **No autonomous money movement or public posting without approval.** This is a hard rule, mirroring the security posture of the whole system.
6. **Voice** — all customer-facing or public output matches the brand: dark sacred editorial luxury, confident, never templated.

(See `agents/_contract.md` for the canonical version Claude Code/Codex must enforce.)

---

## 6. THE BROADCAST (storefront) — behavior spec

- **Home = departure board.** Live drops as rows: name · series/chapter · countdown · units remaining · price. Block *order is personalized* by ORACLE's bandit. SSR for the shell, client hydration for live countdowns + personalized rails.
- **Five chapters** as narrative collections: Stillness · Armor · Signal · Altar · Relentless.
- **Product card** carries the conversion primitives from the dataset research: bestseller/ranking badge, "N carried this month," scarcity countdown, rating + review count, "Complete the set."
- **For You rail** — ORACLE recs, updates as the visitor browses (SIGNAL → MIND → ORACLE round-trip).
- **Conversational store** — Shepherd agent answers "what should I wear for…", styles a chapter, finds an order.
- **Every interaction emits a SIGNAL event.** The store teaches the system as people use it.

Brand/design system is built at implementation time (frontend-design skill + the prior "dark sacred editorial luxury" direction). The skeleton ships structure + tokens; Claude Code makes it beautiful.

---

## 7. BUILD ORDER (see BUILD.md for exact commands)

1. `docker compose up` — Postgres(pgvector) + Redis.
2. Backend: install Medusa, run migrations for the 4 custom modules, seed catalog from Bright Data datasets.
3. Wire SIGNAL ingestion + MIND profiles (you can personalize the moment events flow).
4. Build ORACLE recs + the bandit; expose `/store/recommendations`.
5. Storefront: scaffold The Broadcast, wire recs + signal, apply brand.
6. Intelligence app: stand up the orchestrator + Curator + Artisan + Scribe first (curation → imagery → SEO is the content engine).
7. Add the rest of the CONGREGATION; turn on INTROSPECTION self-audits.
8. Close the Learning Loop (outcomes → embeddings + bandit + agent memory).
9. APIAuto + Vitest regression. Verify before "done."
10. (Optional, later) Solana Pay + token-gated drops.

---

## 8. NON-NEGOTIABLES (enforced by Claude Code & Codex)

- **Verified, not assumed.** Nothing is "done" until it renders/passes. Self-audit + tests gate every feature.
- **Least-privilege agents.** No autonomous money movement, publishing, or destructive action without Garrett's explicit approval.
- **Brand integrity.** Every public asset matches the spec or it doesn't ship. Artisan + brand-audit enforce it.
- **Personalization is first-class.** If a feature can be personalized, it is.
- **Everything emits signal; everything learns.** No dead-end interactions.
- **One language (TS), one source of truth (this doc).**
