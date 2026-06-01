# LUMERA — HANDOFF / OPEN ITEMS (live punch-list)

> What's needed next and **who/what unblocks each**. Vision + priorities: `docs/NORTH_STAR.md`.
> Founder-only inputs: `CODEX_HANDOFF.md`. Updated 2026-06-01.
> **Lane:** build on **Lane A** (`deploy/medusa-cloud` → `claude/*`). Lane B (`epic-clarke` /
> `codex/*`, `alter-xiv/`-nested) is recommended-frozen — founder to confirm, then port `verify-api.ts`.

## ✅ Done this session (Lane A — on PR #5 → `deploy/medusa-cloud`)
- **OG deploy fix** — replaced dynamic `next/og` `ImageResponse` with a static `apps/storefront/public/og.png`
  (Medusa Cloud / OpenNext couldn't bundle `@vercel/og`). **Validated: Medusa preview ✅ Ready / ✅ Ready.**
- **Bandit reconnect** — Learning Loop now writes the same Redis **hash** the ranker reads (was a
  string → `WRONGTYPE`, silently dropped) + Beta(1,1) prior seeding + legacy-key migration (Codex
  review). Ranker `reward()` hardened to match.
- **CI build-order** — `turbo.json` `lint` now `dependsOn: ["^build"]`; `verify-api.sh` builds
  `@alterxiv/shared` before `medusa db:migrate` (it resolves only to `dist/`).
- **Brand attribution** (Galaxy parent / "owned and operated by Galaxy Network") + **`NORTH_STAR.md`**.

## 🔴 BLOCKED — needs you / a verify-env / the logs

### 1. GitHub Actions CI on PR #5 — ✅ FIXED (both jobs; verified 23/23 locally)
Two pre-existing bugs, both fixed (neither was in the original diff):
1. **`pnpm/action-setup@v4`** errored on the dual `version:` + `packageManager` spec → *both* jobs died
   at setup. Removed the redundant `version: 9` → **green-gates green** (lint/test/build).
2. **`verify:api`** then ran and 5 regressions 401'd: `/store/analyst` (×4) + `/store/cockpit` fail
   **closed in production** (`medusa start` runs prod) and the regression presented no key. Fixed:
   `verify-api.sh` sets `COCKPIT_KEY` (inherited by the booted server *and* the regression child), and
   `api-regression.ts` sends it via `x-cockpit-key`.
   - Also: `turbo.json` `lint → dependsOn ^build`; `verify-api.sh` builds `@alterxiv/shared` before
     `migrate` (it resolves only to `dist`).
- **Verified locally 23/23** against system Postgres 16 + pgvector + Redis: infra → migrate → seed →
  boot → 23 regressions, `verify:api PASSED` (EXIT 0). Pushed; the CI re-run should be green on both.
- Local repro (gotchas learned): `sudo service postgresql start` + `redis-server --daemonize yes`;
  create role `alterxiv/alterxiv` + db `alterxiv_verify`; then
  `DATABASE_URL=…/alterxiv_verify MEDUSA_ADMIN_DISABLED=true pnpm verify:api`. Do **not** prefix
  `pkill -f medusa` (it matches its own shell → self-kill), and the harness blocks foreground `sleep`.

### 2. P0 — money routes are unauthenticated (pre-launch blocker)
- `/store/monetization/{subscribe,credits,wallet,gift-cards,entitlements}` take `customer_id` from the
  body/query with **no auth** → anyone with the public publishable key can grant memberships, mint
  Lumens, or read any customer's wallet (`apps/backend/src/api/store/monetization/*`).
- **Fix (designed, needs a verify-env):** add `apps/backend/src/api/store/middlewares.ts` →
  `authenticate('customer', ['session','bearer'])` on `/store/monetization/*`; derive `customer_id`
  from `req.auth_context.actor_id`, never the body.
- **Why not shipped here:** it breaks the API regression (`scripts/api-regression.ts:141-151` calls
  these with a fake string id + no auth) → that check must be rewritten to register/login a real
  customer and validated with `verify:api` (no Docker in this sandbox).
- **HANDOFF → Codex:** implement the middleware + rewrite the monetization regression to authenticate,
  then run `verify:api` to green.

### 3. P0 — zero-payment grants (founder + code)
- `subscribe` / `purchaseCredits` / `issueGiftCard` grant entitlements/credits with **no real charge**
  (`monetization/service.ts:43,84` — writes a fake `sub_test_…` id even when keyed). Must gate behind
  real Stripe before launch. **Founder:** Stripe go-live is the escalation gate.

## 🟡 NEXT (Lane A — safe once there's a verify path)

### 4. P1 — make the intelligence genuinely semantic
- `product_embedding` is `vector(5)` (a chapter one-hot), not real embeddings; `scripts/setup-embeddings.ts`
  and `learning/loop.ts → refreshProductEmbedding` (currently a no-op) need a real embedding model.
  **Founder:** an embedding API key (Voyage/OpenAI). Then ORACLE recs become genuinely semantic with
  **no query-layer change** (the `<=> ::vector` seam already exists).
- **Attribution loop:** the storefront never calls `/store/recommendations/attribute`, so per-rec
  click/convert is never recorded. Return a `rec_id` from `/store/broadcast` + `/store/recommendations`
  and POST it back on `recommendation_click` + `purchase`. Behavioral — verify on a running env.
  **HANDOFF → Codex.**

### 5. P2 — breathtaking craft (needs your eye on the preview)
- **next/image** migration (raw `<img>` at `ProductRail.tsx:89`, `p/[handle]/page.tsx:143`;
  `next.config.ts remotePatterns` already wildcard). Big LCP/CLS win — but watch OpenNext image
  handling (it just bit us via `@vercel/og`); verify images load on the preview.
- **Signature motion** — the corona reveal + totality countdown (specced in BRAND §6, **unbuilt**) on
  the Hero + live DropBoard. This is the "first-of-its-kind" screenshot. Build + eyeball on the preview.
- **Typography** — the build ships Cormorant Garamond serif in ~27 places vs the spec'd grotesque
  (BRAND §5). Founder taste call: relax the spec or replace the type.
- **Lighthouse / perf** pass on a hosted deploy (`cache:'no-store'` everywhere + home N+1 fan-out).

## 🧹 Safe cleanups (verified low-risk; flagged, not done — they're not my files)
- Orphaned/unused (per audit): `apps/storefront/src/components/Reveal.tsx`,
  `…/components/ProductCard.tsx` (uses the **stale** `@alterxiv/shared` Product shape — type-drift trap),
  `…/lib/recommendations.ts` (duplicates `lib/api.ts`). Safe to delete; grep shows zero importers.

## 🧭 Decisions waiting on founder
- Confirm **Lane A canonical** + freeze Lane B (then port `verify-api.ts`).
- Stripe test→live · embedding / `ANTHROPIC_API_KEY` keys · external benchmarking for the "best of 2026" bar.
- Reminder: `PROGRESS.md` overstates a few ✅ (Learning Loop / "80 products") vs the code — trust the
  audit in `NORTH_STAR.md §1`, not the self-report.
