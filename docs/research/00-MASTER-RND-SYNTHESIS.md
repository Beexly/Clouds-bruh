# Eclipse — Master R&D Synthesis & Autonomous Execution Plan

**Generated:** 2026-05-30 · **Owner:** Eclipse (Galaxy Network)
**Inputs:** 25 open-source repos mined + deep web research, across 6 workstreams (see `01`–`06` in this folder).
**Quarantined:** an archive named `FLStudio2026FullCrackedEdition` (pirated software) was **not** extracted or run.

> This is the controlling synthesis for the post-R&D build push. It distills ~1,400 lines of findings into a phased, buildable roadmap that stays true to the Eclipse charter: **dependency-free Node ESM core, append-only truth, no secrets in repo, mock adapters by default, and the prime directive — agents propose and prepare; humans approve and publish.**

---

## The thesis (what the research agreed on)

1. **Luxury converts on restraint, not noise.** The 2024–2026 award-winning *commerce* sites (Polène, Opal, P448) and the luxury-auto houses (Ferrari, Lamborghini, Bugatti, BMW-M) win on near-black canvases, a single "voltage" accent, photography-as-chrome, sharp corners, modest type weight, and whitespace-as-pedestal. Eclipse's existing palette/voice is already in this lane — we sharpen it (one voltage = corona gold; demote others to state roles).
2. **Steal marketplace *mechanics*, reject mass-market *dressing*.** Adopt fast typo-tolerant search, faceted filtering with applied-filter chips, rich single-CTA PDPs, verified photo reviews, "pairs with" recommendations, accelerated/guest checkout, honest trust+returns clarity. Reject Shein/Temu dark patterns (fake timers, "127 viewing," padded MSRPs, spin-to-win) — now under FTC/EU enforcement and corrosive to a luxury house.
3. **People buy emotionally, justify rationally — and buy from brands they like.** Lead with imagery/story/belonging; supply materials/provenance/reviews/returns to license the splurge. Encode a consistent house personality (voice + visual + motion + sonic signature).
4. **"Feel before you buy" is an imagery problem with a known finishing chain.** A required shot list + a hard media-quality gate + a 0–100 quality score (mapped to real HDR/ISP finishing stages) raises perceived quality; heavy enhancement lives in an adapter/MCP, never the dep-free core.
5. **Autonomy scales safely only behind gates, budgets, attribution, and tamper-evident logs.** The OWASP Agentic 2026 taxonomy (ASI01–10) names the threats; Eclipse's human gate is the headline mitigation for "Excessive Agency" — we make it *provable*.
6. **Sellability is mostly multi-tenancy + audit + compliance.** The single biggest valuation gate is multi-tenant isolation; then audit logging, SOC 2 Type II, PCI SAQ A (Stripe-hosted), GDPR/CCPA. The dependency-free, append-only, human-gated design is a diligence *advantage* — it just needs to be made attestable.

---

## What already shipped from this R&D

- **Trend-detection engine** (`src/trends/*`, `trends` agent, `npm run trends`) — findings/05 §4 implemented: EWMA velocity + acceleration + robust median/MAD z-score across search/social/marketplace/first-party-demand signals, × confidence × brand-fit (hard gate) × saturation; emits explainable TREND candidates into the human queue. 8 tests; deterministic.

---

## Adoption decisions (cross-workstream, deduped)

