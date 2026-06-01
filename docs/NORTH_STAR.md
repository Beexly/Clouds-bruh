# LUMERA — NORTH STAR (Vision v2)

> ⚠️ **STATUS: DRAFT — prior audit reconciled; pending a lineage decision (2026-06-01).** The
> founder's prior `AUDIT_HEAD` (Lane B, `epic-clarke@ca17ce3`) is now reconciled (§0.5): it's
> **complementary, not contradictory** — these findings stand. **Blocking promotion to canonical:**
> (1) the founder must choose the canonical branch lineage (§4 — two structurally-incompatible trees
> exist); (2) optional external benchmarking. Do not supersede `ARCHITECTURE.md` until these resolve.

> The path from *"deployed intelligent-commerce platform"* to **the best website of 2026** —
> innovative, cutting-edge, breathtaking, first-of-its-kind. Grounded in a three-front code audit
> (2026-06-01), **not optimism.** Companion to `docs/ARCHITECTURE.md` (the system design) and
> `LAUNCH_READINESS.md` (the live-config tracker). This is the v2 source of truth: every agent
> — Claude, Codex, the Constellation — builds toward *this*.

## 0. The thesis
Your moat is already **designed** — it just isn't switched on, made true, or made visible. Most
"best of year" sites are beautiful and dumb; Lumera was architected to be intelligent and
self-improving (`SIGNAL → MIND → ORACLE → Constellation → Learning Loop`). The audit's verdict:
the **scaffolding is genuinely production-grade**, but the **two marquee differentiators are
theater**, the **money layer is unsafe**, and the **experience is "very good editorial e-commerce,"
not yet breathtaking.** So "best of 2026" is not *invent more* — it's **make it safe, make it true,
make it felt, and execute craft to obsession.**

## 0.5 Reconciliation with the prior audit (`AUDIT_HEAD`, 2026-05-31)
The founder's prior audit ran on a **different lineage** (`claude/epic-clarke-XPZhF@ca17ce3` →
`codex/verify-api-clean-checkout`) and is **complementary, not contradictory**:
- It is a **build / operational-green** audit (install · build · 52 tests · lint · diff pass;
  migration-hang fixed; `verify:api` was blocked only by missing seed CSVs → since fixed with
  committed fixtures + a `*.sample.csv`→fixture fallback). It did **not** examine security, payments,
  embedding-reality, or design.
- My three-front audit is a **depth** audit at exactly those layers. They reinforce each other:
  "52 tests pass / green" coexists with the critical money holes (§1) **precisely because** the tests
  don't cover them (the "test honesty gap"). **Nothing here overturns §1 — the findings stand.**
- It **adds** a prior roadmap, folded into the priorities below: **G06** ReviewProof + verified-purchase
  gate · **G08** ExperimentPlan schema · **G09** wishlist persistence · **G10** OTel trace/event
  taxonomy · **G13** Playwright/k6 gates · **G16** Radix/Zag interaction contract.

## 1. Honest scorecard — three independent audits (2026-06-01)
| Layer | Verdict | The truth |
|---|---|---|
| **Commerce / launch** | 🔴 Unsafe to go public | Real end-to-end order path (CI-proven), but unauthenticated money endpoints + fake Stripe = a free vending machine. |
| **Intelligence** | 🟠 ~60% real / 40% theater | Gate, MIND, pgvector, INTROSPECTION, Ledger real & strong; semantic embeddings + learning bandit are fake/broken; agent tools mostly stubs. |
| **Storefront / design** | 🟡 "Very good," not "first-of-its-kind" | SIGNAL / checkout / search / Tune real & tasteful; signature motion unbuilt; perf unmeasured; personalization non-semantic. |

**Three independent auditors converged on the same three core truths (high-confidence):**
1. **Recs aren't semantic.** `product_embedding` is `vector(5)` — a chapter one-hot — not the
   claimed `vector(1536)`; **no embedding model is called anywhere** (`scripts/setup-embeddings.ts:28`).
   Intra-chapter order collapses to `random()`.
2. **The "self-improving" loop is open.** The storefront never calls `/store/recommendations/attribute`,
   and a Redis hash-vs-string type bug disconnects rewards (`learning/loop.ts:74` vs
   `recommendation/service.ts:207`). The bandit's α/β stay at the `1/1` prior forever.
3. **Nothing actually charges.** Checkout is `pp_system_default` with no Stripe Elements; the
   membership "Stripe mirror" writes fake IDs (`monetization/service.ts:43`). Going live collects **$0**.

## 2. Priorities — ranked

### P0 — Make the money layer safe · *launch-gate; before any public/live step*
- **Lock the money/identity routes.** Add `apps/backend/src/api/store/middlewares.ts`: require an
  authenticated customer; derive `customer_id` from the **session, never the request body**. Today
  anyone with the *public* key can grant memberships (`subscribe/route.ts:5`), mint Lumens with zero
  payment (`monetization/service.ts:84`), issue gift cards, and enumerate any customer's wallet.
- **Stop the silent free grant.** `subscribe()` / `purchaseCredits()` must not grant entitlements
  without a real charge (`monetization/service.ts:43,84`).
- **Harden ops surfaces.** Make `COCKPIT_KEY` a hard launch blocker; stop gating on exact
  `NODE_ENV==='production'` (`cockpit/route.ts:38`, `analyst/route.ts:18`). Refuse to boot on the
  default `'supersecret'` JWT/cookie in prod (`medusa-config.ts:30`).
