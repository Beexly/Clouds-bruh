# LAUNCH_LEDGER.md — LUMERA Launch Director, source of truth
> **Every session starts by reading this and ends by updating it.** If the container drifts, this survives.
> Scores are evidence-based (file / test / verified behavior) — never a vibe.

**Head:** `1d68014` · **Updated:** 2026-06-10 · **Build:** `pnpm build` 4/4 ✅ · **Tests:** 378 green
(shared 37 · backend 219 · intelligence 63 · storefront 59) · **Deploy branch** `deploy/medusa-cloud` is behind the work branch `claude/affectionate-clarke-KJ8O1`.

**Method:** three hostile audit lanes (storefront declared-vs-delivered · money path · autonomy+security), each finding spot-verified by the Director before being gated below.

---

## PHASE 2 — READINESS SCORECARD
Launch gate = **Payments + Commerce core + Trust & legal + Security must be GREEN.** Now: **Trust & legal 🟢\* · Commerce 🟡 (catalog) · Security 🟡 (key rotation, ~closed) · Payments 🟠 (rail built + reviewed + CI-green; live money-test pending).** Every remaining gate item is a **founder move** (run the Stripe E2E pass + register the webhook, catalog curation, confirm COCKPIT_KEY rotation, postal address) — all Director-ownable money/trust/autonomy defects are cleared **and** the B1 card rail is now reviewed.

