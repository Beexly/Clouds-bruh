# 10 — Customer Service Excellence & Size/Fit Accuracy: Research + Eclipse System Designs

**Thesis (the founder's bet):** *"Places like this are made on CUSTOMER SERVICE and ACCURACY TO SIZE."* The research below confirms this empirically: in apparel, **fit is the #1 returns cause (53–77% of returns)** and returns are a margin-killer ($816B globally), while **service quality is the dominant driver of retention/LTV** (NPS leaders grow ~2x faster). For an autonomous, human-gated house like Eclipse, both are systems problems — and both fit Eclipse's existing spine (agent-drafts → human-sends inbox; order/returns lifecycle; deterministic scoring). This document turns the research into two buildable specs that respect Eclipse's hard constraints (dependency-free Node, append-only truth, integer minor units, mock-by-default, and the prime directive that agents propose while humans approve/send).

---

## PART A — CUSTOMER SERVICE EXCELLENCE (research + data)

### A1. What defines elite service

| Principle | Source exemplar | What it actually means | Eclipse translation |
|---|---|---|---|
| **Empowerment over scripts** | Zappos (no scripts, no call-time limits; reps resolve without manager sign-off) [1]; Ritz-Carlton ($2,000/guest discretionary spend to fix problems) [5] | Front-line judgment beats rigid rules; trust the agent to make it right | The *human* operator is empowered; the *AI agent* is bounded (drafts only, never spends). Empowerment lives at the human-send step. |
| **Surprise & delight** | Zappos "Customer Loyalty Team" (flowers, free product after hard life events) [1]; Chewy per-rep "fun budget," sympathy cards & pet portraits | Discretionary, human, non-scalable gestures create word-of-mouth | A `delight` proposal type the agent *suggests* (e.g., handwritten note, free expedited reship) but a human authorizes — never auto-spend. |
| **Anticipate unspoken needs** | Ritz-Carlton "anticipate what guests have not yet realized they want" [5] | Proactive > reactive; solve before they ask | Order-lifecycle triggers generate proactive outreach drafts (shipped / delayed / delivered → check-in). |
| **Clienteling / concierge** | Nordstrom Style Boards, BevyUp; luxury 1:1 relationships built on purchase history & preferences [6] | Personal, history-aware, long-term relationship | A lightweight customer profile (past sizes, fit prefs, purchase/return history) feeds both support drafts and size recs. |
| **Service recovery** | Ritz "fix it on the spot"; honest exchange-first returns | A well-handled complaint can raise loyalty above pre-failure baseline (the "service-recovery paradox") | Complaint intents get priority SLA + escalation flag; recovery offers are proposed, human-approved. |

### A2. The data (why this is a growth lever, not a cost center)

- **Returns volume & cost:** Average US online return rate hit **~20.8–24.4% in 2025** (apparel up to **40%** for some brands); global apparel averages **~26%** [7][8]. US apparel returns cost **~$38B/yr** (~$25B processing); returns cost e-commerce **~$816B/yr worldwide** [7]. **63%** of shoppers "bracket" (buy multiple sizes intending to return) [7].
- **Service → growth:** NPS leaders grow revenue **~2x faster** than competitors (Bain) [2]; improving CX can lift sales revenue **2–7%** and profitability **1–2%** (McKinsey) [2].
- **Benchmarks to target:** global average **NPS ≈ 32** (B2C ≈ 49) [2]; **CSAT 75–85% = good**, **>70 good/excellent, <50 poor** [2]. **First-Contact Resolution (FCR)** removes follow-ups and is a top satisfaction lever [2].
- **WISMO dominates inbound:** "Where is my order?" is **40–60% of all inbound support contacts** [9]. **83%** of shoppers expect regular order updates; proactive multi-milestone notifications cut WISMO contacts **~40%** [9]. Customers who must *ask* about status are **3x more likely to leave a negative review and 2.5x less likely to repurchase within 90 days** than those who got proactive updates [9].

### A3. AI + human CX in 2025–26 (the human-in-the-loop reality)

The research strongly validates Eclipse's draft→send model as the *correct* architecture, not a limitation:

- **Where AI excels:** speed/consistency/scale. AI has cut first-response from >6h to <4min and resolution from 32h to 32min (~87% improvement) [10]; instant 24/7 triage, drafting, and status lookups.
- **Where humans must stay:** empathy, complaint/service-recovery judgment, policy exceptions, high-value relationships. **79% of Americans prefer a human** over an AI agent; **84% believe humans are more accurate** [10]. Production automation reliably lands at **55–70%**, not the 90%+ shown in demos [10]. Qualtrics 2026: ~1 in 5 who used AI support saw *no benefit* — "too many companies deploy AI to cut costs, not solve problems, and customers can tell" [10].
- **Escalation quality matters:** human agents handed **full context** resolve **35–45% faster** [10]. → Drafts must carry order + history context into the human's hands.
- **Guardrails (directly relevant to the prime directive):**
  - *Knowledge guardrail:* "look up, then answer"; ground every answer in approved sources; return **"unsure" → escalate** rather than invent. "Every hallucination is an AI that chose to guess instead of escalate." [10]
  - *Action guardrail:* refunds/cancellations run as **deterministic, audited, permission-gated processes with human confirmation above a threshold** — never an LLM free-text promise [10]. A widely-cited consumer complaint in 2026: AI chatbots promising refunds they couldn't authorize [10].
  - **Eclipse already enforces this in code:** `orders/lifecycle.mjs` blocks an `agent` actor from reaching `REFUNDED`/`CANCELLED`; `support/inbox.mjs` blocks any non-human from `sendReply`. The CX spec extends these, it does not invent them.

### A4. Proactive / anticipatory service

The highest-ROI move: convert the **order lifecycle into outreach triggers** before the customer worries.
- **Shipped** → "it's on the way" + tracking (closes the WISMO gap up front).
- **Delayed** (promised-by date passed, still pre-delivery) → proactive apology + new estimate (delay-without-notice is the top WISMO trigger [9]).
- **Delivered** → post-delivery check-in + care guidance + the natural review/CSAT moment [9].
- **Care guidance** → material-specific care (leather/wool/cotton) extends product life and reduces "damaged after wash" complaints.

---

## PART B — ECLIPSE CX SYSTEM SPEC

**Design goals:** extend the existing `src/support/inbox.mjs` (don't replace it); make proactive service a queue of *proposed* outreach; capture CSAT/NPS; enforce honesty + no-auto-refund guardrails in code; stay dependency-free, append-only, deterministic.

### B1. SLA & priority (triage)
Extend the intent classifier with a **priority + SLA** layer (deterministic, keyword + order-state driven):

| Priority | Triggers | Target first-response SLA | Routing |
|---|---|---|---|
| **P0 urgent** | payment failure, wrong/damaged item, chargeback language, "fraud", legal/health, social-public complaint | 2h | Always human; agent drafts *immediately*, flagged `escalate` |
| **P1 high** | return/refund request, delivery exception/late, sizing complaint on a *placed* order | 8h (same business day) | Agent drafts; human sends; refund/exchange stays human-gated |
| **P2 normal** | sizing pre-purchase, materials, restock, general | 24h | Agent drafts; human sends |

SLA fields are computed from `createdAt` + an injectable clock (reuse `src/lib/clock.mjs`); **SLA breach** = `now - createdAt > target && status !== 'sent'`. No timers/cron — breaches are computed on read (matches Eclipse's projection model).

### B2. Agent-draft → human-send (extend existing)
Keep the current `draftReplies` / `sendReply` flow. Additions:
1. **Context-rich drafts:** include order status/tracking (already partially done via `fillMacro`) **plus** a customer mini-profile (past sizes, prior returns, fit prefs) so the human inherits full context (research: +35–45% faster resolution [10]).
2. **Confidence + "unsure" path:** if intent === `general` OR the message references a claim the macro library can't ground, set `draft.confidence = 'low'` and `needsHuman = true` with a *no-promise* skeleton ("a member of the team will confirm the exact details and follow up") — implements the "escalate, don't guess" guardrail [10].
3. **Honesty guardrail (lint before send):** a pure function `assertHonest(draftText, order)` that **rejects** drafts containing unauthorized commitments — refund/“money back”/“we’ll pay” language, delivery-date promises tighter than the carrier estimate, "guaranteed", fake-scarcity or fabricated-review phrasing. Drafts failing the lint cannot be marked send-ready; the human sees the flagged reason. (Profanity-free is already a house rule.)

### B3. Proactive-service triggers (new module, queue-fed)
`src/support/proactive.mjs` scans the orders log and **proposes outreach drafts** into the support inbox (status `new`/`drafted`, `kind: 'proactive'`) — never auto-sends:

| Trigger (from `order.status` / dates) | Proposed message | Guardrail |
|---|---|---|
| `SHIPPED` and no prior shipped-notice | "On its way" + tracking | factual only |
| promised-by passed AND status ∈ {PAID, ROUTED, IN_FULFILLMENT, SHIPPED, IN_TRANSIT} | delay apology + honest new estimate | estimate must come from fulfillment data, not invented |
| `DELIVERED` and no prior check-in | check-in + care guidance + CSAT ask | one check-in per order |

Each proposal is idempotent (content-addressed id over `[orderNumber, trigger]` via `src/lib/hash.mjs`), so re-running a tick never duplicates outreach. Humans approve/send exactly like inbound replies.

### B4. CSAT / NPS capture
- **CSAT** attaches to a resolved support thread or a delivered order (1–5). **NPS** is a periodic 0–10 "how likely to recommend" tied to a customer.
- Stored append-only in `data/events.ndjson` as `csat_recorded` / `nps_recorded` events (consistent with Eclipse's event log); projections compute scores in `rebuild`.
- Capture is *requested* via the delivered-order proactive trigger (highest-satisfaction moment [9]); never fabricated, never incentivized dishonestly.

### B5. Escalation & delight
- **Escalation rule:** P0, low-confidence, repeat-contact (same email ≥3 open threads), or any complaint → `escalate: true`; surfaced first in `inboxSummary`; cannot be auto-closed by an agent.
- **Surprise & delight:** agent may emit a `delight_proposal` (note, free reship, expedited upgrade) with an **integer-minor-unit cost cap** and reason; it routes to the human queue and **requires human authorization** (mirrors Ritz/Zappos empowerment but keeps spend human-gated). No auto-spend, ever.

---

## PART C — SIZE & FIT ACCURACY (research + science)

### C1. Why fit is the franchise-defining problem
- **Fit/size = the #1 returns reason:** 53% (Prime AI) up to **70% (McKinsey)**; **77% of fashion returns are incorrect sizing** [7]. ASOS itself reported **70% of 2020 returns were ill-fitting**, "too big" the top reason then "too small" [11]. Poor sizing simultaneously destroys **trust, margin, and repeat-rate** — the exact things Eclipse is built on.
- Directional signal: men's returns skew **too small (~23%)**, women's skew **too large (~22%)** [7] — useful priors for asymmetric fit guidance.

### C2. The proven size-accuracy toolkit (what best-in-class actually does)
1. **Garment measurements, not just labels** — Everlane publishes *garment* dimensions so shoppers compare against a garment they own; ASOS shows garment measurements + the size the model wears, and tells shoppers to **rely on measurements over numeric size** [11]. (Eclipse's own macro already says "check the measurements, not just the label" — this spec makes that real.)
2. **Model-wears data** — ASOS shows model height + size worn on every shot ("model is 6'1, wears M") as instant fit calibration [11].
3. **Fit profile / "runs small–true–large"** — a per-product directional flag, the single most consumable fit cue.
4. **Recommendation algorithms** — True Fit normalizes catalog + size charts to a **universal size**, then blends **400M+ shopper fit declarations + billions in sales/returns outcomes** across a connected network to output **one** personalized size + the all-important nuance ("reflects what *similar* shoppers kept") [12]. Reviews alone fail at sizing because they're sparse & subjective [12].
5. **Returns-reason as a fit signal (the feedback loop)** — Zalando's **SizeFlags** uses customer return *reasons* ("too small"/"too large") as the input to flag mis-sized articles at scale (live across millions of articles, 14 countries) [13]; one merchant cut fit complaints **~70%** by fixing size charts after returns analysis flagged them [13].
6. **Body-measurement / virtual try-on** — AI body measurement from a phone claims **>91%** size accuracy on standard bodies using 30–44 measurement points [14]; **real-image** try-on reaches 85–90% vs **avatar** systems' 60–70% [14]. Reported returns reduction is **wide and unreliable: a realistic 20–30%**, with vendor claims up to 78% [14]. **Limits:** lighting/camera/screen variance, inaccurate self-scans, device support [14]. → **Treat try-on as an aspirational, optional layer; the deterministic measurement-based recommender is the dependable core.**

**Unit consistency** is foundational: mixing cm/in or body-vs-garment measurements silently corrupts every recommendation. Eclipse must store one canonical unit (mm or cm, integer) + dimension type, and convert at the edge — analogous to its money rule (integer minor units + currency).

---

## PART D — ECLIPSE SIZE & FIT + RETURNS-INTELLIGENCE SPEC

**Design goals:** a structured, deterministic, dependency-free fit data model; a pure size-recommendation function with confidence; a PDP-surfaced size guide; and a returns-reason feedback loop that updates fit guidance and flags suppliers/products — all computed from the append-only order/returns log.

### D1. Size/fit data model (attach to product/variant)
Canonical units: **all lengths in integer millimeters** (`unit: 'mm'`), mirroring the money rule (no floats, explicit unit). A measurement is body-vs-garment typed.

```
FitProfile (per product)                Measurement (per variant, per point)
  fit: 'runs_small'|'true'|'runs_large'   point: 'chest'|'waist'|'hip'|'length'|
  confidence: 'low'|'med'|'high'                 'shoulder'|'inseam'|'sleeve' ...
  basis: 'declared'|'returns_signal'      type: 'garment'|'body'
  modelWears: {                           valueMm: <int>           // canonical
    heightMm, sizeLabel, notes }          tolMm: <int>             // grade tolerance
  sizeSystem: 'alpha'|'numeric_eu'|...
  updatedAt, updatedBy(actor)           SizeChart (per product)
                                          rows: [{ sizeLabel, measurements: [Measurement] }]
```

- `modelWears` operationalizes ASOS-style "model is 6'1, wears M" [11].
- `fit` + `confidence` + `basis` make the directional cue auditable: was it *declared* by sourcing, or *learned* from the returns signal (D4)?
- Stored on the product entity (extends `src/model/product.mjs`); validated in `src/model/validate.mjs`; integers enforced via `src/lib/num.mjs#int`.

### D2. Deterministic size-recommendation function (pure, seedless)
`recommendSize(input) → { sizeLabel, confidence, rationale, alternative? }` — no RNG, no network; fully unit-testable.

**Inputs (any subset; more inputs ⇒ higher confidence):**
- `chart`: the product's `SizeChart` (garment measurements, mm).
- `fitProfile`: `runs_small|true|runs_large`.
- `customer`: one of
  - **body measurements** (chest/waist/hip/inseam, mm), or
  - **purchase history**: `[{ brandOrProduct, sizeLabel, outcome: 'kept'|'returned_small'|'returned_large' }]`.

**Algorithm (deterministic, explainable):**
1. **Measurement path (preferred):** for each size row, compute fit slack = `garmentMm − bodyMm` per point; score how many points fall within `[ease_min, ease_max]` for that garment type (ease bands are constants per category, e.g. tops vs bottoms). Pick the size maximizing in-band points; tie-break to the smaller (luxury fit) unless `fitProfile==='runs_small'`.
2. **Fit-profile adjustment:** shift the pick one size up if `runs_small`, down if `runs_large` (bounded to available sizes).
3. **History path (fallback / blend):** start from the customer's last **kept** size in a comparable category; nudge **+1** if their returns skew `returned_small`, **−1** if `returned_large` (mirrors SizeFlags reason-as-signal logic [13]).
4. **Confidence:** `high` if ≥2 independent inputs agree (e.g., measurements and history point to same size); `med` if one strong input; `low` if only `fitProfile` (then recommend label + a clear "between sizes? size up/down" note, never a false-precision promise). Confidence is surfaced verbatim — honest uncertainty, per the no-false-promise guardrail.
5. **Output:** primary size + `rationale` (human-readable: "Your chest 1040mm sits mid-range of M's 1010–1070mm; this style runs true.") + optional `alternative` when two sizes score within tolerance (the honest version of "you're between sizes").

### D3. Size guide surfaced on PDP
`src/storefront` copy/render gains a **size block** projected from the data model (only for `published` products — respects default-deny):
- garment-measurement table (converted to the viewer's unit at render, stored canonical);
- `fit` flag with plain-language line ("Runs small — consider sizing up");
- `modelWears` line;
- a "Find my size" affordance that calls `recommendSize` with whatever the shopper provides (measurements or "what size do you wear in X");
- an honest disclaimer when confidence is `low`.

### D4. Returns-reason feedback loop (the intelligence layer)
This is where Eclipse turns its **append-only order/returns log into a fit-correction engine** — the highest-leverage, most defensible piece.

**Capture (structure the return reason):** extend the order `returns: []` array (already on `src/model/order.mjs`) so each return carries a **coded reason** from a frozen enum:
`too_small | too_large | not_as_described | quality_defect | changed_mind | wrong_item | other`. Returns are logged as append-only events; the human-gated refund flow is unchanged.

**Compute (projection, in `rebuild`):** `src/restock`/a new `src/fit/returns-intel.mjs` aggregates per product and per supplier:
- `sizeReturnRate(product) = (too_small + too_large) / unitsSold`;
- directional skew = `sign(too_small − too_large)` and magnitude;
- `qualityReturnRate = quality_defect / unitsSold` (supplier signal).

**Act (propose, human-gated — never auto-mutate live copy):**
1. **Auto-suggest a fit-profile update:** if a product's size-return rate exceeds a threshold **and** is directionally skewed (e.g. ≥X% with `too_small` dominant over a min sample), propose flipping `fitProfile → runs_small` (or adjusting the chart), with `basis: 'returns_signal'`. The change is a **candidate in the human-gated queue** (`CandidateKind` extension), not a silent edit — consistent with "agents propose, humans approve."
2. **Flag the supplier:** feed `qualityReturnRate` and `sizeReturnRate` into `src/scoring/supplier-score.mjs` as a penalty (high size/quality returns ⇒ lower reliability), so bad-fit suppliers naturally lose ranking in sourcing — closing the loop from a single return all the way back to procurement [13].
3. **Improve guidance:** when a product flips to `runs_small/large`, the PDP size block and the `sizing` support macro update automatically from the same data — guidance gets *more honest over time*, which is exactly the trust mechanism the founder is betting on.

**Why human-gated, not automatic:** a returns spike can be supplier-batch variance or a single influencer's haul; the system *surfaces and recommends*, the operator *decides*. This honors the prime directive while still capturing the SizeFlags-style signal [13].

---

## PART E — METRICS TO TRACK

All computed from append-only logs (`data/events.ndjson`, orders, support inbox) as projections in `rebuild` — deterministic, no external analytics.

**Size & fit (the franchise metrics):**
- **Returns rate by reason** (overall + trend) — watch `too_small`/`too_large` share.
- **Size-return rate by product** = (too_small+too_large)/unitsSold; rank worst offenders.
- **Size-return rate by supplier** + **quality-return rate by supplier** → feeds supplier score.
- **Directional skew per product** (to set/validate the `runs_small/large` flag).
- **Recommendation confidence distribution** + (later) **recommendation→keep rate** when a rec was shown.

**Customer service:**
- **First-response SLA adherence** (% within P0/P1/P2 targets; breach count).
- **First-Contact Resolution (FCR)** proxy (threads resolved without re-open) [2].
- **CSAT** (avg + % ≥4/5; target 75–85% [2]) and **NPS** (target ≥32 baseline, aim B2C ≈49 [2]).
- **WISMO contact share** and its trend after proactive triggers ship (target ~−40% [9]).
- **Proactive coverage** = % of shipped/delayed/delivered orders that generated (human-sent) outreach.
- **Escalation rate** and **delight-spend** (count + integer-minor-unit total, all human-authorized).

**North-star linkage:** lower size-return rate → higher margin + trust; higher CSAT/NPS + lower WISMO → higher repeat-rate/LTV — the two levers the founder named, made measurable.

---

## Sources

1. Zappos customer service principles (empowerment, no scripts, Customer Loyalty Team; >75% repeat sales) — DigitalDefynd, Renascence, Digitopia, Simplify360. https://digitaldefynd.com/IQ/b2c-customer-service-case-studies/ ; https://www.renascence.io/journal/how-zappos-delivers-exceptional-customer-experience-cx ; https://simplify360.com/blog/zappos-customer-service-strategies/
2. CX impact on retention/LTV; NPS/CSAT/CES benchmarks; FCR; McKinsey CX uplift; Bain NPS-growth — Retently 2025 NPS Benchmark via Armatis; CustomerGauge; Contentsquare; Medallia; Khoros. https://www.armatis.com/en/2025/09/26/nps-ces-csat-which-customer-experience-metrics-should-you-choose/ ; https://customergauge.com/blog/nps-csat-ces ; https://contentsquare.com/guides/customer-retention/metrics/
5. Ritz-Carlton service standards ($2,000/guest empowerment, anticipate unspoken needs) — Renascence; Effective Retail Leader; Sprintzeal. https://www.renascence.io/journal/how-the-ritz-carlton-enhances-customer-experience-cx-through-personalized-service-and-luxury ; https://www.effectiveretailleader.com/effective-retail-leader/the-ritz-carlton-approach-to-customer-service-how-can-you-apply-those-principles-to-your-business
6. Luxury clienteling / concierge (Nordstrom Style Boards, BevyUp; relationship on purchase history) — Sailthru; Global Response. https://www.sailthru.com/nordstrom-tory-burch-luxury/ ; https://www.globalresponse.com/blog/luxury-clienteling-avoid-mistakes/
7. Apparel return rates 2025 (~20.8–24.4% US, ~26% global, up to 40%); fit = 53–77% of returns; $38B US / $816B global cost; 63% bracketing; men too-small / women too-large skew — Upcounting; Synctrack; Prime AI; Virtusize. https://www.upcounting.com/blog/average-ecommerce-return-rate ; https://synctrack.io/blog/ecommerce-return-rates/ ; https://www.prime-ai.com/en/media/clothing-return-rates-by-category-and-country-csf-a/ ; https://virtusize.com/articles/return-report-en
9. WISMO = 40–60% of inbound; 83% expect updates; proactive notifications −40% WISMO; ask-about-status → 3x negative reviews / 2.5x less repeat — Salesforce; Narvar; ShippyPro; WISMOlabs. https://www.salesforce.com/commerce/wismo/ ; https://www.blog.shippypro.com/en/wismo-what-it-means ; https://wismolabs.com/proactive-customer-service-and-risk-mitigation/
10. AI+human CX 2025–26 (55–70% real automation; 79% prefer humans / 84% think humans more accurate; escalation +35–45% faster with context; guardrails, "escalate don't guess"; deterministic/audited/threshold-gated refunds; Qualtrics 2026 "no benefit") — SurveyMonkey; Builts AI; Plivo; Kustomer; Talkative; Parloa; Richpanel; CNBC; Fini Labs. https://www.surveymonkey.com/curiosity/customer-service-statistics/ ; https://builts.ai/blog/ai-customer-service-trends-2026/ ; https://www.plivo.com/blog/human-in-the-loop-patterns-for-ai-customer-service-in-production/ ; https://gettalkative.com/info/ai-guardrails-for-customer-service ; https://www.richpanel.com/learn/ai-hallucination-defense ; https://www.cnbc.com/2026/04/01/ai-chatbot-customer-service-complaints-refunds.html ; https://www.usefini.com/guides/best-ai-platforms-refunds-returns-disputes-2026
11. Size guides / model-wears / garment measurements (Everlane garment dims; ASOS model height + size worn, "rely on measurements"; ASOS 70% of 2020 returns ill-fitting, too-big then too-small) — Everlane Help; ASOS Customer Care; MarketingScoop. https://support.everlane.com/en_us/what-size-am-i-BkLbhH6Ri ; https://www.asos.com/us/customer-care/product-stock/can-you-help-me-find-the-right-size/ ; https://www.marketingscoop.com/blog/does-asos-run-small/
12. True Fit recommendation engine (universal size normalization; 400M+ shopper declarations; billions in sales/returns; "what similar shoppers kept"; reviews fail at sizing) — TrueFit.com; TechCrunch. https://www.truefit.com/how-it-works ; https://techcrunch.com/2024/06/04/true-fit-generative-ai-feature-fit-hub/ ; https://www.truefit.com/sizing-by-reviews
13. Returns-reason feedback loop (Zalando SizeFlags using return reasons as fit signal, millions of articles / 14 countries; ~70% fit-complaint reduction after size-chart fixes) — arXiv SizeFlags 2106.03532; Zigpoll; Radial. https://arxiv.org/pdf/2106.03532 ; https://www.zigpoll.com/content/how-can-we-leverage-customer-feedback-data-from-our-ecommerce-platform-to-identify-common-pain-points-and-implement-proactive-measures-that-reduce-negative-product-reviews ; https://www.radial.com/eur/insights/tech-takes-on-e-commerces-218-billion-returns-problem
14. Virtual try-on / AI body measurement limits (>91% size accuracy claims; real-image 85–90% vs avatar 60–70%; realistic 20–30% returns reduction vs vendor 78%; lighting/scan/device limits) — Xlook; Fytted; BetterMirror; FashionTimes. https://xlook.app/blog/virtual-fashion-try-on-2025/ ; https://fytted.com/blog/virtual-try-on-apps-guide ; https://www.bettermirror.io/posts/best-virtual-try-on-apps-for-clothing-in-2025
