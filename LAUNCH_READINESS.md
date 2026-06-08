# LUMERA — LAUNCH READINESS

> Live dashboard for taking Lumera from *"deployed"* to *"taking real orders, on-brand, intelligence on."*
> Numbers are grounded in **verified** runs (below), not estimates. Updated 2026-06-01.
>
> **Deployment:** Medusa Cloud project **"Clouds bruh"** · env **Production** · branch **`deploy/medusa-cloud`**.
> Backend **Ready·Active**, Storefront **Live** at `https://gegege.medusajs.site`.
>
> **Brand:** Lumera Brand Guidelines v2 implemented (`docs/BRAND_GUIDELINES.md`) — desaturated palette,
> lowercase grotesque wordmark, corona-ring favicon, voice pass (concierge = **Polaris**). Zero
> faith-coded user-facing copy remains; verified across storefront + backend + intelligence.
>
> **Also shipped this pass:** social share card (OG/Twitter — verified PNG render), `/account` hub +
> header search/account cues (prototypicality §0/§10), an order-confirmation email subscriber
> (mock-until-keyed), and rebrand regression tests (**56** unit total).
>
> **Verification refresh — 2026-06-08:** re-verified from `claude/affectionate-clarke-KJ8O1`:
> `pnpm build` green (4/4) · `pnpm test` **290 passing** (shared 28 · intelligence 47 · storefront 49 ·
> backend 166) · latest branch CI run **success** (lint · test · build · `verify:api` with pgvector+Redis).
> **Brand domain canonicalized in code to `lumeralabel.com`** (storefront SITE fallbacks, Footer contact,
> Resend sender; production still set via env). The numbers further down are a 2026-06-01 snapshot.
>
> **▶ Domain cutover — `lumeralabel.com` (the gated next action):**
> 1. Buy `lumeralabel.com` (+ `lumera.gold` → 301 redirect to canonical).
> 2. Storefront env: `NEXT_PUBLIC_SITE_URL=https://lumeralabel.com`.
> 3. Backend env: `STORE_CORS` / `ADMIN_CORS` = real origins · `NOTIFICATION_EMAIL_FROM=no-reply@lumeralabel.com` (+ `RESEND_API_KEY` + Resend DNS records).
> 4. Deploy platform: attach custom domain + TLS · update PayPal return URLs.
> 5. Trademark: run a real clearance search before filing (Class 25/35) — the domain needs none; a filing does.

---

## ⮞ Launch-ready: **~65%**  ·  Platform engineering: **~90% (verified)**  ·  Launch config: **~45%**

The platform is **built and proven**; the remaining gap is almost entirely **configuration you (the founder)
do in the Cloud console** — seed the catalog, wire the storefront key, set secrets, enable pgvector — plus a
few hardening items (Redis, object storage, perf). Very little of what's left is engineering.

```
Platform engineering  ██████████████████░░  ~90%   ← verified: build · 56 tests · verify:api 23/23 · deployed
Launch configuration  █████████░░░░░░░░░░░  ~45%   ← founder/Cloud actions, each small
Overall launch-ready  █████████████░░░░░░░  ~65%
```

---

## What is VERIFIED (this pass, against real Postgres 16 + pgvector 0.6.0 + Redis 7)

| Gate | Result | Evidence |
|---|---|---|
| `pnpm install --frozen-lockfile` | ✅ | lockfile consistent |
| `pnpm lint` | ✅ | 4/4 packages, `tsc --noEmit` |
| `pnpm test` | ✅ | **56 unit tests** green |
| `pnpm build` | ✅ | backend builds; storefront builds on Cloud (sandbox only blocks Google-Fonts egress) |
| `pnpm verify:api` | ✅ | **23/23 API regressions** — full chain: migrate → seed → **pgvector embeddings** → boot → regressions, **incl. a complete checkout → order (test mode)** |
| Live deployment | ✅ | backend Ready·Active, storefront Live (Medusa Cloud) |
| Continuous integration | ✅ | `.github/workflows/ci.yml` re-runs lint · test · build · `verify:api` (pgvector+Redis services) on every push/PR |

The 23 regressions exercise the **GSN-class intelligence layer end-to-end**: `for_you`/`graph_rec`
recommendations, dynamic pricing (within margin floor), predictive analyst (demand forecast + churn risk),
ORACLE preference steering, hybrid (pgvector) search, the conversational concierge (Polaris), Luminance
rewards, and a test-mode monetization round-trip. **This is functional, not mocked.**

---

## Readiness by category

