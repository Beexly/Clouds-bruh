# 11 — The Analytics "WHY" Engine for Eclipse

**Brief:** Design a buildable, dependency-free analytics brain for Eclipse (autonomous luxury commerce house) that explains *causality and decisions*, not vanity dashboards. Eclipse already has: an append-only `data/events.ndjson` (`{id,type,at,actor,payload}` via `src/catalog/events.mjs#makeEvent`), `src/ops/analytics.mjs` (queue funnel + revenue/AOV/top-sellers), and `src/trends/features.mjs` (EWMA, velocity/acceleration, median+MAD robust z-score). Money is integer minor units; the human-approval gate is sacred. This document specifies an **event taxonomy**, a **WHY engine** (funnel + segmentation + cohort/RFM + anomaly/root-cause), a **low-traffic experimentation module** (Bayesian/sequential/bandit, human-gated), and Eclipse's **North Star + metric tree**, all privacy-safe, deterministic, and testable.

> Eclipse is *low-traffic by design* (luxury, scarce, profanity-free, no fake urgency). That single fact drives most decisions below: classical fixed-horizon A/B tests are mostly **underpowered and dangerous** here; we lean Bayesian/sequential, weight qualitative signals, and treat segmentation + metric-tree decomposition (not significance theatre) as the core "why."

---

## Part 1 — The metrics science (what "the why" looks like)

### 1.1 The e-commerce metric tree (the spine of everything)

A **metric tree** is a logical hierarchy that maps how input metrics feed *focus metrics* that feed the **North Star**; each link is a defined relationship — **multiplicative, additive, or ratio** — so when an outcome moves you can walk the tree and ask "which factor moved?" [LeversLabs-intro][LeversLabs-rca]. The canonical e-commerce identity is multiplicative:

```
Revenue = Sessions × Conversion Rate × Average Order Value (AOV)
```

and Conversion Rate itself decomposes step-by-step along the funnel [graas-rca][LeversLabs-rca]:

```
Sessions → Product (PDP) views → Add-to-Cart → Begin Checkout → Purchase → Repeat Purchase
            CR_view·            CR_atc·         CR_checkout·     CR_pay
```

So the full driver tree is:

```
Revenue
├── Demand (Sessions)            ── by source / device / new-vs-returning
├── Conversion (CVR)             ── product of stage rates (multiplicative)
│   ├── view→ATC rate            (PDP/merchandising quality)
│   ├── ATC→checkout rate        (cart friction, shipping shock)
│   └── checkout→purchase rate   (payment/trust friction)  ← highest-friction step
└── AOV                          ── units/order × price/unit × mix
    ├── units per order
    ├── average unit price (tier mix)
    └── discount depth (we run none-to-light by brand policy)
```

**Why decomposition is "the why":** a 2% revenue drop can ripple up from a single leaf — e.g. customers "buying ~11% fewer items per order" — invisible at the top but obvious in the tree [graas-rca][LeversLabs-rca]. The tree turns "revenue is down" into a *specific testable hypothesis* ("ATC→checkout fell on mobile in category X").

**Caveat (the metric-tree trap):** the factors are *not* independent and their true elasticities are rarely equal to 1; e.g. **sessions and revenue-per-visitor are often negatively correlated** (discounts buy traffic but lower value) [Levchuk-trap][LeversLabs-rca]. Treat the tree as a *navigational map for hypotheses*, not a literal causal model. Always pair it with a guardrail (Part 4).

### 1.2 Stage conversion & funnel drop-off — and benchmarks

Industry baselines (use as *priors*, never targets — Eclipse is luxury, so expect the **low end**):

| Stage / metric | Broad e-com benchmark | Luxury reality |
|---|---|---|
| Overall conversion rate | ~1.9% all-industry; 2.5–3% typical; 5%+ elite [smartinsights][clickpost-atc] | Lower; long shelf life [wallstreet-str] |
| Add-to-cart rate | ~6% global avg; top stores 9.6%+ [clickpost-atc] | **Luxury ~3.2%** [clickpost-atc] |
| Cart abandonment | ~70–75% of carts abandoned [clickpost-atc] | Higher consideration |
| Checkout completion | ~60–70% who start finish [clickpost-atc] | Highest-friction step |
| Desktop vs mobile CVR | ~3.9% desktop vs ~1.8% mobile [convertcart] | Device gap is a key segment |

"The why" for the funnel = **where the biggest absolute drop-off is** and **which segment it concentrates in** (Part 3).

### 1.3 Beyond revenue — the metrics that actually matter

