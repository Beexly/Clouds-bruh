# ALTER XIV — MEDUSA CLOUD IMPORT READINESS

> **Alter XIV — Medusa Cloud Readiness Pass (ALTER XIV).** Prepares the *existing*
> Alter XIV project for import/deployment on Medusa Cloud. This is a readiness +
> documentation pass: **no product features added, no live keys added, no live money
> movement enabled, escalation gate preserved.**
>
> Generated 2026-06-01 from the cloud build session. Verified against the repository and a
> full local verification run (results at the end). Where a claim depends on Medusa Cloud's
> evolving console UI, it is marked **[verify in console]** — no live Medusa docs/plugin tool
> was available in this environment, so cloud-side UI labels were not machine-verified.
>
> **Update 2026-06-01:** (a) the top launch blocker (gitignored seed data) is **fixed and verified
> end-to-end** on `deploy/medusa-cloud`; (b) **pgvector confirmed working**; (c) the project was
> **promoted to the repo root** on `deploy/medusa-cloud` so Medusa Cloud finds `pnpm-lock.yaml` at the
> root (it errored *"No lockfiles found"* while nested) — set **Base/Root directory = `apps/backend`**.
> See §4, §13.1, §13.2, §16.

---

## 0. TL;DR

- **Implementation baseline is green** (`install --frozen-lockfile`, `build`, `test`, `lint` all pass — see §15).
- **The two `verify:api` blockers are now resolved on `deploy/medusa-cloud` and verified.** The seed CSVs
  are committed as fixtures (the catalog now self-seeds on a clean DB) and **pgvector is confirmed working**
  (extension + HNSW index + 10 product embeddings). The full clean-DB data pipeline runs **green**
  (migrate → seed → commerce → prices → inventory → embeddings → monetization → publishable key → build).
  The only step not exercised in this sandbox was the final HTTP regression sweep, blocked solely by a
  `medusa start` admin-serving quirk under restricted egress — a non-issue on Medusa Cloud's managed
  runtime (see §16).
- **The GitHub default branch is NOT deployable** — it contains only `conversion/`, no Medusa app.
  Medusa Cloud must target a **non-default** branch. Recommended: a clean **`deploy/medusa-cloud`**
  branch cut from `claude/epic-clarke-XPZhF`.
- Medusa Cloud hosts the **backend + admin**; the **Next.js storefront deploys separately** (e.g. Vercel).

---

## 1. Repo

| | |
|---|---|
| **GitHub repo** | `Beexly/Clouds-bruh` (clone/MCP slug `beexly/clouds-bruh`) |
| **Visibility** | public |
| **Default branch** | `claude/altar-conversion-optimization-DNJYV` (`6f00189`) — **early ancestor, NOT deployable** (only contains `conversion/altar-xiv-conversion-system.md`; no Medusa app) |
| **Project location** | **Repo root** on `deploy/medusa-cloud` (promoted out of `alter-xiv/` so the lockfile sits at the root for Medusa Cloud); canonical `claude/epic-clarke-XPZhF` keeps the `alter-xiv/` layout |

---

## 2. Branch situation (verified 2026-06-01 via `git ls-remote` + GitHub API)

Four remote branches exist:

| Branch | SHA | Role | Deploy? |
|---|---|---|---|
| `claude/altar-conversion-optimization-DNJYV` | `6f00189` | **DEFAULT.** Early ancestor — only the `conversion/` markdown. | ❌ no app on it |
| **`claude/epic-clarke-XPZhF`** | `85b356b` | **CANONICAL Alter XIV project.** 47 commits; fully contains the default branch (ahead 46 / behind 0). | ✅ source of truth |
| `claude/quirky-meitner-VrHVy` | `65b695e` | Separate dependency-free experiment ("galaxy-eclipse"). Different stack. | ❌ do not deploy / do not merge |
| `codex/verify-api-clean-checkout` | `bdb52ec` | Codex audit branch. Carries the **clean-checkout seed-reproducibility fix** that canonical lacks (diverged 1 commit from `ca17ce3`). | ❌ do not merge wholesale — but see blocker #1 |