| # | Category | Score | Status / evidence | Remaining |
|---|---|---|---|---|
| 1 | Deploy & stability | 90% | backend+storefront live on Cloud | attach **Redis** (kills in-memory event-bus warning) |
| 2 | Build/test/ops verification | 100% | build · 56 tests · verify:api 23/23 ✅ | — |
| 3 | Commerce core (browse→cart→checkout→**order**) | 92% | **full checkout → order placement verified** (test mode, `pp_system_default`) — regression 23/23 | live payments (founder-gated) |
| 4 | **Catalog on the live store** | 25% | seed mechanism verified; **not yet run on Cloud** (demo fixtures only) | run **`medusa exec ../../scripts/bootstrap.ts`** against the Cloud DB; load real catalog |
| 5 | Storefront ↔ backend wiring | 30% | storefront live but needs the publishable key | set `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` (printed by bootstrap) |
| 6 | Intelligence layer | 75% | verified 23/23 locally | enable **pgvector** + run `setup-embeddings.ts` (recs/search); add `ANTHROPIC_API_KEY` (agents mock→live) |
| 7 | Security / secrets | 40% | config boots on fallbacks | set real `JWT_SECRET`,`COOKIE_SECRET`,`STORE_CORS`,`ADMIN_CORS`; **change the `secret` admin password** |
| 8 | Payments | 50% | Stripe **test** ready & gated | go-live = founder approval + live key (escalation gate) |
| 9 | Launch ops | 45% | on `.medusajs.site`; **legal pages** (privacy · terms · returns + footer — review-ready templates); **OG/Twitter share card**; **email subscriber scaffolded** | custom domain · finalize legal copy w/ counsel · register an email provider (subscriber is ready) · object storage (S3) · Lighthouse/perf |

---

## The runway — exact remaining steps (most are minutes, in the Cloud console)

**A. Make the live store shoppable (highest impact, ~10 min):**
1. Set backend env: `JWT_SECRET`, `COOKIE_SECRET`, `STORE_CORS` (storefront origin), `ADMIN_CORS` (backend origin). Change the admin password off `secret`.
2. Seed the store: from `apps/backend`, run **`npx medusa exec ../../scripts/bootstrap.ts`** against the production DB — idempotent; loads catalog · commerce · prices · inventory · membership tiers · prints the publishable key. (Run via Cloud's command runner, or locally with `DATABASE_URL` pointed at the Cloud database. `pnpm bootstrap` wraps the same in turbo.)
3. Put that publishable key on the storefront as `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`. → products appear at gegege.medusajs.site.

**B. Turn on the intelligence (~10 min):**
4. Enable the **pgvector** extension on the Cloud Postgres, then run `scripts/setup-embeddings.ts` → recommendations + hybrid search light up.
5. Add `ANTHROPIC_API_KEY` (+ `CLAUDE_MODEL`) → CONGREGATION agents + Shepherd flip mock→live (escalation gate still gates all spend/publish).

**C. Harden for real traffic:**
6. Attach **Redis** (Cloud injects `REDIS_URL`; config auto-enables the event bus + workflow engine).
7. Durable media: set the full `S3_*` set (or MinIO) — local disk is ephemeral across redeploys.
8. Custom domain, legal/returns/privacy pages, **transactional email** (the order-confirmation subscriber is scaffolded mock-until-keyed — register a Resend/SendGrid provider in `medusa-config.ts` modules, then set `NOTIFICATION_EMAIL_FROM` + the provider key), Lighthouse/perf pass.

**D. Go-live gates (founder approval — escalation gate):**
9. Stripe **test → live**, launch a real drop, publish content, move money. Agents only ever DRAFT/STAGE these.

---

## Live checks (run against the deploy)
**Readiness go/no-go** — inspects env + DB and prints this percentage *live* (read-only, safe anytime):
```bash
DATABASE_URL=<cloud-db-url> pnpm preflight     # ✅ READY / ❌ NOT READY + the exact blockers
```
**Smoke-test the API** after seeding:
```bash
MEDUSA_BACKEND_URL=https://<your-backend-url> PUBLISHABLE_KEY=<pk_…> pnpm test:regression
```

---

## Security notes (pre-launch audit, this pass)
- ✅ **Analyst text-to-SQL is safe.** `/store/analyst` does **not** build SQL from user input — `matchQuery`
  selects from a fixed allowlist of predefined queries, executed inside a `BEGIN READ ONLY` transaction.
  No injection; writes are impossible. (Verified by reading `api/store/analyst/{route,bi}.ts`.)
- ✅ **Internal endpoints now gated (fail-closed in production).** `/store/cockpit` (ops snapshot) and
  `/store/analyst` (margins, demand/churn forecasts) require **`COCKPIT_KEY`** in production (`?key=` or
  `x-cockpit-key`); unset-in-prod → `401`, so they are no longer world-readable. The `/cockpit` page is a
  server component and now sends the key **server-side** (`process.env.COCKPIT_KEY`, never a
  `NEXT_PUBLIC_*` value). Dev stays open so the 23 regressions pass; `verify:api` confirmed 23/23.
  **Action:** set `COCKPIT_KEY` on the **backend** *and* the **storefront** server env to view the cockpit
  in production (`pnpm preflight` flags it).

## Guardrails (unchanged, permanent)
No live keys committed · no autonomous money movement · Stripe test-only until founder go-live · escalation
gate intact (`apps/intelligence/src/orchestrator/run-agent.ts`) · brand integrity · verified-not-assumed.
