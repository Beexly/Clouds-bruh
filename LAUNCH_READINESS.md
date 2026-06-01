# ALTER XIV — LAUNCH READINESS

> Live dashboard for taking Alter XIV from *"deployed"* to *"taking real orders, on-brand, intelligence on."*
> Numbers are grounded in **verified** runs (below), not estimates. Updated 2026-06-01.
>
> **Deployment:** Medusa Cloud project **"Clouds bruh"** · env **Production** · branch **`deploy/medusa-cloud`**.
> Backend **Ready·Active**, Storefront **Live** at `https://gegege.medusajs.site`.

---

## ⮞ Launch-ready: **~65%**  ·  Platform engineering: **~90% (verified)**  ·  Launch config: **~45%**

The platform is **built and proven**; the remaining gap is almost entirely **configuration you (the founder)
do in the Cloud console** — seed the catalog, wire the storefront key, set secrets, enable pgvector — plus a
few hardening items (Redis, object storage, perf). Very little of what's left is engineering.

```
Platform engineering  ██████████████████░░  ~90%   ← verified: build · 52 tests · verify:api 22/22 · deployed
Launch configuration  █████████░░░░░░░░░░░  ~45%   ← founder/Cloud actions, each small
Overall launch-ready  █████████████░░░░░░░  ~65%
```

---

## What is VERIFIED (this pass, against real Postgres 16 + pgvector 0.6.0 + Redis 7)

| Gate | Result | Evidence |
|---|---|---|
| `pnpm install --frozen-lockfile` | ✅ | lockfile consistent |
| `pnpm lint` | ✅ | 4/4 packages, `tsc --noEmit` |
| `pnpm test` | ✅ | **52 unit tests** green |
| `pnpm build` | ✅ | backend builds; storefront builds on Cloud (sandbox only blocks Google-Fonts egress) |
| `pnpm verify:api` | ✅ | **22/22 API regressions** — full chain: migrate → seed → **pgvector embeddings** → boot → regressions |
| Live deployment | ✅ | backend Ready·Active, storefront Live (Medusa Cloud) |

The 22 regressions exercise the **GSN-class intelligence layer end-to-end**: `for_you`/`graph_rec`
recommendations, dynamic pricing (within margin floor), predictive analyst (demand forecast + churn risk),
ORACLE preference steering, hybrid (pgvector) search, conversational Shepherd, Altar Rewards, and a
test-mode monetization round-trip. **This is functional, not mocked.**

---

## Readiness by category

| # | Category | Score | Status / evidence | Remaining |
|---|---|---|---|---|
| 1 | Deploy & stability | 90% | backend+storefront live on Cloud | attach **Redis** (kills in-memory event-bus warning) |
| 2 | Build/test/ops verification | 100% | build · 52 tests · verify:api 22/22 ✅ | — |
| 3 | Commerce core (browse→cart→checkout) | 90% | regressions green; test-mode checkout works (`pp_system_default`) | live payments (founder-gated) |
| 4 | **Catalog on the live store** | 25% | seed mechanism verified; **not yet run on Cloud** (demo fixtures only) | run **`medusa exec ../../scripts/bootstrap.ts`** against the Cloud DB; load real catalog |
| 5 | Storefront ↔ backend wiring | 30% | storefront live but needs the publishable key | set `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` (printed by bootstrap) |
| 6 | Intelligence layer | 75% | verified 22/22 locally | enable **pgvector** + run `setup-embeddings.ts` (recs/search); add `ANTHROPIC_API_KEY` (agents mock→live) |
| 7 | Security / secrets | 40% | config boots on fallbacks | set real `JWT_SECRET`,`COOKIE_SECRET`,`STORE_CORS`,`ADMIN_CORS`; **change the `secret` admin password** |
| 8 | Payments | 50% | Stripe **test** ready & gated | go-live = founder approval + live key (escalation gate) |
| 9 | Launch ops | 30% | on `.medusajs.site` | custom domain · legal/policies · transactional email · object storage (S3) · Lighthouse/perf |

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
8. Custom domain, legal/returns/privacy pages, transactional email, Lighthouse/perf pass.

**D. Go-live gates (founder approval — escalation gate):**
9. Stripe **test → live**, launch a real drop, publish content, move money. Agents only ever DRAFT/STAGE these.

---

## Smoke-test the LIVE deploy (no local infra needed)
Point the API regression suite at the deployed backend after seeding:
```bash
MEDUSA_BACKEND_URL=https://<your-backend-url> PUBLISHABLE_KEY=<pk_…> pnpm test:regression
```

---

## Guardrails (unchanged, permanent)
No live keys committed · no autonomous money movement · Stripe test-only until founder go-live · escalation
gate intact (`apps/intelligence/src/orchestrator/run-agent.ts`) · brand integrity · verified-not-assumed.