- **AOV drivers** — units/order × price/unit × tier mix (decompose, don't just report the number).
- **Contribution margin / unit economics** — revenue minus *variable* cost (COGS, payment fees, shipping, **returns**) per order. Unit economics are the revenue/cost of one order or one customer [finsi][ask-luca].
- **Gross margin after returns** — *critical*: failing to net out returns **overstates unit economics by 10–20%** — the gap between a "healthy 3:1" LTV:CAC and an actual 2.5:1 [eightx][ask-luca].
- **CAC / LTV / payback** — `CAC payback (months) = CAC ÷ (monthly revenue per customer × gross-margin%)`; target **< 6 months**; **LTV:CAC ≥ 3:1** means every \$1 of acquisition returns \$3 of gross profit [saras-cac][eightx][airtree]. (CAC has ~tripled since 2015 — \$24–28 → \$78–82 — so *retention* is the cheaper lever [eightx].)
- **Cohort retention** — group customers by acquisition month; track cumulative revenue/profit at 3/6/12/18/24 months to see whether newer cohorts behave worse and whether LTV trends up/down [eightx][finsi]. The *shape of the retention curve* (does it flatten?) is the leading indicator of a real business.
- **RFM** — Recency, Frequency, Monetary; quintile-score each 1–5 (recency reversed: recent = 5), concatenate → segments: **Champions (5-5-5)**, **Loyalists**, **At-Risk** (was high F/M, low R), **Dormant** [omniconvert-rfm][rejoiner-rfm][braze-rfm]. Drives who to nurture vs win back.
- **Inventory** — **Sell-through% = units sold ÷ units received** (healthy 60–80%; <40% overstock; luxury runs lower) [storeradar-str][lightspeed-str]; **Weeks of Cover = on-hand ÷ avg weekly units** [reactivesdp-woc][inventory-planner]; **GMROI = gross-margin\$ ÷ avg inventory at cost** (profit per \$ of inventory — best cross-category productivity metric) [toolio][wallstreet-str].

### 1.4 Leading vs lagging — and the North Star idea

- **Lagging** = outcomes you can't push directly (revenue, LTV, gross profit).
- **Leading** = inputs you *can* move this week (PDP views, ATC rate, email-capture, repeat-within-30-days) that *predict* the lagging outcome.
- A **North Star Metric (NSM)** is the single number that best captures *customer value delivered*, sits above the tree, and is a **leading indicator of revenue/retention** — explicitly *not* a vanity metric (sign-ups, pageviews) [uxcam-nsm][amplitude-nsm][productplan-nsm]. Amazon's NSM is "purchases per month"; the NSM has **input metrics that ladder up to it** [uxcam-nsm][hyperact-frameworks].

### 1.5 Frameworks worth stealing (pick, don't stack)

- **AARRR / Pirate metrics** (Acquisition→Activation→Retention→Referral→Revenue) — maps the customer journey, great for spotting *where users get stuck* [amplitude-aarrr][posthog-aarrr].
- **HEART** (Happiness, Engagement, Adoption, Retention, Task-success) — UX-quality counterweight to growth-only metrics [hyperact-frameworks].
- **North Star + inputs** — rallies the (here: agent) system around one outcome [amplitude-nsm].
- Verdict for Eclipse: **North Star + metric tree as the spine**, AARRR as the funnel lens, one HEART-style quality guardrail (review sentiment / return rate).

---

## Part 2 — Event taxonomy & instrumentation spec

### 2.1 Principles

1. **Object-action naming**, lowercase snake_case, past tense — the industry standard (`product_viewed`, `cart_item_added`); one event per real action, *source as a property* not a new event name [amplitude-taxonomy][optizent-taxonomy].
2. **Three data layers**: **events** (what happened), **event properties** (about the event), **entity/identity props** (about the actor/session) [amplitude-components][optizent-taxonomy].
3. **Append-only & deterministic** — reuse `makeEvent(type,payload,actor)`; events are immutable facts appended to `data/events.ndjson`; analytics are *projections* (matches Eclipse's "append-only truth" + `npm run rebuild` model).
4. **Privacy-safe by construction** — **never** store raw PII (email, name, address, IP, full UA). Identity = a **salted hash** `anon_id = shortHash([salt, rawId])`; store `email_hash` not email; store `device:"mobile|desktop|tablet"` not UA; coarse geo only (country). A `redactEvent()` gate runs before append and strips/hashes any disallowed key. (Aligns with CLAUDE.md "No secrets/PII in the repo".)
5. **Minimal-but-complete** — a tight starter set beats 200 noisy events; the #1 taxonomy mistake is too many inconsistently-named events [amplitude-taxonomy].

### 2.2 Canonical event envelope

Every event keeps the existing shape and adds analytics context in `payload`:

```jsonc
{
  "id":  "evt_…",            // shortHash([type,at,seq]) — already provided
  "type":"product_viewed",   // object_action, snake_case, past tense
  "at":  "2026-05-30T…Z",    // injectable clock
  "actor":"visitor",         // visitor | agent:<role> | human:operator | system
  "payload": {
    "anon_id":  "anon_9f…",  // salted hash of cookie/device id (NO raw id)
    "session_id":"ses_…",    // 30-min inactivity window; derivable if absent
    "device":   "mobile",    // enum only
    "source":   "organic",   // organic|direct|referral|email|social (last-touch tag)
    "country":  "US",        // coarse geo only
    "exp":      { "checkout_v2": "B" },   // experiment assignments (Part 5)
    // …event-specific properties below
  }
}
```

### 2.3 The canonical event list (storefront + ops)

**Storefront / demand funnel** (emitted by `public/` + `src/storefront`):

| Event `type` | When | Key payload properties (beyond envelope) |
|---|---|---|
| `session_started` | first hit of a session | `landing_path`, `referrer_source` |
| `page_viewed` | any page | `path`, `page_type` (home/plp/pdp/cart/checkout) |
| `product_list_viewed` | category/PLP render | `category`, `tier`, `result_count`, `sort` |
| `search_performed` | query run | `query_hash`, `result_count`, `zero_results`(bool) |
| `product_viewed` | PDP render | `product_id`, `category`, `tier`, `price_minor`, `currency`, `in_stock` |
| `product_media_viewed` | hero/gallery interaction | `product_id`, `media_role` |
| `cart_item_added` | ATC | `product_id`, `variant_id`, `qty`, `price_minor`, `tier` |
| `cart_item_removed` | remove | `product_id`, `variant_id`, `qty` |
| `cart_viewed` | cart page | `item_count`, `cart_value_minor` |
| `checkout_started` | begin checkout | `cart_value_minor`, `item_count` |
| `checkout_step_viewed` | each step | `step` (contact/shipping/pay), `step_index` |
| `purchase_completed` | order created | `order_id`, `revenue_minor`, `currency`, `item_count`, `tier_mix`, `email_hash`, `new_customer`(bool) |
| `review_submitted` | review left (post-approval) | `product_id`, `rating`, `verified`(bool) |
| `email_captured` | signup/waitlist | `email_hash`, `placement` (capsule waitlist / footer) |
| `waitlist_joined` | future-capsule interest | `product_id`/`capsule_id` |

**Ops / supply funnel** (already partly emitted — formalize names): `candidate_proposed`, `candidate_queued`, `candidate_approved`, `candidate_rejected`, `product_published`, `media_requested`, `media_approved`, `price_change_proposed`, `restock_proposed`. These let the WHY engine analyze the *internal* funnel (agent proposes → human approves → publish) exactly like the customer funnel.

**Lifecycle / fulfillment** (from `src/orders`): `order_paid`, `order_shipped`, `order_delivered`, `return_requested`, `order_returned`, `order_refunded` — feed return-rate, gross-margin-after-returns, and delivery SLA.

### 2.4 Identity & sessionization

- **anon_id** persists pre-purchase (hashed device/cookie id). On `purchase_completed`/`email_captured` we record `email_hash`, enabling **stitch** of anon→known *without storing the email*. Cohorts/RFM key on `email_hash`.
- **session_id** = events for one `anon_id` within a **30-minute inactivity window**; if a producer omits it, the projection derives it deterministically from `(anon_id, at)` gaps — so sessions are reproducible from the log alone.

### 2.5 Instrumentation data model (log → marts)

```
events.ndjson  (append-only facts)
   └─► projection: sessions[]      (group by anon_id + 30-min gap)
        └─► funnels[]              (ordered stage reach per session/segment)
        └─► cohorts[]              (by acquisition month, keyed on email_hash)
        └─► rfm[]                  (per email_hash)
        └─► metric_timeseries[]    (daily buckets per metric × segment) → feeds anomaly pass
```

All projections are **pure & rebuildable** (`npm run rebuild` replays the log), matching Eclipse's existing events→projection discipline.

---

## Part 3 — The "WHY engine" spec

A read-only module `src/analytics/why/` that turns the event log into *explanations*. Five analyses, each pure/deterministic/testable; output is JSON the ops console and agents read.

### 3.1 Funnel computation with stage drop-off — `funnel.mjs`

- Input: sessions projection + a stage order `[session_started, product_viewed, cart_item_added, checkout_started, purchase_completed]`.
- For each stage: **reached count**, **step conversion** (`reached_i / reached_{i-1}`), **overall conversion** (`reached_i / reached_0`), and **absolute drop-off** (`reached_{i-1} − reached_i`).
- Output ranks the **biggest-leak step** by absolute lost sessions (where a fix has the most revenue leverage [clickpost-atc]).

### 3.2 Segmentation — `segments.mjs`

- Recompute the funnel (and CVR/AOV) **sliced by** `category`, `tier`, `source`, `device`, `country`, `new_vs_returning`, and `cohort`.
- For each segment report **lift vs overall** (`segment_rate − overall_rate`) and **contribution to the change** (segment's share of the absolute movement).
- **Simpson's-paradox guard (built-in):** any aggregate verdict is *only emitted alongside its segment breakdown*, because an aggregate trend can **reverse when segmented** — segmenting + weighted averages is the standard antidote [mixpanel-simpson][analytics-toolkit-simpson]. The engine literally flags `"simpson_warning": true` when the sign of a segment-weighted rate disagrees with the aggregate.

### 3.3 Cohort retention — `cohorts.mjs`

- Group buyers by **acquisition month** (first `purchase_completed` per `email_hash`); build a **triangle** of cumulative revenue/profit and *repeat rate* at months 1/3/6/12 [eightx][finsi].
- Surface: retention-curve shape (flattening = healthy), and whether **newer cohorts** under/over-perform older ones (the LTV-trend question). Drives the CAC-payback and LTV:CAC readouts.

### 3.4 RFM — `rfm.mjs`

- Per `email_hash`: recency (days since last `purchase_completed`), frequency (order count), monetary (sum `revenue_minor`).
- **Quintile-score 1–5** (recency reversed); concatenate; map to **Champions / Loyalists / At-Risk / Dormant / New** [omniconvert-rfm][rejoiner-rfm][braze-rfm].
- Output feeds agent proposals (e.g., "At-Risk Champions detected → propose a *human-gated* VIP early-access invite to the next capsule") — never an automated send.

### 3.5 Anomaly + root-cause pass — `anomaly.mjs` (reuses `trends/features.mjs`)

This is the heart of "the why is automatic."

1. **Bucket** each metric (`overall CVR`, each stage CVR, `AOV`, `revenue`, `return_rate`, `ATC_rate`, sell-through) into a daily time series, **per segment**.
2. **Detect** regressions/wins with the *existing* robust math — **EWMA** for level, **velocity/acceleration** for trend, and **median+MAD `robustZ`** for spikes (robust to spiky low-traffic data — exactly why `features.mjs` chose MAD over mean/std) [features.mjs][arxiv-seasonal][victoriametrics-ad]. Flag when `|robustZ| ≥ z*` (default 3) or EWMA velocity breaches a band. (For known weekly seasonality, detect on **day-over-7-day residuals** so weekend dips don't false-alarm [arxiv-seasonal].)
3. **Localize the why** — when a top-line metric fires, re-run detection across all segment slices and **attribute the movement** to the segment(s) with the largest *contribution* (share of absolute change), emitting a sentence:
   > "checkout→purchase CVR fell -4.1σ — **concentrated in `device:mobile` + `category:outerwear`** (78% of the drop); ATC unaffected → likely a mobile payment-step regression."
4. **Guard against false positives at low N:** require a **minimum sample** per segment (e.g. ≥ 30 sessions/day) before alerting; below that, hold and aggregate (don't alarm on 3 sessions).

**Output of the WHY engine (single JSON):** `{ funnel, segments, cohorts, rfm, anomalies:[{metric, direction, severity, rootCause:{segment, contributionPct}, sentence}] }`. The ops console renders it; the alerting agent posts a *digest* (never auto-acts).

---

## Part 4 — Experimentation for a low-traffic luxury house

**The core problem:** Eclipse will not have millions of sessions. Classical fixed-horizon, fixed-α A/B tests are usually **underpowered**, and the temptation to "peek" inflates false positives badly — each peek adds Type-I error [nomadlin-peeking][johari-peeking]. So the module is built around methods that *learn from small samples and tolerate continuous monitoring*.

### 4.1 Methods (and when each wins)

- **Bayesian A/B (default).** Report **P(variant beats control)** and **expected loss** (the average regret if you pick the variant and you're wrong). Decide when `P(B>A) ≥ 0.95` **and** `expected_loss(B) < ε` (a region-of-practical-equivalence threshold). Speaks human ("we're 92% confident B is better") and needs less traffic [splitmetrics-bandit][craftup-lowtraffic]. **Caveat we encode:** Bayesian testing is *not fully immune to peeking* — stopping the instant `P>0.95` still biases effect sizes — so we also require a **minimum sample / minimum run-time** and report the *credible interval*, not just the point estimate [variance-bayesian].
- **Sequential / always-valid (for go/no-go).** Use **mSPRT-style always-valid p-values** so the operator may stop *whenever* without inflating error — designed exactly for continuous monitoring [johari-alwaysvalid][optimizely-msprt]. Lets us "call a winner early" safely when one appears [craftup-lowtraffic].
- **Multi-armed bandit (for low-stakes, short-lived choices).** Thompson-sampling allocation shifts traffic to the better arm in real time, **minimizing regret** — ideal for copy/hero-image/recommendation ordering where variants are short-lived and traffic is scarce [splitmetrics-bandit][vwo-bandit][kirro-bandit]. *Not* for decisions needing a precise effect size or a clean readout [splitmetrics-bandit].
- **Qualitative + quant.** When N is tiny, *weight* session-replay-style notes, review text sentiment, and waitlist signals alongside the numbers — explicitly recommended for low-traffic learning [craftup-lowtraffic].

### 4.2 The danger we design against

- **Underpowered tests** → never declare a loser from a tiny sample; the module computes the **minimum detectable effect** at current traffic and *refuses to start* a test it can't resolve in a sane window, instead recommending bandit or "ship-and-monitor."
- **Peeking** → only always-valid/Bayesian readouts are exposed; fixed-horizon p-values are never shown mid-flight [nomadlin-peeking][johari-peeking].
- **Goodhart / gaming** → every experiment carries a **guardrail metric** (counter-metric): optimizing checkout CVR must not raise `return_rate` or drop `review_rating`; "when a measure becomes a target it ceases to be a good measure" [goodhart-kpitree][siftfeed-guardrail].

### 4.3 Module shape (`src/analytics/experiments/`) — human-gated, never auto-changes the store

Mirrors Eclipse's existing **"propose → human approves → act"** integration pattern:

```
designExperiment(hypothesis, metric, guardrail, arms) → experiment candidate (status: proposed)
   → assignment is deterministic: variant = hashBucket(anon_id, exp_key)   // seeded, no Math.random
   → events carry payload.exp = { <exp_key>: "<arm>" }                     // already in envelope
   → readExperiment(exp_key) → { perArm: {n, conversions, rate}, pBeatsControl,
                                  expectedLoss, credibleInterval, guardrail, recommendation,
                                  minDetectableEffect, underpowered:bool }
```

- **Rollout is a deliberate human action.** The agent may *propose* "make B the default" as a `price_change`/copy candidate into the existing **review queue**; it can never flip the live store itself — identical to the Stripe "going live is a separate operator action, never automate it" rule. The bandit may *reallocate display traffic among already-approved variants* but cannot introduce un-approved content.
- **Deterministic & testable:** bucketing uses `src/lib/hash.mjs` + seeded `rng.mjs`; given a fixed event log the readout is reproducible (fixturable in `node:test`).

---

## Part 5 — Eclipse's North Star + metric tree + ops surfacing

### 5.1 Proposed North Star Metric

> **NSM: Net Realized Customer Value — "trailing-90-day gross profit from delivered, return-adjusted orders" (integer minor units).**
> Said simply for the team: **return-adjusted purchases per period and the margin they carry.**

Why this one:
- It is **customer-value-true and revenue-leading** (a good NSM reflects delivered value and predicts revenue/retention) [amplitude-nsm][uxcam-nsm], and like Amazon's "purchases per month" it sits at the funnel's end so improving discovery/PDP/checkout all push it [uxcam-nsm].
- It is **profit- and return-aware**, so it can't be gamed by discount-driven volume or by orders that get returned — directly defusing the "returns overstate unit economics by 10–20%" trap and Goodhart gaming [eightx][goodhart-kpitree]. It's expressed in **integer minor units**, matching Eclipse's money rule.
- A simpler **leading proxy** for weekly steering (since profit lags): **`approved_purchases` × `repeat-within-90-days rate`** — value-laden, fast-moving, vanity-proof [productplan-nsm].

### 5.2 The Eclipse metric tree (inputs ladder up to the NSM)

```
NORTH STAR: Net Realized Customer Value (trailing-90d, return-adjusted gross profit)
│
├── DEMAND (leading) ───────────────  Qualified sessions
│     ├── sessions by source/device          [page_viewed, session_started]
│     └── PDP views (intent)                 [product_viewed]
│
├── CONVERSION (leading, multiplicative) ──  Purchase CVR = Π(stage rates)
│     ├── view→ATC rate                       [product_viewed → cart_item_added]
│     ├── ATC→checkout rate                   [cart_item_added → checkout_started]
│     └── checkout→purchase rate (highest friction) [checkout_started → purchase_completed]
│
├── ORDER VALUE ────────────────────  AOV = units/order × avg unit price × tier mix
│     └── discount depth (policy: ~0)         [purchase_completed.tier_mix]
│
├── MARGIN QUALITY (the "net") ──────  Contribution margin after returns
│     ├── return rate                         [return_requested / purchase_completed]
│     └── gross-margin-after-returns          [order_returned, COGS]
│
├── RETENTION (lagging→leading) ─────  Cohort repeat rate @30/90d; LTV:CAC; CAC payback
│     ├── RFM mix (Champions/At-Risk share)   [rfm projection]
│     └── repeat-purchase rate                [email_hash 2nd purchase]
│
├── SUPPLY/INVENTORY ──────────────  Sell-through%, Weeks-of-Cover, GMROI
│     └── slow-mover flags                     [orders vs on-hand]
│
└── INTERNAL FUNNEL (the autonomous engine's own health)
      proposed → queued → approved → published → live   [candidate_* / product_published]
      approval rate, time-to-publish, mirror coverage   (already in ops/analytics.mjs)
```

**Guardrail/counter-metrics** (watched against every win): `return_rate`, `review_rating`, `out-of-stock exposure`, and **% un-approved content reaching public = must stay 0** (ties to the prime directive's default-deny projection) [siftfeed-guardrail][goodhart-kpitree].

### 5.3 What to surface in the ops console (`/ops/`)

Three tiers, "why-first":
1. **North Star card** — NSM trailing-90d with EWMA trend + the leading proxy; one line of *plain-language* change attribution from the anomaly pass.
2. **Metric-tree view** — the tree above with each node's current value, Δ vs prior, and a **red leaf** highlighting the node most responsible for any top-line move (decomposition-driven RCA) [LeversLabs-rca][graas-rca].
3. **Funnel + segment drill** — funnel bar with biggest-leak step flagged; click a step → segment table (device/category/tier/source/cohort) with lift and the **Simpson warning** badge.
4. **Anomaly digest & RFM/cohort panels** — the anomaly sentences, the cohort retention triangle, RFM segment counts with *proposed (human-gated) actions*.
5. **Experiments panel** — running experiments with `P(beats control)`, expected loss, credible interval, guardrail status, and `underpowered?` flag; "Promote variant" is a **review-queue proposal**, not a live toggle.

Everything is read-only over the projections; nothing here can change the live store or breach the human gate.

---

## Part 6 — Build plan (dependency-free, deterministic, testable)

| Module | Path | Reuses | Tests (node:test) |
|---|---|---|---|
| Event taxonomy + redactor | `src/analytics/events.mjs` | `catalog/events.mjs#makeEvent`, `lib/hash.mjs` | redaction strips PII; deterministic anon/email hashes; envelope validates |
| Sessionizer | `src/analytics/sessions.mjs` | clock | 30-min window grouping; derive session_id reproducibly |
| Funnel | `src/analytics/why/funnel.mjs` | sessions | stage rates + biggest-leak ranking on fixtures |
| Segments (+Simpson guard) | `src/analytics/why/segments.mjs` | funnel | reversal fixture triggers `simpson_warning` |
| Cohorts | `src/analytics/why/cohorts.mjs` | orders/email_hash | retention triangle on fixture |
| RFM | `src/analytics/why/rfm.mjs` | orders | quintile scoring; Champions/At-Risk labels |
| Anomaly + RCA | `src/analytics/why/anomaly.mjs` | **`trends/features.mjs`** (EWMA, robustZ, MAD) | seeded series → expected flags + root-cause segment |
| Experiments | `src/analytics/experiments/*.mjs` | `lib/hash.mjs`, `lib/rng.mjs` | deterministic bucketing; Bayesian readout; underpowered/guardrail flags |
| Ops view | `src/ops/analytics.mjs` (extend) | all above | snapshot shape stable |

Hard constraints honored: **Node built-ins + `node:test` only**, **ESM `.mjs`**, **integer minor money**, **append-only log + rebuildable projections**, **seeded RNG / content-addressed IDs / injectable clock**, **no PII/secrets**, and **the human-approval gate is never weakened** (experiments propose into the existing review queue; bandits only reorder already-approved content).

---

## Sources

- LeversLabs — *Designing Metric Trees* (input/output/NSM, multiplicative links): https://www.leverslabs.com/article/designing-metric-trees  `[LeversLabs-intro]` / *Root Cause Analysis with Metric Trees*: https://www.leverslabs.com/article/root-cause-analysis-with-metric-trees `[LeversLabs-rca]`
- Graas — *Discover the "why" in e-commerce with root cause analysis* (Revenue = Traffic×CVR×AOV; drill to leaf): https://www.graas.ai/blog/discover-the-why-in-ecommerce-with-root-cause-analysis `[graas-rca]`
- Levchuk — *The Metric Tree Trap* (elasticities ≠ 1; sessions vs RPV negatively correlated): https://medium.com/@paul.levchuk/the-metric-tree-trap-4280405fd35e `[Levchuk-trap]`
- ClickPost — *Add-to-Cart Conversion Rates by Industry 2025* (ATC ~6%, luxury ~3.2%, ~70–75% abandonment, checkout 60–70%): https://www.clickpost.ai/blog/add-to-cart-conversion-rates-by-industry `[clickpost-atc]`
- Smart Insights — *E-commerce conversion rate benchmarks 2025*: https://www.smartinsights.com/ecommerce/ecommerce-analytics/ecommerce-conversion-rates/ `[smartinsights]`
- ConvertCart — *Funnel conversion rate in ecommerce* (desktop ~3.9% vs mobile ~1.8%): https://www.convertcart.com/blog/funnel-conversion-rate-ecommerce `[convertcart]`
- Finsi — *E-commerce Unit Economics: metrics that matter*: https://www.finsi.ai/blog/ecommerce-unit-economics-guide/ `[finsi]`
- Ask-Luca — *Track E-commerce Unit Economics (CAC, LTV, true margins)*: https://ask-luca.com/blogs/best-way-to-track-e-commerce-unit-economics `[ask-luca]`
- Eightx — *LTV:CAC Ratio guide* (3:1; returns overstate 10–20%; CAC tripled): https://eightx.co/blog/ltv-cac-ratio-guide `[eightx]`
- Saras Analytics — *CAC Payback Period* (formula, <6 months): https://www.sarasanalytics.com/blog/cac-payback-period `[saras-cac]`
- Airtree — *CAC Payback & LTV/CAC benchmarks*: https://www.airtree.vc/open-source-vc/startup-metrics-cac-payback-and-ltv-cac-ratio `[airtree]`
- Omniconvert — *RFM Model / Analysis* (quintiles, recency reversed, segments): https://www.omniconvert.com/blog/rfm-analysis/ `[omniconvert-rfm]`
- Rejoiner — *RFM Analysis* (Champions 555, At-Risk): https://www.rejoiner.com/resources/rfm-analysis `[rejoiner-rfm]`
- Braze — *RFM Segmentation*: https://www.braze.com/resources/articles/rfm-segmentation `[braze-rfm]`
- StoreRadar — *Sell-Through Rate formula*: https://www.storeradar.com/formulas/sell-through-rate/ `[storeradar-str]`
- Lightspeed — *Sell-Through Rate* (60–80% healthy): https://www.lightspeedhq.com/blog/sell-through-rate/ `[lightspeed-str]`
- ReactiveSDP — *Weeks of Cover*: https://reactivesdp.com/blog/weeks-of-cover-retail-planning.html `[reactivesdp-woc]`
- Inventory Planner — *Weeks of Supply formula*: https://www.inventory-planner.com/weeks-of-supply/ `[inventory-planner]`
- Toolio — *Fundamental Retail Math Formulas* (GMROI): https://www.toolio.com/post/fundamental-retail-math-formulas `[toolio]`
- Wall Street Prep — *Sell-Through Rate (luxury long shelf-life)*: https://www.wallstreetprep.com/knowledge/sell-through-rate/ `[wallstreet-str]`
- Amplitude — *Every Product Needs a North Star Metric*: https://amplitude.com/blog/product-north-star-metric `[amplitude-nsm]`
- UXCam — *North Star Metric Framework* (Amazon = purchases/month; inputs ladder up): https://uxcam.com/blog/north-star-metric-framework/ `[uxcam-nsm]`
- ProductPlan — *Are North Star Metrics Leading You Astray?* (not a vanity metric): https://www.productplan.com/learn/north-star-metrics `[productplan-nsm]`
- Amplitude — *AARRR / Pirate Metrics*: https://amplitude.com/blog/pirate-metrics-framework `[amplitude-aarrr]`
- PostHog — *AARRR pirate funnel explained*: https://posthog.com/product-engineers/aarrr-pirate-funnel `[posthog-aarrr]`
- Hyperact — *AARRR vs HEART vs North Star*: https://www.hyperact.co.uk/blog/product-metrics-frameworks `[hyperact-frameworks]`
- Amplitude — *Event Taxonomy* (object-action naming, governance, mistakes): https://amplitude.com/explore/data/event-taxonomy `[amplitude-taxonomy]`
- Amplitude — *Components of Event Data* (events / event props / user props): https://amplitude.com/blog/event-data-components `[amplitude-components]`
- Optizent — *Designing Your Amplitude Event Taxonomy*: https://www.optizent.com/blog/a-practical-guide-to-designing-your-amplitude-event-taxonomy/ `[optizent-taxonomy]`
- Mixpanel — *Simpson's Paradox & the importance of segmenting data*: https://mixpanel.com/blog/avoiding-data-fallacies-and-biases-simpsons-paradox-and-the-importance-of-segmenting-data/ `[mixpanel-simpson]`
- Analytics-Toolkit — *Segmenting Data — the Simpson's Paradox*: https://blog.analytics-toolkit.com/2014/segmenting-data-web-analytics-simpsons-paradox/ `[analytics-toolkit-simpson]`
- NomadLin — *Consequences & Solutions of P-Value Peeking*: https://nomadlin.wordpress.com/2025/03/13/consequences-and-solutions-of-p-value-peeking-in-a-b-testing/ `[nomadlin-peeking]`
- Johari et al. — *Peeking at A/B Tests* (KDD 2017): http://library.usc.edu.ph/ACM/KKD%202017/pdfs/p1517.pdf `[johari-peeking]`
- Johari et al. — *Always Valid Inference* (arXiv 1512.04922; mSPRT): https://arxiv.org/pdf/1512.04922 `[johari-alwaysvalid]`
- Optimizely / Towards Data Science — *Wish Tackles Peeking with Always-Valid p-values* (mSPRT): https://towardsdatascience.com/wish-tackles-peeking-with-always-valid-p-values-8a0782ac9654/ `[optimizely-msprt]`
- Variance Explained — *Is Bayesian A/B Testing Immune to Peeking? Not Exactly* (expected loss; peeking caveat): http://varianceexplained.org/r/bayesian-ab-testing/ `[variance-bayesian]`
- SplitMetrics — *Multi-Armed Bandit A/B Testing* (regret; when to use): https://splitmetrics.com/blog/multi-armed-bandit-in-a-b-testing/ `[splitmetrics-bandit]`
- VWO — *Multi-Armed Bandit Testing*: https://vwo.com/blog/multi-armed-bandit-algorithm/ `[vwo-bandit]`
- Kirro — *Multi-armed bandit testing (decision framework)*: https://kirro.io/multi-armed-bandit-testing `[kirro-bandit]`
- CraftUp — *A/B Testing Low Traffic: Sequential Testing Guide 2025* (Bayesian/sequential/qual+quant for low traffic): https://craftuplearn.com/blog/ab-testing-low-traffic-sequential-testing-smart-baselines `[craftup-lowtraffic]`
- KPITree — *Goodhart's Law: Why Metrics Get Gamed*: https://kpitree.co/guides/frameworks/goodharts-law `[goodhart-kpitree]`
- SiftFeed — *North Star & Guardrail Metrics (preventing gaming)*: https://siftfeed.com/guides/north-star-guardrail-metrics `[siftfeed-guardrail]`
- arXiv 2008.09245 — *Anomaly Detection on Seasonal Metrics via Robust Decomposition*: https://arxiv.org/pdf/2008.09245 `[arxiv-seasonal]`
- VictoriaMetrics — *Anomaly Detection Handbook* (z-score/MAD, robustness): https://victoriametrics.com/blog/victoriametrics-anomaly-detection-handbook-chapter-1/ `[victoriametrics-ad]`
- Eclipse repo — `src/trends/features.mjs` (EWMA, velocity/acceleration, median+MAD `robustZ`): in-repo `[features.mjs]`