- **Make purchasable-state a hard prereq.** `bootstrap.ts` must fail loudly if any variant lacks a
  price/inventory; add those to `preflight.ts` blockers (today the pipeline passes "green" while
  products can't be bought).
> **Why first:** the store was nearly pushed live earlier this session. These are catastrophic the
> instant it's public, and cheap relative to the loss.

### P1 — Make the intelligence true · *highest credibility-per-effort; the differentiator*
Four surgical fixes flip the bulk of the "theater" to real — the hard scaffolding is already correct:
- **Real embeddings.** Call an embedding model over title+description+attributes; widen
  `product_embedding` + `visitor_profile.embedding` to the real dimension; backfill in
  `setup-embeddings.ts`. → ORACLE becomes genuinely semantic with **zero query-layer changes**.
- **Close the bandit loop.** Fire `/store/recommendations/attribute` on `recommendation_click` +
  `purchase` (`block` is already in context at `ProductRail.tsx:84`); fix the Redis type mismatch.
  → the Broadcast *visibly* learns what converts.
- **Give agents real hands.** Implement `medusa_admin_read` (one `TODO`, `tools/medusa-admin.ts:8`)
  so Curator / Shepherd / Analyst see the live catalog instead of `MOCK001`.
- **Make `refreshProductEmbedding` actually mutate vectors** — or delete the claim (`learning/loop.ts:191`).
> **Guard:** do **not** enable agent crons or `brand_audit`-gated publishing until tools are real —
> keyed-but-stubbed agents emit confident fiction (Curator drafts `MOCK001`; brand-audit always
> returns `passed: true`, so off-brand assets would ship).

### P2 — Make it breathtaking · *the design bar; measurable*
- **Build the signature motion** specced in BRAND §6 but unbuilt anywhere: the **corona reveal**
  (arc of light widening into the ring) on the Hero, and the **totality countdown** (ring narrows to
  a sliver, snaps to full corona) on the live DropBoard. This is the screenshot that sells
  "first-of-its-kind." Use the `frontend-design` skill + Figma MCP.
- **Migrate the grid to `next/image`** (priority + blur on the LCP image) — config already exists;
  cheapest path to a defensible Lighthouse on the media-heavy luxury grid (today: raw `<img>`).
- **Resolve the typography conflict.** Spec is grotesque / two-weights (BRAND §5); the build ships
  Cormorant Garamond serif in 27 places. Decide: relax the spec, or replace the type.
- **Run a real Lighthouse/perf pass.** Reduce `cache:'no-store'` everywhere + the home-page N+1 fan-out.

### P3 — Make it unprecedented · *the signature bets, now grounded*
- **The Living Broadcast** — generative sections/copy/hero per visitor, recomposing live (requires
  P1: real embeddings + closed loop).
- **Agentic Polaris** — promote the (real, keyed) concierge from advisory to *acting* (build a look,
  edit the cart, apply Lumens) — inside the escalation gate.
- **"Your Light"** — surface the MIND profile to the visitor, steerable (extends the already-real
  `TuneBroadcast`).
- **Live drops** — real-time presence/units via SSE/websocket (today counts are SSR-frozen);
  members-first ritual.
- **Self-improving, visible** — run INTROSPECTION nightly on production; surface "why this rail" to
  the visitor.

## 3. Retention stack (compounding, not one feature)
Membership (Ember / Luminary) + Luminance ladder (Spark→Zenith) + drop ritual + **agent memory**
(the store remembers you across visits) + lifecycle email (subscriber scaffolded; **no provider
wired**) + personalization that *visibly* improves (requires P1).

## 4. Cross-cutting risks (the stuff that quietly bites)
- **Silent-failure honesty risk.** Nearly every fetch is `catch → []/null`; a degraded backend
  renders a plausible-but-empty Broadcast with **no error signal** — you could ship silently-broken
  intelligence and not know. Add health signals.
- **Test honesty gap.** Zero component / page / e2e tests; the headline "52 tests" are mostly
  lib + intelligence, **not** commerce-safety or rendering. Violates "verified, not assumed."
  Close it with **G13 (Playwright/k6 gates)** + **G10 (OTel trace/event taxonomy)**.
- **🔴 Branch-lineage divergence — resolve before any further build.** Two structurally-incompatible
  trees both claim to be the project. **Lane A** = `deploy/medusa-cloud` → this branch: flat layout
  (`apps/ packages/ scripts/` at root), Lumera-branded, **what's actually deployed**, `verify-api.sh`
  only. **Lane B** = `epic-clarke` → `codex/verify-api-clean-checkout`: **everything nested under
  `alter-xiv/`**, the founder's local Codex lineage, adds the cross-platform `verify-api.ts` + fixtures
  fallback + the `AUDIT_HEAD` roadmap. They share an ancestor but forked at the **directory-structure**
  level — they **cannot be casually merged**. Choosing the canonical lane and porting the other's good
  bits is the prerequisite to coherent progress. *(Verified by `git ls-tree`: Lane A root = `apps/…`;
  Lane B root = `alter-xiv/`.)*
- **Cold-start.** On a fresh deploy, `graph_rec` / `trending` fall back to `random()` — launch-day
  merchandising is random dressed as personalization until traffic + real embeddings land.

## 5. Definition of "best of 2026" (falsifiable — verified, not assumed)
Claimable only when **all** are true *and tested*:
1. Real payment capture (incl. SCA/3DS + webhook reconciliation); **zero** unauthenticated
   money/data endpoints.
2. Recs are semantic (real embeddings) **and** the bandit demonstrably learns (closed loop).
3. The signature motion ships, and Lighthouse ≥ target on the **live** store.
4. Agents act through **real** tools behind the gate; INTROSPECTION runs nightly in production.
5. Component/e2e coverage on checkout + the Broadcast render path.

Until each is true and tested, it isn't done.

## 6. Guardrails (permanent)
No autonomous money movement or publishing without Garrett's approval — **the escalation gate is
real; keep it.** Stripe test-only until founder go-live. Brand integrity. Verified, not assumed.
One source of truth.