| Domain | Score | Evidence |
|---|---|---|
| **Commerce core** | 🟡 | browse→cart→checkout→order verified in `verify:api` (test mode). ✅ **Oversell race fixed** (B2): `consumeUnits()` is a single guarded atomic UPDATE (unit-tested; **CI run #67 green** — migrate·seed·boot·regressions on real Postgres with this code). Still 🟡 on **no real catalog on Cloud** (10 sample fixtures, B6). |
| **Payments** | 🟠 | ✅ **Card rail BUILT + Director-reviewed PASS** (B1/D3, `f48ca0d`): Stripe Elements (cards+wallets), server-created PaymentIntent (browser never computes amount), correct provider id `pp_stripe_stripe` (unit-tested), honest charged-but-no-order guard; capture driven by Medusa-native `/hooks/payment/stripe_stripe`. **CI green** (#70/#71). ✅ PayPal false-success fixed (D6). **NOT GREEN until** (founder): (a) live money legs pass — `docs/STRIPE_E2E_TEST_PLAN.md` (auth/capture/FAIL/refund/replay); (b) register the native webhook URL in Stripe; (c) **3DS redirect-return gap** (Leg 3b) verified/fixed before non-US cards. Founder is on `pk_live` — see plan's key-mode note. |
| **Email engine** | 🟢* | ✅ **CAN-SPAM done** (B3): marketing emails carry a postal address + one-click signed-token unsubscribe (`lib/email-compliance.ts`, `/unsubscribe` route, suppression in `lib/newsletter.ts`); jobs skip without an address in prod + skip suppressed recipients; transactional mail stays exempt. *Asterisk: founder must set `COMPANY_POSTAL_ADDRESS` in prod env. |
| **Search & discovery** | 🟡 | `/search` + ⌘K wired & tested on fixtures; **not calibrated on real catalog** (the "intelligent" standard can't be GREEN on 10 samples). |
| **SEO & structured data** | 🟢 | JSON-LD claims resolve (Product/Offer/AggregateRating, Org, WebSite, FAQPage); sitemap complete; robots blocks private surfaces incl. `/cockpit`. Tests `jsonld.test.ts` (11). |
| **Cockpit & autonomy** | 🟢 | Gate **NOT bypassable by agents** ✅. ✅ **Approval injection fixed** (D1): approvals execute the agent's **stored** pending action, never client-supplied tool/input. ✅ **Replay idempotency** (D1): `claimApproval()` dedupes by `approval_id`. ✅ **Staging gate** (D7): `COCKPIT_REQUIRE_KEY` + all ops routes on `authorizeOps`. ✅ **Drop-grader fresh-DB safe** (D2): `ensureAgentRunTable()`. |
| **Trust & legal** | 🟢* | Legal pages carry real, store-accurate copy ✅; ✅ CAN-SPAM closed (B3); ✅ **fake-review gate** (D5): reviews require a verified purchase (default ON in prod) so AggregateRating can't be inflated. *Asterisk: privacy-vs-actual-data-handling review still wise pre-scale. |
| **Brand & voice** | 🟡 | Storefront/emails on-brand; but **no About/brand-story page**, and `returns/page.tsx:117` ships a `you@example.com` placeholder — "no default copy" standard not yet met. |
| **Performance & resilience** | 🟡 | Build clean; graceful degradation everywhere (catch→fallback); **money-path code unverified end-to-end** (no live run); no Lighthouse (needs hosted env). |
| **Security & secrets** | 🟡 | ✅ approval injection + replay closed (D1); ✅ cockpit staging gate (D7); ✅ unverified-review hole closed (D5); ✅ PayPal money-honesty (D6). Public endpoints have per-IP limits + uniform not-found. **Remaining 🔴 → founder:** rotate the **committed `COCKPIT_KEY`** (in git history) in prod (B4). `.env` gitignored ✅. |

---

## PHASE 3 — THE THREE LISTS

### 🔴 LAUNCH-BLOCKING (cannot safely take a stranger's money — defended as small)
| # | Blocker | Owner | Evidence |
|---|---|---|---|
| B1 | **Real card rail** — ✅ BUILT + Director-reviewed PASS + CI green (`f48ca0d`). **Remaining (founder):** run `docs/STRIPE_E2E_TEST_PLAN.md` (auth/capture/FAIL/refund/replay) + register native webhook + verify 3DS redirect-return (Leg 3b). | Founder runs E2E + webhook → **Director verified code** | `StripeCardForm.tsx`, `medusa-config.ts`, `lib/api.ts` |
| ~~B2~~ | ✅ **DONE** — atomic guarded decrement (`UPDATE … WHERE units_remaining >= $1`) + strict/allowPartial modes + 5 unit tests. *Postgres concurrency proof on CI.* | Director | `modules/drops/service.ts` |
| ~~B3~~ | ✅ **DONE** — signed-token unsubscribe + `/unsubscribe` route + postal address footer + suppression + job gates. **Founder still: set `COMPANY_POSTAL_ADDRESS` in prod.** | Director (built) → Founder (env) | `lib/email-compliance.ts` |
| B4 | **Rotate `COCKPIT_KEY`** (in history) — fresh value in Cloud env only (docs already scrubbed) | **Founder rotates in prod** | `GO_LIVE_TODAY.md` |
| B5 | **Tax decision**: configure (Stripe Tax recommended) or *knowingly* defer, documented | **Founder decision** | no tax provider found (verified) |
| B6 | **Real catalog**: ≥ ~20 Warden-screened, founder-approved products seeded on Cloud (not the 10 samples) | **Founder curation** (Curator/Warden assist) | `packages/data/fixtures/*` = 10 rows |

### 🟡 LAUNCH-DEGRADING (works, but underperforms/under-impresses — ships with a knowing note)
- ~~D1~~ ✅ **DONE** — approval executes stored action (no injection) + `approval_id` idempotency.
- ~~D2~~ ✅ **DONE** — `ensureAgentRunTable()` makes the drop-grader fresh-DB safe (enable `DROP_GRADER_ENABLED=true` after CI verify).
- D3 **Express wallets** (Apple/Google Pay) — ride the Stripe rail. *(with B1)*
- D4 **`complete_the_set` cart cross-sell** — AOV; needs money-page run-verify. *(Director, after B1)*
- ~~D5~~ ✅ **DONE** — **verified-purchase review gate** (the highest-value piece). *Remaining minor: per-email newsletter throttle (per-IP exists).*
- ~~D6~~ ✅ **DONE** — PayPal capture/refund no longer report false success.
- ~~D7~~ ✅ **DONE** — `COCKPIT_REQUIRE_KEY` staging gate + ops routes unified on `authorizeOps`.
- D8 Search/Broadcast **calibration on real catalog** — the "intelligent" standard. *(after B6)*
- ~~D9~~ ✅ **DONE** — returns placeholder fixed; new env vars documented in `.env.example`.

### ⏳ POST-LAUNCH (week 1 = observation + calibration, NOT features)
About/brand-story page (founder voice session) · margin-safe referral · live tracking numbers on `/track` · Lighthouse/perf + a11y audit (hosted env) · deeper analytics.

---

## FOUNDER CRITICAL PATH (only you can do these — ordered, time-boxed)
> **Executable version:** paste the prompt in `FOUNDER_COWORK.md` into a Claude session — it drives
> you through every item below one at a time, with verification and no-skip rules.
| # | Action | Time | Unblocks |
|---|---|---|---|
| 1 | **Push the `safety/` branch to origin** (Stripe rail + wallets) so the Director can see/verify it | 10 min | B1, D3 |
| 2 | **Drop test keys** into Cloud/secrets: Stripe `sk_test`/`pk_test` + webhook secret, Anthropic, Resend | 15 min | B1, B3, B6 |
| 3 | **Tax call**: Stripe Tax vs manual vs defer | 10 min | B5 |
| 4 | **Business postal address** for email footers | 2 min | B3 |
| 5 | **Rotate `COCKPIT_KEY`** (fresh value, Cloud env only) | 2 min | B4 |
| 6 | **Curate first ~20 real products** → approve on `/cockpit` (Warden screens) | 1–3 hrs | B6 |
| 7 | **GO_LIVE pass** (env → bootstrap on Cloud → DNS → webhook → verify) | 45 min | launch |
| 8 | **Final go/no-go** after Director confirms the 4 gate domains GREEN | — | launch |

**Distance to launch:** ~**4–6 founder-hours** (mostly catalog + launch pass + decisions) · ~**3–5 agent-sessions** (B1 verify, B2/B3 fixes, D-items). Gate: **0/4 GREEN today.**

---

## CHANGELOG
- **v2.2 (f48ca0d, 2026-06-10):** B1 card rail (built by a prior session, money-path code) **reviewed
  by the Director** — all 4 files read; verdict PASS (correct provider id `pp_stripe_stripe` + tested,
  server-side amount, honest failure guard, native-webhook capture). CI green on both branches (#70
  work, #71 deploy) — lockfile fix landed. Payments 🔴→🟠. One real gap recorded, NOT patched blind:
  3DS **redirect-return** path (`StripeCardForm` makes a new payment collection on return instead of
  completing the cart → paid/no-order for cards that full-redirect; low risk US, real for EU/SCA).
  Added as Leg 3b in the E2E plan with the fix design; held to the bar (no unverified money-path code).
- **v2 (1d68014, 2026-06-10):** Autonomous hardening pass (founder gave standing approval for all
  Director-ownable, verifiable work). Cleared **every money/trust/autonomy defect I own**: B2 oversell
  (atomic), B3 CAN-SPAM (unsubscribe + postal + suppression), D1 approval injection + replay, D2
  drop-grader fresh-DB, D5 verified-purchase reviews, D6 PayPal false-success, D7 staging gate, D9
  env docs + polish. Tests 343 → **378**; build 4/4. Gate yellows/reds that remain are **all founder
  moves** (B1 card rail, B4 key rotation, B5 tax, B6 catalog, + set `COMPANY_POSTAL_ADDRESS`).
  Held to the bar: nothing unverifiable shipped to the money path as "done" — B2's Postgres
  concurrency + the DB-backed paths are flagged for CI proof, not assumed.
- **v2.1 (ab12c39, 2026-06-10):** CI restored on the work branch (PR #7, the old vehicle, was
  merged/closed — pushes ran NO CI since). `ci.yml` push trigger now includes this branch; **run #67
  GREEN end-to-end**: `build·lint·test` + `verify:api` (migrate · seed · pgvector · boot ·
  regressions) on real Postgres/Redis — first DB-backed proof of the v2 hardening (atomic
  consumeUnits, ensureAgentRunTable, /unsubscribe, approvals rework). `FOUNDER_COWORK.md` added
  (executable founder critical path). Noted: **repo is public** — founder to confirm intent.
  Verified: no `safety/*` branch on origin; all 13 remote branches grepped for Stripe Elements —
  zero hits. If the founder's local hunt comes up empty, Director builds the rail on this branch.
- **v1 (dc2a3f6, 2026-06-10):** Full-state audit (3 lanes, spot-verified). Scorecard 0/4 gate GREEN. Three lists + founder path established. COCKPIT_KEY scrubbed from docs (rotation still required).
