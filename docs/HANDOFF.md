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

### 1. GitHub Actions CI on PR #5 is red — but the Medusa Cloud deploy itself is ✅
- My diff is **verified clean locally**: `pnpm install --frozen-lockfile` ✅, `pnpm lint` ✅,
  `pnpm test` ✅ (56), `medusa build` ✅; Medusa Cloud builds backend + storefront ✅✅. So the red is
  Actions-env / pre-existing, **not the diff**.
- I can't pinpoint it from here: **no Actions-log tool in this environment, and no Docker** to run
  `verify:api` (needs Postgres + pgvector + Redis). `verify:api` ran *further* after the shared-build
  fix (19s→24s) then failed deeper (migrate/seed/boot).
- **NEEDED (you or Codex):** paste the failing Actions logs (green-gates + verify:api) **or** confirm
  whether `deploy/medusa-cloud` CI is also red (→ pre-existing) **or** run `verify:api` where Docker exists.
- Note: Medusa Cloud deploys independently of Actions and is green — PR #5's deploy fix is functionally
  ready regardless of the Actions gate.

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
