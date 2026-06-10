# LAUNCH_LEDGER.md — LUMERA Launch Director, source of truth
> **Every session starts by reading this and ends by updating it.** If the container drifts, this survives.
> Scores are evidence-based (file / test / verified behavior) — never a vibe.

**Audit commit:** `dc2a3f6` · **Audited:** 2026-06-10 · **Build:** `pnpm build` 4/4 ✅ · **Tests:** 343 green
(shared 37 · backend 185 · intelligence 62 · storefront 59) · **Deploy branch** `deploy/medusa-cloud` is **16 commits behind** the work branch `claude/affectionate-clarke-KJ8O1`.

**Method:** three hostile audit lanes (storefront declared-vs-delivered · money path · autonomy+security), each finding spot-verified by the Director before being gated below.

---

## PHASE 2 — READINESS SCORECARD
Launch gate = **Payments + Commerce core + Trust & legal + Security must be GREEN.** Today: **0 of 4 are GREEN. Not launch-ready.**

| Domain | Score | Evidence |
|---|---|---|
| **Commerce core** | 🟡 | browse→cart→checkout→order verified in `verify:api` 23/23 (test mode), BUT **oversell race** — `consumeUnits()` is read-compute-write, not atomic (`modules/drops/service.ts:11-20`); and **no real catalog on Cloud** (10 sample fixtures only, `packages/data/fixtures/*`). |
| **Payments** | 🔴 | **No card input in this tree** — Stripe Elements is a TODO on the unmerged `safety/` branch (`checkout/page.tsx:252`); **Stripe webhook records but never drives capture** (`api/hooks/stripe/route.ts`), **not idempotent** (`lib/lumera-db.ts:277`); PayPal refund **reports false success** when unconfigured (`modules/lumera-payment-paypal/service.ts:195`). |
| **Email engine** | 🔴 | **CAN-SPAM**: abandoned-cart + review-request emails have **no unsubscribe + no postal address** (`lib/email.ts:260-383`); newsletter form **promises "Unsubscribe anytime" with no mechanism** (`NewsletterSignup.tsx:56`). |
| **Search & discovery** | 🟡 | `/search` + ⌘K wired & tested on fixtures; **not calibrated on real catalog** (the "intelligent" standard can't be GREEN on 10 samples). |
| **SEO & structured data** | 🟢 | JSON-LD claims resolve (Product/Offer/AggregateRating, Org, WebSite, FAQPage); sitemap complete; robots blocks private surfaces incl. `/cockpit`. Tests `jsonld.test.ts` (11). |
| **Cockpit & autonomy** | 🟡 | Gate is **NOT bypassable by agents** ✅ (verified). But: **approval replay** (no `approval_id` idempotency, `orchestrator/index.ts:111`), **input injection** (approvals endpoint passes arbitrary `input` to gated tools, `approvals/route.ts:60`), and **drop-grader silently no-ops on a fresh Cloud DB** (writes `agent_run.pending_actions` but no backend migration creates that column — only intelligence's `ledger.ts` does). |
| **Trust & legal** | 🟡 | Legal pages carry real, store-accurate copy ✅; blocked on the **CAN-SPAM** gap (under Email) + a privacy-vs-actual-data-handling review. |
| **Brand & voice** | 🟡 | Storefront/emails on-brand; but **no About/brand-story page**, and `returns/page.tsx:117` ships a `you@example.com` placeholder — "no default copy" standard not yet met. |
| **Performance & resilience** | 🟡 | Build clean; graceful degradation everywhere (catch→fallback); **money-path code unverified end-to-end** (no live run); no Lighthouse (needs hosted env). |
| **Security & secrets** | 🔴 | **Committed `COCKPIT_KEY`** in `GO_LIVE_TODAY.md` (in git history → compromised, rotate); approval replay + input injection; cockpit **fail-open in non-prod**; public endpoints abusable (newsletter flood, **unverified reviews**, order-lookup enumeration — per-IP limit only). `.env` gitignored ✅. |

---

## PHASE 3 — THE THREE LISTS

### 🔴 LAUNCH-BLOCKING (cannot safely take a stranger's money — defended as small)
| # | Blocker | Owner | Evidence |
|---|---|---|---|
| B1 | **Real card rail**: merge `safety/` Stripe Elements + wire Stripe webhook → Medusa capture + idempotency + verify end-to-end in test (auth/capture/**fail**/refund) | Founder merges + test keys → **Director verifies** | `checkout/page.tsx:252`, `api/hooks/stripe` |
| B2 | **Oversell race**: atomic decrement (`UPDATE … SET units_remaining = units_remaining - $1 WHERE units_remaining >= $1`) | Director (small patch + test) | `modules/drops/service.ts:11-20` |
| B3 | **CAN-SPAM**: unsubscribe link + working mechanism + postal address in all marketing emails (abandoned-cart, review-request, newsletter) | Director builds → **founder provides postal address** | `lib/email.ts:260-383`, `NewsletterSignup.tsx:56` |
| B4 | **Rotate `COCKPIT_KEY`** (in history) — fresh value in Cloud env only; scrub from docs | Director scrubs docs → **founder rotates in prod** | `GO_LIVE_TODAY.md:27,50` |
| B5 | **Tax decision**: configure (Stripe Tax recommended) or *knowingly* defer, documented | **Founder decision** | no tax provider found (verified) |
| B6 | **Real catalog**: ≥ ~20 Warden-screened, founder-approved products seeded on Cloud (not the 10 samples) | **Founder curation** (Curator/Warden assist) | `packages/data/fixtures/*` = 10 rows |

### 🟡 LAUNCH-DEGRADING (works, but underperforms/under-impresses — ships with a knowing note)
- D1 **Approval hardening**: `approval_id` idempotency + input-schema validation on approvals endpoint. *(Director)*
- D2 **Drop-grader schema**: backend migration for `agent_run.pending_actions` — **keep `DROP_GRADER_ENABLED=false` until fixed** (today it silently no-ops). *(Director)*
- D3 **Express wallets** (Apple/Google Pay) — ride the Stripe rail. *(with B1)*
- D4 **`complete_the_set` cart cross-sell** — AOV; needs money-page run-verify. *(Director, after B1)*
- D5 **Public-endpoint hardening**: per-email newsletter throttle, **review ownership verification**, order-lookup enumeration throttle. *(Director)*
- D6 **PayPal refund false-success** + **minting guard** also gate live PayPal. *(Director)*
- D7 **Cockpit fail-open in non-prod** (require key in staging). *(Director)*
- D8 Search/Broadcast **calibration on real catalog** — the "intelligent" standard. *(after B6)*
- D9 Returns placeholder copy; document the 9 undocumented env vars. *(Director)*

### ⏳ POST-LAUNCH (week 1 = observation + calibration, NOT features)
About/brand-story page (founder voice session) · margin-safe referral · live tracking numbers on `/track` · Lighthouse/perf + a11y audit (hosted env) · deeper analytics.

---

## FOUNDER CRITICAL PATH (only you can do these — ordered, time-boxed)
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
- **v1 (dc2a3f6, 2026-06-10):** Full-state audit (3 lanes, spot-verified). Scorecard 0/4 gate GREEN. Three lists + founder path established. COCKPIT_KEY scrubbed from docs (rotation still required).