### Keep / protect (already correct — never weaken)
- Integer minor-unit money (strictly better than the templates' float/decimal).
- Default-deny storefront projection; human-gated transitions; `agent` actor can never approve/publish.
- Dependency-free + no-secrets-in-repo + mock-by-default adapters; Stripe-as-artifact, go-live as a deliberate human action.

### Adopt (prioritized)
- **A. Data-model evolution** — generic variant `attributes` map (replace hard-coded color/size); self-referential **category tree** separate from curated collections; flagged `tenant_id` seam. *(01 #4/#6/#7)*
- **B. Checkout/settlement hardening** — webhook-driven, **idempotent** order-of-record (fulfill only on verified `checkout.session.completed`, dedupe by event id, periodic reconcile); generalize payments into a **hosted-checkout/payment-link artifact** (keeps PCI scope at SAQ A). *(01 #1/#2)*
- **C. Storefront conversion depth** — URL-driven facet/sort/paginate contract; verified reviews; "pairs with / complete the ritual" recommendations; honest scarcity + returns clarity; guest + express-wallet checkout. *(01 #5, 05 §1–2)*
- **D. Design-system level-up** — one voltage (corona gold); Cormorant display ramp (≤600 weight, negative tracking); void→surface elevation ladder + single media shadow; sharp corners; tabular numerics for money; the motion system (easings/durations below); native CSS scroll-driven reveals + View Transitions (no deps). *(04, 06)*
- **E. Imagery quality system** — required shot list (hero/front/back/detail/scale) + hard media gate (resolution/aspect/clipping/sRGB/sharpness/noise/brand-safe/human-approved) + 0–100 quality score; enhancement adapter/MCP seam. *(03)*
- **F. Content/personality agent** — script→shotplan→voice→assembly *spec* (render only post-approval via MCP), emitting content candidates into the same queue; `styleGuide` in `src/brand.mjs`. *(03)*
- **G. Autonomy-safety upgrade** — input-rewriting **policy gate** (per-role default-deny tool allowlist + sanitization); **budgets/rate-limits** (turns, tool calls, monetary exposure); **tamper-evident hash-chained** event log + `verify-log`; fail-closed on degraded I/O. *(02)*
- **H. Security/compliance roadmap** — threat-model doc, multi-tenancy, audit log, SAQ A, GDPR/CCPA (crypto-shredding for erasure over the event log), SBOM/SLSA, SOC 2 Type II. *(02, 06)*

### Do NOT adopt
Float/decimal money; heavy deps (Drizzle/Prisma/Better Auth/Polar SDK/Next/Django/Zustand/GSAP/Three.js); auto-publish or auto-spend anywhere; WebGL on the purchase path; the cracked-software archive.

---

## Motion system (from 04 — adopt verbatim into tokens)

```
--ease-standard: cubic-bezier(0.4,0,0.2,1)    --ease-entrance: cubic-bezier(0.16,1,0.3,1)
--ease-exit:     cubic-bezier(0.4,0,1,1)      --ease-emphasis: cubic-bezier(0.34,1.56,0.64,1)
--dur-instant 90ms · --dur-fast 160ms · --dur-base 240ms · --dur-slow 420ms · --dur-cinematic 720ms
press: scale(0.97) instant · hover-card: translateY(-4px)+corona border fast
reveal: opacity+translateY(16→0) slow ease-entrance, stagger 60ms · honor prefers-reduced-motion
```

---

## Phased execution roadmap

Each phase: dependency-free, tests green, committed, pushed; nothing auto-publishes or auto-spends.

- **R1 — Trend engine** ✅ shipped (`src/trends/*`).
- **R2 — Data model evolution** ✅ shipped: variant `attributes`, category tree, `tenant_id` seam.
- **R3 — Conversion storefront** ✅ shipped: facet/sort/paginate, recommendations, verified reviews, design-token + motion level-up, PDP "feel."
- **R4 — Imagery quality system** ✅ shipped: shot list + hard media gate + 0–100 score + enhancement-MCP seam.
- **R5 — CX, size accuracy, copy gate & deadly-sin hardening** ✅ shipped (see Round 2 below).
- **R6 — Autonomy safety** (G): policy gate, budgets, hash-chained log + `verify-log`, fail-closed audit.
- **R7 — Checkout/settlement** (B): hosted-checkout artifact + idempotent webhook-driven order-of-record + reconcile.
- **R8 — Content/personality agent** (F): `styleGuide` + content candidate pipeline into the queue.
- **R9 — Security/compliance** (H): threat-model doc, multi-tenancy hardening, SBOM, SOC2/PCI/GDPR roadmap.

---

## Round 2 — "Eclipse Frontier" research (findings 07–12)

A second, deeper research round on retention, sales, marketplace history, the psychology of wording/format, the analytics "why," customer-service + size accuracy, and genuinely first-of-its-kind ideas. Six new workstreams:

- **07 History & moats** — billion-dollar winners vs. failed companies across ALL online business. Verdict: survivors respected unit economics + built a real moat; corpses bought growth they couldn't fund. The **"7 deadly sins → Eclipse guardrail"** map; our moats = brand + counter-positioning vs dark-pattern retail + a proprietary autonomous-curation taste flywheel + trust-as-infrastructure. **Shipped:** hardened Sins 1 (positive-margin gate) & 4 (full-price/no-charm policy in `brand.mjs`).
- **08 Retention & LTV** — retention is the growth engine (5%→25–95% profit); the second-purchase inflection (27%→54%); RFM + cohort + predicted-LTV from the event log; lifecycle flows that PROPOSE into the human queue; luxury "Inner Circle" (access, not points). → builds the retention engine (a later batch).
- **09 Wording & format psychology** — specificity-as-trust; luxury rounded pricing (no charm .99); the F-pattern scanning law. **Shipped:** `src/scoring/copy-gate.mjs` — a deterministic copy scorer/gate (voice, specificity, reading ease, banned hype, honesty hard-fails, price rule), wired as the `copy_on_voice` launch gate.
- **10 CX & size accuracy** — fit is the #1 returns cause; service is the #1 retention lever; "escalate, don't guess." **Shipped:** `src/fit/*` — size/fit data model (integer mm), deterministic size recommender, and a returns-reason intelligence loop that proposes fit-profile flips and penalizes suppliers (human-gated). Proactive CX triggers queued for a later batch.
- **11 Analytics "why" engine** — a metric *tree*, not a dashboard; **North Star = return-adjusted gross profit (trailing-90d)**; an event taxonomy; low-traffic Bayesian/sequential experimentation; anomaly+root-cause via the existing `trends/features.mjs`. → builds the why-engine (a later batch).
- **12 First-of-its-kind** — the strategic bet: **"show the machine and publish the truth — make that the luxury,"** uncopyable by rivals with hidden margins/dark patterns. 15 analyzed ideas (Glass Atelier, Receipts Mode, Provenance Passport, the Gate-as-publication, accountable agent cast, `eclipse.txt` honesty manifest); the **Stay-Ahead doctrine** (continuous-R&D + trends loop); and **"The Eclipse Standard"** — one report object `{subjectType, passed, score, hardGates[], softDimensions[], blockers[], evidence}` consolidating every gate (launch/imagery/trend-fit/copy) into one publish guard and the data substrate for the transparency features.

### Round-2 build queue (post-R5)
- **R6 Eclipse Standard** — unify launch + imagery + copy + trend-fit gates into one report object; golden-test fixtures. *(quality consistency — the founder's "stay consistent" ask)*
- **R7 Retention engine** — RFM + cohort + predicted-LTV + lapse detection + lifecycle-flow proposals + Inner Circle.
- **R8 Why-engine** — event taxonomy + funnel/segmentation/cohort + anomaly root-cause + North Star in the ops console.
- **R9 Proactive CX** — order-lifecycle service triggers + CSAT/NPS capture + size guide on PDP.
- **Frontier (staged)** — Receipts Mode + Provenance Passport + Glass Atelier (renderers over data we already log).

---

## Source index
Round 1: `01` e-commerce/SaaS · `02` autonomy & security · `03` imagery & content · `04` design (80 brands) · `05` marketplace/psychology/trends · `06` studios & sellable security.
Round 2: `07` history & moats · `08` retention & LTV · `09` wording/format psychology · `10` CX & size accuracy · `11` analytics why-engine · `12` first-of-its-kind. Full takeaways + citations in each file.
