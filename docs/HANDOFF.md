# LUMERA — HANDOFF / OPEN ITEMS (live punch-list)

> What's needed next and **who/what unblocks each**. Vision + priorities: `docs/NORTH_STAR.md`.
> Founder-only inputs: `CODEX_HANDOFF.md`. Updated 2026-06-01.
> **Lane:** build on **Lane A** (`deploy/medusa-cloud` → `claude/*`). Lane B (`epic-clarke` /
> `codex/*`, `alter-xiv/`-nested) is recommended-frozen — founder to confirm, then port `verify-api.ts`.

## ✅ Done — experience transformation (this session, PR #5 → `claude/amazing-edison-Cm7q6`)
The *"painfully boring / not first-of-its-kind / 'ecosystem' still stuck"* feedback, answered. Each
commit build-verified (tsc · 7/7 vitest · `next build` 16/16); the rebrand + new components confirmed
live in the **deployed SSR HTML** (HTTP 200; literal "ecosystem" → **0**; Penumbra/Eclipse/Flare/Vesper/
Meridian + "Your Light" + the Eclipse `<canvas>` all present).
- **Full chapter rebrand** → luminous "states of light" lexicon (Stillness→Penumbra, Armor→Eclipse,
  Signal→Flare, Altar→Vesper, Relentless→Meridian). Slugs unchanged (load-bearing); one source of truth
  `lib/chapters.ts` → propagates to nav/footer/palette/rails/chapter pages. **Kills the old vocabulary.**
- **Corona Reveal hero** — signature motion (arc draws the corona ring, first-light ignites, wordmark
  rises, slow violet orbit); reduced-motion safe. (BRAND §6 — was specced-but-unbuilt.)
- **Live DropBoard** — cinematic departure board (pulsing "N live now", scarcity bars fill on view).
- **Cinematic ProductRail + legible rails** — each personalized rail states *why* it surfaced
  ("Tuned to your taste", "Often kept together"…): silent personalization → **visible intelligence**
  (honest strategy-level reasons, no fabricated per-item claims).
- **"Your Light"** — taste as a tunable constellation (follow ignites a star + boosts it everywhere,
  mute dims it); writes `/store/preferences`, refreshes the Broadcast. Personalization made *steerable*.
- **The Eclipse** — a living, site-wide ambient field (breathing corona + violet penumbra + parallax
  starfield, pointer/scroll-reactive) painted as additive light. ~30fps, pauses when hidden, single
  still frame under reduced-motion, DPR-capped, **zero deps**. The brand thesis made ambient.
- **First-light cursor** — pointer casts a screen-blended glow + focus ring that reacts to interactive
  elements; augments (never hides) the native cursor; desktop/fine-pointer only, no-ops on touch/reduced-motion.
- **⚠️ Verification ceiling (honest):** this container has **no browser** (Playwright CDN is
  allowlist-blocked) and the live preview **403s WebFetch** — so **pixel-level QA needs the founder's
  eye on the preview.** Everything is compile/SSR/content-verified; the *aesthetic* is not yet eyeballed.

## ✅ Done — CI / security hardening (prior session, PR #5)
- **OG deploy fix** — replaced dynamic `next/og` `ImageResponse` with a static `apps/storefront/public/og.png`
  (Medusa Cloud / OpenNext couldn't bundle `@vercel/og`). **Validated: Medusa preview ✅ Ready / ✅ Ready.**
- **Bandit reconnect** — Learning Loop now writes the same Redis **hash** the ranker reads (was a
  string → `WRONGTYPE`, silently dropped) + Beta(1,1) prior seeding + legacy-key migration (Codex
  review). Ranker `reward()` hardened to match.
- **CI build-order** — `turbo.json` `lint` now `dependsOn: ["^build"]`; `verify-api.sh` builds
  `@alterxiv/shared` before `medusa db:migrate` (it resolves only to `dist/`).
- **Brand attribution** (Galaxy parent / "owned and operated by Galaxy Network") + **`NORTH_STAR.md`**.
- **CI fully fixed (PR #5)** — pre-existing `pnpm/action-setup` version conflict + the analyst/cockpit
  production-gate; both jobs now pass. **Verified locally `verify:api` 24/24 (EXIT 0).**
- **P0 — money routes LOCKED** — `/store/monetization/{subscribe,credits,wallet,gift-cards,entitlements}`
  now require an authenticated customer (`api/store/middlewares.ts`); `customer_id` derives from the
  session, never the body. Regression authenticates a real customer + asserts unauth → 401. Verified 24/24.

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

### 2. P0 — money routes locked ✅ DONE (verified 24/24)
Shipped `apps/backend/src/api/store/middlewares.ts` → `authenticate('customer', ['session','bearer'])`
on subscribe/credits/wallet/gift-cards/entitlements; handlers derive `customer_id` from
`req.auth_context.actor_id` (`/tiers` stays public). `api-regression.ts` now registers+logs in a real
customer for the authed round-trip and asserts unauth → 401. Verified locally: `verify:api` 24/24 (EXIT 0).

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

### 5. P2 — breathtaking craft
- ✅ **next/image** migration — done (rails, PDP, cart, command-palette thumbnails; `remotePatterns` wildcard).
- ✅ **Signature motion** — Corona Reveal hero + live DropBoard shipped (see top block).
- 🟡 **Founder's eye on the preview** — the one thing I cannot do here (no browser / preview 403s).
  Please eyeball on the Storefront preview link in the PR: (a) the Eclipse field — too bright / too dim /
  just-right; (b) the first-light cursor feel on desktop; (c) the Corona Reveal timing; (d) "Your Light"
  on mobile (the 5 stars are absolutely-positioned in a 176px-tall field — confirm no overlap at 360px).
- **Typography** — ships Cormorant Garamond serif in ~27 places vs the spec'd grotesque (BRAND §5).
  Founder taste call: relax the spec or replace the type.
- **Lighthouse / perf** pass on a hosted deploy (`cache:'no-store'` everywhere + home N+1 fan-out).

### 6. R&D — next frontier toward "best of 2026" (candidates, ranked)
- **View Transitions API** between routes (shared-element product→PDP morph) — replaces the plain fade
  in `PageTransition.tsx`; Next App Router experimental flag. Makes navigation feel like one film.
- **Editorial / bento homepage** — break the uniform-rail rhythm with one large "feature" piece +
  satellites (magazine, not catalog). Highest-impact *structural* move; needs founder eye.
- **Attribution loop closed** (see §4) — unlocks the bandit actually learning from clicks/convstns.
- **Real embeddings** (see §4) — the recs become genuinely semantic. **Founder: embedding key.**

## 🧹 Safe cleanups (verified low-risk; flagged, not done — they're not my files)
- Orphaned/unused (per audit): `apps/storefront/src/components/Reveal.tsx`,
  `…/components/ProductCard.tsx` (uses the **stale** `@alterxiv/shared` Product shape — type-drift trap),
  `…/lib/recommendations.ts` (duplicates `lib/api.ts`). Safe to delete; grep shows zero importers.

## 🧭 Decisions waiting on founder
- Confirm **Lane A canonical** + freeze Lane B (then port `verify-api.ts`).
- Stripe test→live · embedding / `ANTHROPIC_API_KEY` keys · external benchmarking for the "best of 2026" bar.
- Reminder: `PROGRESS.md` overstates a few ✅ (Learning Loop / "80 products") vs the code — trust the
  audit in `NORTH_STAR.md §1`, not the self-report.