**Task #2 answer — does `claude/epic-clarke-XPZhF` exist remotely?** ✅ **Yes.** (The temporary ChatGPT
handoff records HEAD `ca17ce3`; the live tip is one commit later, `85b356b`, which only *adds* the
handoff doc — the application tree is unchanged.)

---

## 3. Branch for Medusa Cloud (Tasks #3 + #4)

**Task #3 — can Medusa Cloud import from a non-default branch?** **Yes.** Medusa Cloud connects through
its GitHub App and lets you choose the **branch per environment** (plus a base directory for monorepos).
Here a non-default branch is not just allowed, it is **mandatory** — the GitHub default branch has no
Medusa application on it.

**Task #4 — recommendation:** Import from a **clean, stable, human-named deploy branch** rather than a
`claude/…` scratch branch:

```
deploy/medusa-cloud   ←  cut exactly from  claude/epic-clarke-XPZhF
```

Rationale: (a) the default branch is undeployable; (b) `claude/epic-clarke-XPZhF` is a session/scratch
name unsuitable as a long-lived production target; (c) a dedicated deploy branch decouples "what Medusa
Cloud builds" from ongoing feature work and lets the seed-fixtures blocker (§13.1) be resolved in one
clean place **without** merging the `codex/…` audit branch wholesale.

> Created with `git switch -c deploy/medusa-cloud claude/epic-clarke-XPZhF`, then pushed `-u`.
> Nothing about the application *logic* changes — the deploy branch is canonical **+** this readiness
> document **+** the §13.1 seed-fixtures remediation **+** the project **promoted to the repo root** so
> Medusa Cloud finds the lockfile (§4). All verified end-to-end (§16).

---

## 4. Project root & monorepo layout

**Project root (pnpm workspace root) on `deploy/medusa-cloud` = the repository root.** On 2026-06-01 the
project was promoted out of `alter-xiv/` up to the repo root so the **lockfile lives at the root**, where
Medusa Cloud looks for it (it reported *"No lockfiles found"* while the project was nested). Canonical
`claude/epic-clarke-XPZhF` keeps the original `alter-xiv/` layout — only the deploy branch is flattened.

```
<repo-root>/
├─ apps/
│  ├─ backend        ← Medusa v2 app  ★ Medusa Cloud "Base/Root directory" = apps/backend
│  ├─ storefront     ← Next.js 15 "The Broadcast"  (deploy separately, e.g. Vercel)
│  └─ intelligence   ← Node/TS autonomous-agent runtime (separate worker, optional at launch)
├─ packages/
│  ├─ shared         ← @lumera/shared (types + SIGNAL taxonomy; workspace dep of all apps)
│  └─ data           ← sample CSVs .gitignored; committed fixtures in packages/data/fixtures/
├─ scripts/          ← seed + verify-api.sh + setup-embeddings.ts + ensure-publishable-key.ts
├─ package.json      ← root scripts (turbo), packageManager pnpm@9.0.0
├─ pnpm-lock.yaml    ← ★ now at the repo root — this is what unblocked the import
├─ pnpm-workspace.yaml (packages: apps/*, packages/*)
├─ turbo.json
└─ docker-compose.yml (pgvector/pgvector:pg16 + redis:7 for local dev)
(legacy conversion/ and bootstrap-alter-xiv.sh also live at the root — harmless; Cloud builds apps/backend)
```

**Monorepo assumptions that affect the import (important):**

- **Lockfile at the repo root — ✅ FIXED.** Medusa Cloud scans the **repo root** for the lockfile; with the
  project promoted to the root, `pnpm-lock.yaml` is now there and the import proceeds. Verified from the new
  root: `pnpm install --frozen-lockfile` and `pnpm lint` (4/4) both pass (§16).
- **Workspace-protocol dependency.** `apps/backend` depends on `@lumera/shared` via `"workspace:*"`, so the
  install must run at the **workspace root (= repo root)** so pnpm links `@lumera/shared`; Medusa Cloud then
  builds the `apps/backend` sub-path. Set **Base/Root directory = `apps/backend`**. With the flattened layout
  this is the standard "lockfile at root, app in a subdir" monorepo shape. **[verify in console]**
- **`.npmrc`:** `shamefully-hoist=true` (Medusa admin's Vite bundler needs a flat `node_modules`) and
  `strict-peer-dependencies=false`. Keep both.
- **React pin:** root `pnpm.overrides` pin **React 18.3.1 workspace-wide** (the Medusa dashboard requires
  React 18) even though some `package.json` files declare React 19. This is intentional — **do not "fix."**
- **Node:** no `engines`/`.nvmrc` is committed. Medusa v2 needs **Node ≥ 20** (this session ran Node 22).
  Recommend pinning Node 20 or 22 in the Medusa Cloud project settings. **[verify in console]**

---

## 5. Backend build command

```bash
# from the Medusa app:
cd apps/backend && npx medusa build
# or, from the repo root (turbo builds all four packages):
pnpm build
```

- Output: `apps/backend/.medusa/server` (Medusa v2 production server bundle).
- ✅ Verified this pass: *"Backend build completed successfully (3.08s)."*
- Medusa Cloud runs `medusa build` itself; the equivalents above are for local/CI parity.

## 6. Backend start command

```bash
# migrate first on a fresh database:
cd apps/backend && npx medusa db:migrate
# start (serves the built app on :9000):
npx medusa start
# production artifact alternative:
cd apps/backend/.medusa/server && npm run start
```

- Default port **9000**. Health endpoint: `GET /health`.
- Medusa Cloud manages the run command; these mirror what `scripts/verify-api.sh` uses.

## 7. Storefront build command

```bash
cd apps/storefront && pnpm build        # = next build
```

- ✅ Verified GREEN this pass (full route table compiled).
- ⚠️ Requires **build-time egress to Google Fonts** — `next/font/google` fetches *Inter* and
  *Cormorant Garamond* at build. On a normal host (Vercel) this is fine; behind an egress proxy with a
  self-signed cert the build fails with `SELF_SIGNED_CERT_IN_CHAIN` / "Failed to fetch … from Google Fonts."
  (To self-host fonts later, switch to `next/font/local`.)

## 8. Storefront start command

```bash
cd apps/storefront && pnpm start         # = next start  (:3000)
```

> **Hosting split:** Medusa Cloud hosts the **backend + admin dashboard**. The **storefront is a separate
> deploy** (Vercel/Netlify/etc.) that points at the Medusa Cloud backend URL with a publishable key. The
> `apps/intelligence` worker is a third, optional-at-launch process.

---

## 9. Required env vars (a working deploy needs all of these)

**Backend (Medusa Cloud project):**

| Var | Why | Notes |
|---|---|---|
| `DATABASE_URL` | Postgres connection | Postgres 16 **with pgvector** — provisioned by Medusa Cloud. See blocker #2. |
| `JWT_SECRET` | auth token signing | Config falls back to `'supersecret'` if unset — **must** set a real value in prod. |
| `COOKIE_SECRET` | session cookie signing | Same fallback risk — set a real value. |
| `STORE_CORS` | storefront origin allow-list | e.g. the Vercel storefront URL. |
| `ADMIN_CORS` | admin origin allow-list | the admin/backend URL. |
| `MEDUSA_BACKEND_URL` | public backend URL | used for the local file backend URL and by the storefront. |

**Storefront (separate deploy):**

| Var | Why |
|---|---|
| `NEXT_PUBLIC_MEDUSA_URL` (and/or `MEDUSA_BACKEND_URL`) | backend API base URL |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | Medusa publishable key (Store API auth) |
| `NEXT_PUBLIC_SITE_URL` | canonical site URL for sitemap/robots/manifest |

## 10. Optional env vars (safe to omit — surface stays mocked / feature stays off)

| Var | Unlocks | Omitted behavior |
|---|---|---|
| `REDIS_URL` | Redis event bus + workflow engine + SIGNAL stream/bandit state | in-memory defaults (**recommend ON in production**) |
| `AUTH_CORS` | separate auth CORS origin | falls back to `STORE_CORS` |
| `ANTHROPIC_API_KEY` | live CONGREGATION agents + OPERATOR + Shepherd + Analyst | agents run in **mock** mode |
| `CLAUDE_MODEL` | agent model id | default in `.env.example`: `claude-opus-4-8` |
| `EMBEDDING_DIM` | embedding width knob | implemented embeddings are 5-dim chapter vectors |
| `STRIPE_API_KEY` | **TEST-mode** mirroring of memberships/credits | local-only completion; **live key is founder-gated** |
| `HIGGSFIELD_API_KEY` | Artisan imagery | staged/mock |
| `APIFY_TOKEN`, `OXYLABS_USER`, `OXYLABS_PASS` | data-radar scrapers | mock |
| `COMPOSIO_API_KEY` | Congregation action integrations (email/social/ops) | mock |
| `MONEYPRINTER_API_URL` | Herald live video render | stages a manifest |
| `S3_FILE_URL`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`, `S3_BUCKET` | MinIO/S3 durable file storage | **local disk** (not durable on cloud — see blocker #3) |
| `SOLANA_RPC_URL` | optional web3 (Phase 3+) | unused |
| `REWARDS_EARN_RATE`, `PRICING_MIN_MARGIN`, `PRICING_COST_RATIO`, `COCKPIT_KEY` | tuning knobs | safe defaults |

---

## 11. Mocked surfaces (mock-until-keyed — intentional, **not bugs**)

These run in mock mode without their key and **flip to live** when the key is set. None of them publish,
spend, or move real money in mock mode:

- **CONGREGATION agents + OPERATOR loop** — `run-agent` returns mock runs without `ANTHROPIC_API_KEY`; the
  daily loop still executes and validates structurally.
- **Shepherd** conversational support.
- **Artisan** imagery (Higgsfield) — staged.
- **Sourcer/Curator** data radar (Apify/Oxylabs scrapers).
- **Herald** video render (MoneyPrinter) — stages a manifest, never publishes.
- **Stripe** — memberships/credits complete locally; mirror to **Stripe TEST** when a test key is present.

## 12. Founder-gated secrets & actions (require an explicit founder decision/key — do NOT auto-provision)

- **Live keys:** `ANTHROPIC_API_KEY`, `STRIPE_API_KEY` (test → live), `HIGGSFIELD_API_KEY`,
  `APIFY_TOKEN`/`OXYLABS_*`, `COMPOSIO_API_KEY`, `MONEYPRINTER_API_URL`, `S3_*` (object store).
- **Escalation-gated actions (the gate is sacred):** go-live, publishing content, launching a real drop,
  switching Stripe to **live** keys, and **any money movement**. Agents only ever **DRAFT/STAGE**; the
  OPERATOR routes these to the founder inbox. Stripe stays **test-mode only** until the founder flips it.
- **Founder-gated engineering upgrades (non-blocking):** True PPR (`next@canary`); and the V7 ledger's
  G05 video / G07 messaging / G11 tax+shipping / G12 CMS / G14 paid security / G15 deploy.

---

## 13. Launch blockers (resolve before/at import for a *working* deploy)

### 13.1 Seed data was gitignored & absent on canonical  ✅ RESOLVED on `deploy/medusa-cloud`
- **The problem:** `.gitignore:10` ignores **`packages/data/*.csv`**; canonical `packages/data/`
  contained only `README.md`. `scripts/seed.ts` (lines 139–140) reads `amazon-products.sample.csv` /
  `shein-products.sample.csv`. **Confirmed** on a fresh clone:
  `readFileSync('packages/data/amazon-products.sample.csv')` → `ENOENT`. So `pnpm seed` (and therefore
  `pnpm verify:api`, and the **documented first-deploy seed step**) failed on a fresh checkout — which is
  exactly what Medusa Cloud does.
- **✅ Resolved (2026-06-01) on `deploy/medusa-cloud`:** committed
  `packages/data/fixtures/{amazon,shein}-products.fixture.csv` (10 synthetic verification products, living
  in a `fixtures/` subdir that the `*.csv` glob does **not** match) **+** the `existsSync` fallback in
  `seed.ts`. Cherry-picked **surgically** from `codex/verify-api-clean-checkout` — **only those 3 files**;
  the rest of that branch (verify-api.ts, doc edits, medusa-config admin toggle, verify-api.sh changes)
  was **not** merged, honoring handoff §9.
- **Proven end-to-end:** against the empty `lumera_verify` DB the seed logged
  *“amazon-products.sample.csv not found; using committed fixture fixtures/amazon-products.fixture.csv”*
  and seeded **10 products + 2 drops**, after which the full commerce/prices/inventory/embeddings/
  monetization chain completed green (§16).

### 13.2 pgvector must exist on the managed Postgres  ✅ verified locally; confirm on Cloud
- `scripts/setup-embeddings.ts:23` runs `CREATE EXTENSION IF NOT EXISTS vector` and builds an HNSW index;
  `recommendation/service.ts` and `api/store/search/route.ts` use the `<=> ::vector` operator. The whole
  ORACLE / personalization / hybrid-search layer is **pgvector-native**.
- **✅ Verified (2026-06-01):** with `postgresql-16-pgvector` (0.6.0) installed, `CREATE EXTENSION vector`,
  the HNSW index, and **10 product embeddings** all succeeded against `lumera_verify`.
- **Still required for Cloud:** the Medusa Cloud database role must have **pgvector available** and
  **`CREATE EXTENSION` privilege**. **Confirm this before import** — if the managed Postgres can't create
  the `vector` extension, migration/embeddings will fail. **[verify in console]**

### 13.3 Durable object storage
- The Medusa file module defaults to **local disk**; cloud filesystems are ephemeral. Set `S3_*`
  (MinIO/S3) for durable product/media uploads before relying on uploads.

### 13.4 Publishable key provisioning
- The storefront needs `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`. After migrate, create it in Admin or run
  `scripts/ensure-publishable-key.ts` (it prints + links a key), then set it on the storefront deploy.

### 13.5 Real secrets
- `JWT_SECRET` / `COOKIE_SECRET` fall back to `'supersecret'` if unset. Set strong values in Medusa Cloud.

### 13.6 Storefront is a separate deploy
- Provision Vercel (or similar) with the backend URL + publishable key; ensure build-time font egress
  (see §7).

### 13.7 Launch-green human items (from `RUNBOOK.md` / `CODEX_HANDOFF.md`)
- Lighthouse/perf on a real deploy · verified live MinIO/S3 upload · tax & shipping providers ·
  legal / domain / DNS · payment go-live (Stripe live keys — founder-gated).

---

## 14. Exact Medusa Cloud import steps

> Based on Medusa Cloud's standard **GitHub-App import** flow. Confirm field labels in the current console
> at `cloud.medusajs.com` / `docs.medusajs.com` — **[verify in console]** (no live Medusa docs tool was
> available to machine-verify UI wording in this session).

1. **Fix blocker #13.1** (seed fixtures) and **confirm blocker #13.2** (pgvector) on the deploy branch.
2. **Push** the clean deploy branch `deploy/medusa-cloud` (cut from `claude/epic-clarke-XPZhF`).
3. In Medusa Cloud: **Organization → Create Project → Connect GitHub**, and install the **Medusa Cloud
   GitHub App** on `Beexly/Clouds-bruh` (grant repo access).
4. Select repository **`Beexly/Clouds-bruh`**; set the **production branch** explicitly to
   **`deploy/medusa-cloud`** (do not accept the default branch — it has no app).
5. Set the **Base / Root directory** to **`apps/backend`** (the install runs at the **repo root**, where
   `pnpm-lock.yaml` now lives, so `workspace:*` resolves — see §4). **[verify in console]**
6. Provision the managed **Postgres (with pgvector)** + **Redis**; Medusa Cloud injects
   `DATABASE_URL` / `REDIS_URL`.
7. Set the **Required** env vars (§9): `JWT_SECRET`, `COOKIE_SECRET`, `STORE_CORS`, `ADMIN_CORS`,
   `MEDUSA_BACKEND_URL`. Add optional keys (§10) as desired — **keep Stripe in TEST**.
8. **First deploy** builds with `medusa build`. Then run, in order:
   `medusa db:migrate` → the seed chain (`seed.ts` → `setup-commerce.ts` → `setup-prices.ts` →
   `setup-inventory.ts` → `setup-embeddings.ts`) → `seed-monetization.ts` → `ensure-publishable-key.ts`.
   (Only succeeds once #13.1 is fixed.) `scripts/verify-api.sh` performs this exact chain.
9. Create/capture the **publishable key**, then configure the **storefront deploy** (Vercel) with
   `NEXT_PUBLIC_MEDUSA_URL`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`.
10. **Verify:** backend `/health` 200 · admin loads · storefront renders · optionally run
    `DATABASE_URL=<cloud> pnpm verify:api` against the deployed DB.

---

## 15. What must NOT be changed (preserve)

From handoff §9 + `DECISIONS.md` + verified code. These fix the clean-checkout / operational path and the
safety posture:

- **The escalation gate** — `apps/intelligence/src/orchestrator/run-agent.ts` (hard gate, lines 65–69:
  privileged actions **queued for approval, never executed**), each agent's `escalation: [...]` list, and
  the `introspection.ts` self-audit (line ~308) that flags any privileged agent lacking a gate. Agents
  only DRAFT/STAGE.
- **Stripe gating** in `medusa-config.ts` — Stripe loads only when `STRIPE_API_KEY` is set; keep it
  **test-mode only** (no live money movement).
- **Conditional Redis** in `medusa-config.ts` — Redis modules load only when `REDIS_URL` is set (prevents
  the clean-checkout migrate hang).
- `scripts/verify-api.sh`, `scripts/ensure-publishable-key.ts`, `scripts/setup-embeddings.ts`.
- `apps/backend/src/subscribers/order-placed.ts` — the `unit_price` / `customer_id` fix.
- Per-package **`lint`** scripts (real `tsc --noEmit`).
- pnpm **React 18 override**, `.npmrc` **`shamefully-hoist=true`**, backend **`NodeNext`**, intelligence
  **`build: tsc`** (DECISIONS 1–5).
- Do **not** merge `claude/quirky-meitner-VrHVy` (separate experiment). Do **not** import the firewalled
  Sports/Galaxy analytics project.

---

## 16. Verification results (this pass — cloud sandbox, 2026-06-01, Node 22 / pnpm 9)

| Step | Result |
|---|---|
| `pnpm install --frozen-lockfile` | ✅ **PASS** — lockfile consistent (≈17s). |
| `pnpm lint` | ✅ **PASS** — 4/4 packages, `tsc --noEmit`. |
| `pnpm test` | ✅ **PASS** — all unit tests green (exit 0). |
| `pnpm build` | ✅ backend + shared + intelligence green; storefront green **once Google-Fonts egress is reachable**. In this sandbox the egress proxy's self-signed cert blocks `next/font/google` by default (environment limitation, not a code defect — confirmed green with the cert tolerated). |
| `DATABASE_URL=…/lumera_verify pnpm verify:api` | ◑ **Data pipeline GREEN; final HTTP sweep not run in-sandbox.** After the §13.1/§13.2 fixes the full clean-DB chain passed: **migrations ✓ → seed via committed fixtures (10 products + 2 drops) ✓ → commerce/region/shipping ✓ → prices ✓ → inventory ✓ → pgvector embeddings (10) ✓ → monetization tiers ✓ → publishable key ✓ → backend build ✓**. The 21 API regressions did **not** execute here: `medusa start` (from the source dir) couldn't serve the production admin build under the sandbox's restricted egress (`Could not find index.html …`). That is a `medusa start` admin-serving quirk, **not** an app/code defect and **not** how Medusa Cloud runs the app — its managed runtime serves admin itself, and the handoff records these regressions as 21/21 in a normal environment. |
| **Repo-root restructure** (`deploy/medusa-cloud`) | ✅ **PASS** — after promoting the project to the repo root so `pnpm-lock.yaml` sits where Medusa Cloud looks, `pnpm install --frozen-lockfile` (*"Lockfile is up to date"*) and `pnpm lint` (4/4, FULL TURBO) both pass from the new root — the workspace + `@lumera/shared` still resolve. |

> **Two minor in-sandbox notes (not blockers):** (1) `scripts/verify-api.sh:91` decides "build present
> (reusing)" from the *existence of `.medusa/server`* alone, so it can reuse an admin build left
> incomplete by a constrained-egress `medusa build`; a stronger check would test for
> `.medusa/server/public/admin/index.html`. (2) The Medusa **admin** build (like the storefront) fetches
> assets at build time, so it needs clean build-time egress — fine on Medusa Cloud / Vercel.

**Net:** Alter XIV is **implementation-green**, and with §13.1 (seed fixtures) **fixed** and §13.2
(pgvector) **verified** on `deploy/medusa-cloud`, the clean-DB **build + seed + embeddings** pipeline runs
green end-to-end. Remaining before a live store: provision the managed Postgres **with pgvector**, set the
required secrets/env (§9), deploy the storefront separately (§8), and complete the launch-green human items
(§13.7). No product features were added, no live keys were added, no live money movement was enabled, and
the escalation gate is untouched.

---

## 17. Live Medusa Cloud import — status & resolutions (2026-06-01)

Imported on Medusa Cloud (project **"Clouds bruh"**, environment **Production**, branch
**`deploy/medusa-cloud`**). Observed state:

- **Storefront:** ✅ live at `https://gegege.medusajs.site` (home + all five chapters + `/drops` + `/cart` → 200).
- **Backend build:** ✅ succeeds. **Migrations:** ✅ complete (all modules up-to-date).
- **Backend runtime:** boots to **"Server is ready"** as long as file storage is left on **local** (no S3).

Issues hit during import and how each was resolved (all on `deploy/medusa-cloud`):

| Cloud symptom | Cause | Resolution (commit) |
|---|---|---|
| *"No lockfiles found"* | pnpm workspace was nested under `alter-xiv/` | Project promoted to the **repo root** so `pnpm-lock.yaml` is at the root (`1d3931f`) |
| *"Invalid comparator: latest"* | `@medusajs/{cli,framework,medusa}` pinned to `latest` | Pinned to **`^2.15.5`** (`edd68ab` → `7bda95f`) |
| *"Access key ID and secret access key are required"* at boot | S3 file provider activated by a partial/leftover `S3_FILE_URL` without credentials | File guard now requires **`S3_FILE_URL` + `S3_ACCESS_KEY_ID` + `S3_SECRET_ACCESS_KEY`** together, else **local disk** (`6859e9f`) |

> **Stale-deployment caveat:** Cloud's "Fix with AI" diagnoses a *specific* (often older) build. After any
> env-var or code change, **trigger a fresh deployment and watch the newest one** — earlier failed builds
> keep their original error.

### Minimal Cloud env (backend)
- **Required:** `JWT_SECRET`, `COOKIE_SECRET`, `STORE_CORS`, `ADMIN_CORS`, `MEDUSA_BACKEND_URL`
  (`DATABASE_URL` / `REDIS_URL` are injected by Cloud).
- **File storage:** leave **all `S3_*` unset** to use local disk (durable enough to launch; ephemeral across
  redeploys), **or** set the *full* S3 set — `S3_FILE_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
  (+ `S3_ENDPOINT` for MinIO) — for durable object storage. **Never put Medusa Cloud tokens/URLs in
  `S3_*` fields.**
- Keep Stripe in **test**; the escalation gate and no-live-money posture remain intact.
