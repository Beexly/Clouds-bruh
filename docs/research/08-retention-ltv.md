# 08 — Retention, Repeat Sales & Lifetime Value: Science → Eclipse System

**Scope.** The science of keeping customers and growing their value, translated into a concrete, buildable Eclipse subsystem: a retention engine (RFM + cohort + predicted-LTV + lapse detection), a lifecycle-flow engine (deterministic rules that *propose* messages/offers into the human-approval queue), a luxury membership ("the Inner Circle"), and a metrics module for the ops analytics console.

**Charter alignment.** Everything here respects Eclipse's prime directive — **agents propose and prepare; humans approve and publish** — and the honest charter: no fake scarcity, no fake reviews, no padded MSRPs, no manipulation. Lifecycle flows reuse the existing support/inbox + queue pattern: an agent drafts/proposes, a human sends/approves. No auto-send. No auto-discount below the margin floor. All money is integer minor units; all metrics are computed from the append-only `data/events.ndjson` + orders log.

---

## Part A — Retention Science & Data

### A1. Retention economics: why retention is the growth engine

**The Reichheld/Bain "loyalty effect."** Frederick Reichheld (Bain & Company, inventor of NPS) is the source of the most-cited retention statistic: *increasing customer retention rates by 5% increases profits by 25% to 95%*, depending on industry ([Reichheld/Bain via LinkedIn](https://www.linkedin.com/pulse/increasing-customer-retention-rates-5-increases-profits-beevers); [HBR — The Value of Keeping the Right Customers](https://hbr.org/2014/10/the-value-of-keeping-the-right-customers)). The mechanism: retained customers cost nothing to re-acquire, buy more over time, cost less to serve, are less price-sensitive, and refer others — so retention compounds while acquisition leaks.

**The leaky bucket.** a16z's framing: *"Without strong retention, increasing GTM spend simply adds water to a leaky bucket."* When projecting multi-year LTV/CAC, **retention is the single most important input** — it determines how many future purchase cycles you actually get to monetize ([a16z — Retention Is All You Need](https://a16z.com/ai-retention-benchmarks/); [a16z — Basics of Growth: Engagement & Retention](https://a16z.com/podcast/a16z-podcast-the-basics-of-growth-engagement-retention/)).

**LTV/CAC targets & payback.** a16z Growth top-level guidance: aim for **LTV:CAC ≈ 3:1**, with **CAC payback of 6–12 months** for SMB-style economics (9–18 months for enterprise) ([a16z startup metrics](https://easyvc.ai/blog/comprehensive-guide-to-a16z-startup-metrics-template/)). Below ~3:1 you are under-investing in margin or over-paying for acquisition; far above it you are probably under-investing in growth. For a luxury house with high AOV and high contribution margin, the lever that moves LTV most is **repeat-purchase rate**, not acquisition volume.

**Contribution margin, not revenue, funds retention.** LTV must be computed on *contribution margin* (price − COGS − fulfillment − payment fees − returns), in integer minor units. A discount-driven "retention" tactic that pushes a cohort below the margin floor destroys value even if it lifts repeat rate — which is exactly why Eclipse hard-caps offers at a margin floor (see C4).

### A2. Cohort retention curves & "the flattening"

Retention is measured by **cohort curves**: group customers by the period of their first purchase, then plot the % still "active" (purchased again in window) at month 1, 2, 3 … ([Lenny Rachitsky — What Is Good Retention](https://www.lennysnewsletter.com/p/what-is-good-retention-issue-29); [Olga Berezovsky — Measuring Cohort Retention](https://www.lennysnewsletter.com/p/measuring-cohort-retention)).

- **The defining property of healthy retention is that the curve *flattens* (plateaus) rather than decaying to zero.** A curve that flattens at a positive floor means you have a durable customer base; a curve that keeps sliding to zero means no real product-market fit ([Lenny — What Is Good Retention](https://caseyaccidental.com/what-is-good-retention)).
- **Where it flattens matters more than the M6 number** for transactional/ecommerce businesses, and these businesses *take longer than 6 months* to flatten because purchase cycles are long ([Lenny — What Is Good Retention](https://www.lennysnewsletter.com/p/what-is-good-retention-issue-29)).
- **Benchmarks** (consumer): transactional products ~30% = good / ~50% = great at the plateau; social ~25% good / ~45% great ([Lenny / Casey Winters](https://caseyaccidental.com/what-is-good-retention)). Luxury/considered-purchase repeat rates run lower per-period but with very high AOV, so the economic value of each retained customer is large.
- **The "smiling" curve.** Great retention can *turn back up* — churned/dormant customers reactivate (new drops, re-engagement). a16z notes AI-native products show this; for commerce it appears as seasonal/drop-driven reactivation ([a16z](https://a16z.com/ai-retention-benchmarks/); [Lenny](https://www.lennysnewsletter.com/p/what-is-good-retention-issue-29)). Eclipse's drop cadence + winback is what bends the tail upward.
- **Cost per retained customer** (a16z's M3 idea adapted): track contribution margin per *retained* customer, not per acquired one — it reveals whether spend is creating durable buyers or tourists.

### A3. Repeat-purchase mechanics for considered/luxury goods

Luxury is **non-contractual and non-subscription** — no recurring billing, irregular inter-purchase intervals, "silent" churn (a customer never cancels; they just stop). This changes the playbook vs. SaaS:

- **The second-purchase inflection (the most important moment in the lifecycle).** After a first purchase the probability of returning is ~**20–30%** (commonly cited ~27%); once a customer makes a *second* purchase, probability of a third jumps to ~**54%** ([Conversational LLC](https://conversational.com/statistics-show-repeat-customers-spend-more-and-more-often-2/); [LoyaltyLion](https://help.loyaltylion.com/en/articles/4723586-customer-likelihood-to-repeat-purchase-data)). **Converting buyer #1 → buyer #2 is the highest-leverage retention act.**
- **Repeat customers are worth disproportionately more.** They spend ~**67%** more per order than first-timers (BIA); ~**65%** of revenue comes from existing customers; the **top 5% of customers generate ~35%** of ecommerce revenue ([Conversational LLC](https://conversational.com/statistics-show-repeat-customers-spend-more-and-more-often-2/)). Repeat-purchase rate benchmark across ecommerce is ~**25–30%** ([finsi.ai](https://www.finsi.ai/blog/repeat-purchase-rate-ecommerce/); [MobiLoud](https://www.mobiloud.com/blog/repeat-customer-rate-ecommerce)).
- **Three repeat modes** (design flows around them):
  1. **Replenishment** — consumables/care products deplete on a cycle; trigger before depletion (see C3 timing).
  2. **Expansion** — cross-sell the *taste-adjacent* piece (the boot to the jacket), upsell to a higher tier. This is where luxury lives.
  3. **Winback** — reactivate the lapsed before they're gone for good.
- **RFM segmentation** (Recency, Frequency, Monetary) is the canonical, computable model for non-contractual repeat behavior: score each customer 1–5 on each axis, concatenate to a code (555 = best, 111 = worst), group into named segments — **Champions, Loyal, Promising, At-Risk, Hibernating, Lost** ([CleverTap](https://clevertap.com/blog/rfm-analysis/); [Optimove](https://www.optimove.com/resources/learning-center/rfm-segmentation); [Rejoiner](https://www.rejoiner.com/resources/rfm-analysis)). RFM is the engine that decides *which flow a customer is eligible for*.
- **VIP / clienteling.** Top customers get human, personal treatment — a named contact, first access, private notes — not a bigger coupon. Luxury loyalty is **status, recognition, access, and experience**, not points-for-discounts ([Antavo](https://antavo.com/blog/luxury-fashion-loyalty-programs/); [Mastercard luxury loyalty guide](https://www.mastercardservices.com/en/advisors/consumer-engagement-loyalty-consulting/insights/luxury-retail-marketers-guide-customer)).

### A4. Lifecycle & CRM science (what actually lifts repeat rate)

**Flows >> campaigns.** Triggered lifecycle *flows* generate ~**41% of email revenue from ~5% of sends**, with revenue-per-recipient (RPR) ~**18–28× higher** than broadcast campaigns ([Klaviyo benchmarks](https://www.klaviyo.com/marketing-resources/ecommerce-benchmarks); [Klaviyo flow benchmarks](https://help.klaviyo.com/hc/en-us/articles/360033669452)). The canonical flows and their measured lift (for ~$100–200 AOV brands):

| Flow | Revenue per recipient | Notes |
|---|---|---|
| Abandoned **cart** | ~$3.65 avg; ~$7.01 at $100–200 AOV; elite ~$28.89 | Highest-RPR flow; intent is hot |
| **Welcome** series | ~$3.34 | Sets the relationship; first-purchase nudge |
| **Browse** abandonment | ~$1.95 | Lower intent than cart but scalable |
| **Winback** | ~$0.84 | Lower RPR but recovers otherwise-lost LTV at ~$0 CAC |

([Klaviyo / benchmark summaries above].) The "five core automations" capture ~**80% of automated revenue**.

**Channel trade-offs.** Email: ~20–22% open, ~1% campaign CTR, cheap, rich format → core narrative channel. SMS: >90% open, ~8% CTR, responses in seconds, but **expensive and consent-strict (TCPA)** → reserve for time-sensitive, opted-in moments (drop access, order status). Push: ~20% open, ~10% CTR, free, app-only ([MobiLoud — push vs SMS vs email](https://www.mobiloud.com/blog/push-notifications-vs-sms-vs-email); [Attentive orchestration](https://www.attentive.com/blog/sms-email-and-push-orchestration)). **Consistency across channels lifts engagement ~3×** ([Attentive]). Eclipse default channel = **email**; SMS only with explicit per-channel opt-in.

**Timing / cadence (the data):**
- **Replenishment:** trigger at ~**70–80% of the usage cycle** (e.g. day 21 of a 30-day supply); nudge 3–5 days before the SKU half-life, reminder 3–5 days later ([1800DTC](https://1800dtc.com/resources/replenishment-flows-repeat-orders-d2c-guide); [Klaviyo replenishment](https://www.klaviyo.com/blog/the-email-automation-all-consumable-goods-brands-need-that-many-dont-yet-use)).
- **Winback:** first touch at **~1.5× the average repurchase interval**; **60–90 days** for durables; **after ~120 days of silence, reactivation probability drops below ~5%** ([finsi.ai winback](https://www.finsi.ai/blog/win-back-email-campaign-guide/); [Hightouch](https://hightouch.com/blog/winback-campaign)). Standard sequence: soft reminder (day 0) → social proof / new arrival (day 7) → *small* incentive (day 14) → final (day 21).
- **SMS legal:** no marketing texts before 8am / after 9pm local; explicit prior written consent (unchecked box / form submit), separate from email; honor opt-out within 10 business days via any reasonable method ([ATTN Agency TCPA 2026](https://www.attnagency.com/blog/sms-marketing-compliance-2026); [ActiveProspect TCPA](https://activeprospect.com/blog/tcpa-text-messages/)).

**The peak-end rule.** People remember an experience by its emotional *peak* and its *end*, not its average ([Laws of UX — Peak-End Rule](https://lawsofux.com/peak-end-rule/); [Yotpo](https://www.yotpo.com/blog/the-peak-end-rule-in-cx/)). For commerce the controllable peak/end is **delivery + unboxing + aftercare** — an unexpected hand-written note, a care card, a flawless return. This is what drives the *next* purchase and the referral. Eclipse encodes this as a post-purchase "aftercare" flow and an honest referral ask placed *after* a delight moment (delivery), never before.

**Referral design (honest version).** Double-sided referrals (reward for both advocate and friend) work when margin supports it and word-of-mouth is real; advocates feel they're *gifting*, not just earning ([Voucherify](https://www.voucherify.io/blog/how-to-launch-a-double-sided-referral-program); [impact.com](https://impact.com/referral/7-proven-strategies-for-growth/)). **Guardrails:** reward only on a *real* conversion event, enforce minimum order value, cap rewards per advocate, verify the referred user is genuinely new ([Voucherify]). **Dark versions to avoid** (flagged in C7).

### A5. Personalization & taste graphs (without creepiness)

- **Recommendation families:** *collaborative filtering* (people like you also bought X), *content-based* (this piece shares attributes — silhouette, material, palette — with what you bought), and *taste profiles* (an explicit, customer-stated style). For a single-house catalog (one brand, modest SKU count), **content-based + a simple item-affinity ("bought together") graph** outperform heavy collaborative filtering and are dependency-free to compute.
- **Personalization drives retention** by raising relevance — but only when it doesn't feel like surveillance. **Creepiness = using data the customer didn't knowingly give, or never opted into** ([CX Dive](https://www.customerexperiencedive.com/news/effective-creepy-businesses-personalization-privacy-trust/714485/); [Usercentrics](https://usercentrics.com/knowledge-hub/hyper-personalization-vs-privacy-boundaries/)).
- **Zero-party data is the luxury-safe answer:** information the customer *knowingly and willingly* provides (style quiz, size, preferences, wishlist) in exchange for clearly better service ([Contentful](https://www.contentful.com/blog/raise-first-party-data-zero-party-data-personalization/); [DestinationCRM](https://www.destinationcrm.com/Articles/Editorial/Magazine-Features/Zero-Party-Data-Personalization-and-Privacy-Can-Coexist-141000.aspx)). Plus first-party behavior (their own orders/views). **Never third-party data.**
- **Transparency rule (the "Because you watched…" principle):** always show *why* something is recommended ("Pairs with the [piece] you bought"). Personalization should feel *logical, not magical* ([CX Dive]). Eclipse stores only zero-party + first-party signals, attaches a human-readable `reason` to every recommendation, and lets customers see/edit their taste profile.

### A6. Metrics & instrumentation (the science of measurement)

- **Repeat-purchase rate** = customers with ≥2 orders ÷ customers with ≥1 order (window-bounded).
- **Cohort retention** = for cohort *c* (first-order month), % who placed an order in month *m* after.
- **RFM** = quintile (or threshold) scores on recency/frequency/monetary → segment.
- **Predicted LTV** (non-contractual): the academically standard approach is **BG/NBD** (purchase frequency + dropout) **× Gamma-Gamma** (monetary value per transaction) → expected future transactions and value ([Bruce Hardie / Fader — Gamma-Gamma note](https://www.brucehardie.com/notes/025/gamma_gamma.pdf); [Fader/Hardie — "Counting Your Customers" the Easy Way / BG-NBD](https://pubsonline.informs.org/doi/10.1287/mksc.1040.0098); [CLVTools BG/NBD](https://www.clvtools.com/reference/gg.html)). BG/NBD's simplifying assumption (a customer can only churn *right after* a purchase) makes it computationally light — feasible in dependency-free Node. **For v1, Eclipse ships a transparent heuristic pLTV** (observed margin × expected repeats from a smoothed repeat-rate, decayed by lapse risk) and documents BG/NBD as the v2 upgrade — honest about model maturity.
- **Lapse / churn signal** (non-contractual): a customer is "lapsing" when *time since last order > k × their (or the cohort's) median inter-purchase interval*. This is the trigger boundary for winback.
- **NPS — use with skepticism.** Academic work finds NPS is **not reliably associated with sales growth or margin**, sets arbitrary cutoffs, and discards information; satisfaction/liking often predict better, and **observed repeat behavior beats stated intent** ([ScienceDirect — NPS vs alternatives](https://www.sciencedirect.com/science/article/abs/pii/S0148296322003897); [Sage — NPS construct & predictive validity](https://journals.sagepub.com/doi/10.1177/14707853231213274)). **Eclipse's primary loyalty metric is behavioral (repeat rate, cohort retention, pLTV); post-delivery satisfaction is a secondary signal, not the headline.**

---

## Part B — The Eclipse Retention Engine (spec)

**Goal.** Derive customer-level retention state (RFM segment, cohort, pLTV, lapse risk) purely from the append-only order/event log. Read-only and deterministic — same logs in, same numbers out. No external calls. Feeds both the lifecycle-flow engine (eligibility) and the metrics module (reporting).

### B1. Data sources & the customer identity

- **Inputs (read-only):** `paths.orders` (realized orders → the money truth), `paths.events` (`data/events.ndjson` → views/adds/quiz/consent signals), and the catalog (for product attributes used by recommendations).
- **Identity:** `customerKey = lowercase(trim(email))`. Orders already carry `customer.email`; events get an optional `payload.email`/`customerKey`. A `customer.{anonId}` is supported for pre-identification browse events, reconciled to email on first order.
- **Realized orders only** for monetary/frequency (mirror existing analytics: exclude `intake`, `cancelled`, `refunded`; **subtract** returns/refunds from monetary so we never inflate value).
- **Money:** integer minor units throughout; never float. `monetaryMinor` and `pLtvMinor` are integers.

### B2. New event types (append-only, additive — no schema migration)

Emitted via existing `makeEvent(type, payload, actor)` → `appendEvent`. All additive; old consumers ignore unknown types.

```
customer.identified        { customerKey, email, firstOrderId }
customer.consent.updated   { customerKey, channel:'email'|'sms', state:'opted_in'|'opted_out', source, at }
taste.profile.updated      { customerKey, prefs:{ categories, palettes, sizes, materials }, source:'quiz'|'inferred' }
product.viewed             { customerKey|anonId, productId, at }     // browse signal
cart.updated               { customerKey|anonId, items:[...], at }    // cart/abandon signal
rfm.snapshot               { runId, computedAt, summary }             // audit of an engine run
ltv.snapshot               { runId, computedAt, summary }
membership.tier.changed     { customerKey, from, to, reason }          // behavioral, see Part D
flow.proposed              { flowId, customerKey, candidateId }        // links a flow to its queue item
```

Consent is **event-sourced** (latest `consent.updated` per channel wins) so opt-out is permanent and auditable — a hard precondition the flow engine checks before proposing any message.

### B3. `src/retention/profiles.mjs` — build customer profiles

`buildProfiles(paths, { asOf } )` → replays orders + events into one record per `customerKey`:

```
{
  customerKey, email,
  firstOrderAt, lastOrderAt,
  orderCount, unitsTotal,
  monetaryMinor,                 // sum of contribution-margin-eligible net revenue, integer
  aovMinor,
  interPurchaseDays: [...],      // gaps between successive orders
  medianInterPurchaseDays,       // null if <2 orders
  daysSinceLastOrder,            // (asOf - lastOrderAt)
  categoriesBought: { ... },     // for recommendations
  consent: { email:'opted_in'|'opted_out'|'unknown', sms:... },
  taste: { categories, palettes, sizes, materials } | null,
  lastViewedProductId, openCartItems
}
```

`asOf` is injected (defaults to `now()` from the existing clock) → deterministic + testable under a frozen clock.

### B4. `src/retention/rfm.mjs` — RFM scoring & segments

- **Recency** = `daysSinceLastOrder` (lower = better). **Frequency** = `orderCount`. **Monetary** = `monetaryMinor`.
- **Scoring:** quintiles across the active population when n is large enough; **fixed, documented thresholds** as a deterministic fallback for small n (early Eclipse) so scores are stable and explainable, not noisy. Each axis → 1–5; code = `"" + R + F + M`.
- **Segments** (mapped from RFM bands, names per industry standard):

| Segment | Rule (sketch) | Intent |
|---|---|---|
| **Champions** | R≥4, F≥4, M≥4 | Inner Circle, first access |
| **Loyal** | F≥4, R≥3 | Nurture, early drops |
| **Promising** | R≥4, F≤2 | Drive the 2nd purchase |
| **New** | orderCount==1, R==5 | Welcome + 2nd-purchase nudge |
| **At-Risk** | R≤2, F≥3 | Winback (was valuable) |
| **Hibernating** | R≤2, F≤2 | Gentle winback |
| **Lost** | R==1, long lapse | Final winback, then rest |

Output: `{ customerKey, r, f, m, code, segment }` per customer + a population summary. Segment ≠ public tier (the Inner Circle is behavioral and partly invisible — see Part D, "hidden tiers").

### B5. `src/retention/ltv.mjs` — predicted LTV (transparent v1; BG/NBD-ready)

**v1 heuristic (ships now, fully explainable, integer math):**
```
expectedRepeats   = smoothedRepeatRate(segment|cohort)   // 0..n, from observed data
retentionFactor   = clamp(1 - lapseRisk, 0..1)           // decays value as lapse grows
predictedFutureMinor = round(aovMinor * expectedRepeats * retentionFactor)
pLtvMinor         = monetaryMinor + predictedFutureMinor  // historic + predicted, integer
```
Every term is logged so an operator can see *why* a customer's pLTV is what it is. **v2 upgrade (documented, not blocking):** replace the heuristic with **BG/NBD** (expected future transactions from recency/frequency/T) **× Gamma-Gamma** (expected monetary value), implemented from the closed-form equations in the Fader/Hardie notes — still dependency-free Node, just more math ([Bruce Hardie — Gamma-Gamma](https://www.brucehardie.com/notes/025/gamma_gamma.pdf); [BG-NBD / "Counting Your Customers"](https://pubsonline.informs.org/doi/10.1287/mksc.1040.0098)). Honest labeling: surface pLTV as **"estimated"** with the method name.

### B6. `src/retention/lapse.mjs` — lapse / churn signal

Non-contractual lapse (no cancel event, so infer from silence):
```
expectedCycle = medianInterPurchaseDays ?? cohortMedian ?? categoryDefaultDays
lapseRisk     = clamp(daysSinceLastOrder / (k * expectedCycle), 0..1)   // k≈1.5
state         = active            if daysSinceLastOrder <= expectedCycle
              | due               if <= k*expectedCycle
              | lapsing           if <= dormantWindow (e.g. 120d)
              | dormant           otherwise
```
`120 days → reactivation < 5%` ([finsi.ai]) sets the `dormant` boundary; flows escalate by state (see C3). All thresholds are config constants with cited defaults.

### B7. `src/retention/segments.mjs` — the public API

`computeRetention(paths, { asOf })` → `{ profiles, rfm, ltv, lapse, summary }` in one deterministic pass. This is the single entry point the flow engine, the membership module, and the metrics module all consume. Emits an optional `rfm.snapshot` / `ltv.snapshot` audit event (off by default in tests to keep the log clean).

---

## Part C — The Lifecycle-Flow Engine (spec)

**Core principle (non-negotiable).** Flows are **deterministic rules that PROPOSE** a message/offer **into the human-approval queue**. They **never auto-send and never auto-discount below the margin floor.** This is the support/inbox pattern (agent drafts → human sends) generalized to outbound lifecycle. Reuse, don't reinvent: candidates flow through the *exact same* `transitions.mjs` human gate (an `agent` actor can never reach `approved`/`published`).

### C1. Where it plugs in

- **New `CandidateKind.LIFECYCLE`** (additive enum) so lifecycle proposals ride the existing queue, board, and review CLI. Or, mirror the support inbox with a dedicated `paths.outbox` of drafted messages whose **send is human-gated** exactly like `sendReply`. Recommended: **a drafted "outbox"** (closest to support/inbox, lowest blast radius) plus queue candidates for anything carrying an *offer/discount* (so offers get the full gate + margin check). Messages with no offer → outbox draft; messages with an offer → queue candidate.
- **New role `lifecycle` agent** in the registry/runtime; runs on the existing `npm run tick` cadence and `npm run agent lifecycle`.

### C2. Flow definition shape (data, not code)

Each flow is a declarative object → trivially testable, no control-flow sprawl:
```
{
  id: 'welcome' | 'second_purchase' | 'browse_abandon' | 'cart_abandon'
    | 'post_purchase' | 'replenishment' | 'winback' | 'vip_early_access',
  trigger:    (profile, ctx) => boolean,     // pure, deterministic
  audience:   { segments?: [...], states?: [...], consentChannel: 'email'|'sms' },
  steps: [ { offsetDays, channel, template, offer? } ],
  offerPolicy:{ maxDiscountPct, marginFloorPct, neverStack: true } | null,
  cooldownDays, maxPerCustomerPerWindow      // anti-fatigue guards
}
```

### C3. The canonical Eclipse flows (rules + cited timing)

| Flow | Trigger (from retention engine) | Channel(s) | Offer? | Why / data |
|---|---|---|---|---|
| **Welcome** | `customer.identified`, no 2nd order | email | none | Sets relationship; RPR ~$3.34 ([Klaviyo]) |
| **Second-purchase** (flagship) | `orderCount==1` & `due` | email (+SMS if opted) | none/credit only at floor | 27%→54% inflection — highest leverage ([Conversational LLC]) |
| **Browse abandon** | `product.viewed`, no add, no purchase | email | none | RPR ~$1.95 ([Klaviyo]) |
| **Cart abandon** | `cart.updated`, no order in N hrs | email (+SMS if opted) | none | Highest-RPR flow ~$7.01 ([Klaviyo]) |
| **Post-purchase / aftercare** | order `delivered` | email | none | Peak-end: care + delight → next buy & referral ([Laws of UX]) |
| **Replenishment** | care/consumable SKU at ~70–80% cycle | email | none | Trigger before depletion, day ~21/30 ([1800DTC]) |
| **Winback** | `lapsing` (≈1.5× interval / 60–90d) | email | *small*, ≤floor, last step only | <120d or reactivation <5% ([finsi.ai]) |
| **VIP early-access** | `Champions`/Inner Circle + upcoming drop | email/SMS opted | access, not discount | Luxury = access > points ([Antavo]) |

Every proposal carries: target `customerKey`, flow id + step, rendered draft (brand-voiced, profanity-free, reuses the macro-fill pattern), the **trigger reason** (for the operator), and — if an offer — the computed margin check.

### C4. The offer / margin guard (hard rule)

Before any offer-bearing proposal is created:
```
finalMinor = unitPriceMinor - discountMinor
marginMinor = finalMinor - cogsMinor - fulfillmentMinor - feesMinor
assert discountPct <= flow.offerPolicy.maxDiscountPct
assert marginMinor >= round(finalMinor * marginFloorPct)   // margin floor
// else: do not propose an offer — propose the no-offer variant or skip
```
Reuses the existing `pricing-margin` scoring discipline. **Agents can never propose past the floor; humans approve what survives it.** No stacking. Integer minor units only. Honest charter: offers are real, never anchored against a padded MSRP.

### C5. The human gate (reuse, verbatim semantics)

- **No-offer message →** drafted into the outbox as `status:'drafted'`; a **human sends** (mirror `sendReply`; `actor.kind !== 'human'` throws).
- **Offer message →** enqueued as a `LIFECYCLE` candidate (`proposed → queued`); a **human approves** through the normal review actions; only then is the send drafted. The `transitions.mjs` invariant guarantees an agent can never approve/publish.
- **Consent + fatigue preconditions** checked at proposal time: skip if channel `opted_out`/`unknown`, if within `cooldownDays`, if over `maxPerCustomerPerWindow`, or (SMS) outside 8am–9pm local quiet hours ([ATTN Agency]).

### C6. `src/lifecycle/` modules

- `flows.mjs` — the declarative flow registry (data above).
- `engine.mjs` — `proposeForFlows(paths, { asOf })`: load retention profiles → for each flow, select eligible customers (trigger ∧ audience ∧ consent ∧ cooldown ∧ margin) → render drafts → write outbox draft or enqueue candidate → emit `flow.proposed`. Deterministic; idempotent via an idempotency key `flow:{id}:{step}:{customerKey}:{cycleBucket}` so re-running a tick never double-proposes.
- `templates.mjs` — brand-voiced, profanity-free copy with `{{first_name}}`, `{{piece}}`, `{{reason}}` fills (extends the support macro-fill approach).
- `outbox.mjs` — drafted-message store with the human-gated `sendMessage(paths, id, actor)` (agent throws), mirroring `support/inbox.mjs`.
- CLI: `npm run lifecycle [propose|outbox|send <id>]` and review of `LIFECYCLE` candidates via the existing `npm run review`.

### C7. Dark patterns — flagged, with the honest alternative

| Dark pattern | Why it's wrong | Eclipse honest alternative |
|---|---|---|
| **Fake scarcity / countdown timers** ("only 2 left!" when untrue) | Lies; violates charter | Show *real* stock state only (`low-stock` is already truthful in the model) |
| **Fake reviews / fabricated social proof** | Fraud | Only verified-purchase, opt-in testimonials; otherwise none |
| **Padded MSRP / "was $X"** anchoring | Deceptive reference price | Offers stated as plain credit/access; no fake "compare-at" |
| **Confirmshaming** ("No, I hate saving money") | Manipulative opt-out copy | Neutral, respectful decline language |
| **Roach-motel / hard opt-out** | Traps subscribers | One-click opt-out, honored permanently, any channel ([TCPA]) |
| **Referral self-dealing / spam incentives** | Fraud & inbox abuse | Reward only on real new-customer conversion, MOV minimum, per-advocate cap ([Voucherify]) |
| **Discount-as-default winback** | Trains customers to wait & erodes margin | No-offer winback first; *small* incentive only at the final step, above floor ([Hightouch]) |
| **Creepy personalization** (data they didn't give) | Surveillance feel, trust loss | Zero-party + first-party only; show the "why" on every rec ([CX Dive]) |
| **Auto-enroll / pre-checked consent** | Not real consent | Explicit opt-in, separate per channel ([TCPA]) |

---

## Part D — The Inner Circle (luxury membership design)

**Philosophy.** Luxury loyalty is **access, recognition, and experience — not points-for-discounts** ([Antavo](https://antavo.com/blog/luxury-fashion-loyalty-programs/); [Mastercard](https://www.mastercardservices.com/en/advisors/consumer-engagement-loyalty-consulting/insights/luxury-retail-marketers-guide-customer); [Smile.io — experiential rewards](https://blog.smile.io/5-examples-of-experiential-rewards-for-luxury-brands/)). The Inner Circle rewards Eclipse's best customers with things money alone can't queue-jump: **first access to drops, clienteling, early previews, private notes** — margin-safe by design (access costs nothing per unit; it doesn't discount the product).

### D1. Tiers (mostly behavioral / "hidden")

Luxury houses use **hidden tiers** — operator-defined bands that grant perks without publicly ranking customers (avoids alienating everyone else) ([Antavo]). Eclipse tiers are **derived from the retention engine's RFM segment + pLTV**, recomputed each run, and changes are event-sourced (`membership.tier.changed`):

- **Guest** — default; honest welcome, no status theater.
- **Circle** (≈ Loyal/Promising with ≥2 orders) — early-drop email, first dibs windows, free returns.
- **Inner Circle** (≈ Champions / top pLTV) — named contact (clienteling), early previews, invitations, hand-written aftercare; *partly invisible* — recognized, not gamified.

No public points balance. No "spend $X to unlock" countdowns. Status is conferred, not sold.

### D2. Benefits ledger (honest, margin-safe)

- **Access:** early-access windows to drops/restocks (time, not price) — implemented as a pre-public visibility window, gated by tier, surfaced via the lifecycle `vip_early_access` flow.
- **Clienteling:** Inner Circle messages route to a human (the existing support/outbox human-gated send), with the customer's taste profile + order history attached so the note is personal and *true*.
- **Experiential / recognition:** previews, named greetings, priority support, thoughtful aftercare — none of which touch unit margin.
- **If/when credits exist:** modeled as integer-minor-unit store credit with an explicit expiry and a margin-floor check at redemption — *never* an open-ended points economy, and always human-approved.

### D3. Consent & honesty

Membership is **opt-in and transparent**: the customer can see their tier and benefits (or, for hidden tiers, simply *experiences* better service with nothing dishonest stated). Taste profile is editable; data used is zero-party + first-party only. No tier is ever used to *hide* a better price from a customer (no price discrimination dressed as a perk).

### D4. Modules

- `src/membership/tiers.mjs` — pure derivation `tierFor(profile, rfm, ltv)`; thresholds are documented constants.
- `src/membership/benefits.mjs` — declarative benefit map per tier (access windows, clienteling flag, credit policy).
- Recompute inside `computeRetention`; emit `membership.tier.changed` only on transitions. Early-access windows enforced in `storefront/projection.mjs`'s visibility logic (still default-deny; tier only *widens* who can see an *already-approved, in-stock* drop during its pre-public window — never bypasses the published/human-approved gate).

---

## Part E — The Metrics Module (ops analytics console)

**Goal.** Extend the existing read-only `src/ops/analytics.mjs` with a **retention/LTV panel** computed from the same append-only logs. Deterministic, integer money, no external calls. Surfaced at `/ops/`.

### E1. Exact metrics to compute (from the event/order log)

**Repeat & cohort**
- `repeatPurchaseRatePct` = customers(orders≥2) / customers(orders≥1).
- `secondPurchaseRatePct` = customers(orders≥2) / customers(orders≥1) — the **inflection KPI**; trend it over time.
- `cohortRetention` = matrix `[cohortMonth][monthsSince] → activePct`, plus a `flatteningMonth` estimate (first month where Δ < ε) and the **plateau floor %** (the number that actually matters).
- `repeatPurchaseRatePct` by cohort to watch whether newer cohorts retain better.

**Value**
- `aovMinor`, `revenuePerCustomerMinor`, `historicMonetaryMinor` (net of refunds), all integer.
- `predictedLtvMinor` per customer + distribution (median / p90); `topCustomersByPLtv`.
- `cacPaybackMonths` *if/when* acquisition cost is provided (else omitted — no fake inputs); `ltvToCacRatio` target 3:1 ([a16z]).
- `marginPerRetainedCustomerMinor` (a16z's "cost/value per retained customer" idea).

**Segmentation & risk**
- `rfmDistribution` = count + revenue share per segment (show the **top-5%-of-customers revenue share** — expect it concentrated, ~35% benchmark ([Conversational LLC])).
- `lapseFunnel` = counts in `active / due / lapsing / dormant`; `atRiskRevenueMinor` (monetary tied up in `lapsing`).
- `membershipMix` = customers per tier; Inner Circle revenue share.

**Lifecycle program health**
- `flowProposals` = proposed / approved / sent per flow (from `flow.proposed` + outbox/queue states) and **approval rate** (reuses the queue approval-economics pattern already in analytics).
- `consentMix` = email/SMS opted-in/out/unknown.
- Optional secondary: `satisfaction` from post-delivery survey — **labeled secondary**, never the headline (NPS critique, §A6).

### E2. Module & surfacing

- `src/ops/retention-analytics.mjs` — `retentionAnalytics(paths, { asOf })` returns the above; pure projection over `computeRetention` + orders/events. Mirrors the structure/altitude of `analytics.mjs`.
- `src/cli/analytics.mjs` extended (or a sibling `npm run analytics:retention`) to print it; `/ops/` analytics view renders the panel: cohort heatmap, RFM bars, lapse funnel, pLTV leaderboard, flow approval funnel.
- **Every number is reproducible** from `data/events.ndjson` + orders via `npm run rebuild`, preserving the append-only-truth invariant.

### E3. Test obligations (keep the suite green)

- Determinism: same logs + frozen clock → identical metrics (snapshot test).
- Invariant: lifecycle agent **cannot** push a candidate to `approved`/`published` (extend the existing transitions safety tests to `LIFECYCLE` kind).
- Margin floor: an offer below the floor is **never proposed** (property test, integer money).
- Consent: an `opted_out` customer is **never** targeted by any flow.
- Money: all monetary outputs are integers (no floats), refunds subtracted.

---

## Sources

- [Reichheld/Bain — 5% retention → 25–95% profit (LinkedIn summary)](https://www.linkedin.com/pulse/increasing-customer-retention-rates-5-increases-profits-beevers)
- [HBR — The Value of Keeping the Right Customers (Reichheld)](https://hbr.org/2014/10/the-value-of-keeping-the-right-customers)
- [a16z — Retention Is All You Need (leaky bucket, smiling curve, cost per retained customer)](https://a16z.com/ai-retention-benchmarks/)
- [a16z — The Basics of Growth: Engagement & Retention](https://a16z.com/podcast/a16z-podcast-the-basics-of-growth-engagement-retention/)
- [a16z startup metrics guide — LTV:CAC 3:1, CAC payback 6–12mo](https://easyvc.ai/blog/comprehensive-guide-to-a16z-startup-metrics-template/)
- [a16z — GMV Retention (marketplace retention)](https://a16z.com/gmv-retention-the-marketplace-metric-most-ignore/)
- [Lenny Rachitsky — What Is Good Retention (curve flattening, benchmarks)](https://www.lennysnewsletter.com/p/what-is-good-retention-issue-29)
- [Casey Winters / Lenny — What Is Good Retention (benchmark study)](https://caseyaccidental.com/what-is-good-retention)
- [Olga Berezovsky / Lenny — Measuring Cohort Retention](https://www.lennysnewsletter.com/p/measuring-cohort-retention)
- [CleverTap — RFM Analysis](https://clevertap.com/blog/rfm-analysis/)
- [Optimove — RFM Segmentation](https://www.optimove.com/resources/learning-center/rfm-segmentation)
- [Rejoiner — RFM Analysis (Champions/At-Risk/etc.)](https://www.rejoiner.com/resources/rfm-analysis)
- [Conversational LLC — repeat customers spend more (27%→54%, 67%, 65%, top-5%→35%)](https://conversational.com/statistics-show-repeat-customers-spend-more-and-more-often-2/)
- [LoyaltyLion — likelihood to repeat purchase data](https://help.loyaltylion.com/en/articles/4723586-customer-likelihood-to-repeat-purchase-data)
- [finsi.ai — Repeat Purchase Rate benchmarks (25–30%)](https://www.finsi.ai/blog/repeat-purchase-rate-ecommerce/)
- [MobiLoud — repeat customer rate benchmarks](https://www.mobiloud.com/blog/repeat-customer-rate-ecommerce)
- [Klaviyo — Ecommerce email/SMS benchmarks (flow RPR)](https://www.klaviyo.com/marketing-resources/ecommerce-benchmarks)
- [Klaviyo — Flow email benchmarks reference](https://help.klaviyo.com/hc/en-us/articles/360033669452)
- [Klaviyo — Replenishment flow for consumables](https://www.klaviyo.com/blog/the-email-automation-all-consumable-goods-brands-need-that-many-dont-yet-use)
- [1800DTC — Replenishment flows for repeat orders (70–80% cycle)](https://1800dtc.com/resources/replenishment-flows-repeat-orders-d2c-guide)
- [finsi.ai — Win-back timing (60–90 day window, <120d → <5%)](https://www.finsi.ai/blog/win-back-email-campaign-guide/)
- [Hightouch — Winback timing/targeting/discount trap](https://hightouch.com/blog/winback-campaign)
- [MobiLoud — Push vs SMS vs Email engagement](https://www.mobiloud.com/blog/push-notifications-vs-sms-vs-email)
- [Attentive — SMS/Email/Push orchestration for repeat purchases](https://www.attentive.com/blog/sms-email-and-push-orchestration)
- [ATTN Agency — SMS Marketing Compliance 2026 (TCPA, quiet hours)](https://www.attnagency.com/blog/sms-marketing-compliance-2026)
- [ActiveProspect — TCPA text message rules](https://activeprospect.com/blog/tcpa-text-messages/)
- [Laws of UX — Peak-End Rule](https://lawsofux.com/peak-end-rule/)
- [Yotpo — Peak-End Rule in CX](https://www.yotpo.com/blog/the-peak-end-rule-in-cx/)
- [Voucherify — Double-sided referral design & guardrails](https://www.voucherify.io/blog/how-to-launch-a-double-sided-referral-program)
- [impact.com — Referral program strategies](https://impact.com/referral/7-proven-strategies-for-growth/)
- [Antavo — Luxury Fashion Loyalty Programs (hidden tiers, access)](https://antavo.com/blog/luxury-fashion-loyalty-programs/)
- [Mastercard — Luxury Retail Marketer's Guide to Customer Loyalty](https://www.mastercardservices.com/en/advisors/consumer-engagement-loyalty-consulting/insights/luxury-retail-marketers-guide-customer)
- [Smile.io — Experiential rewards for luxury brands](https://blog.smile.io/5-examples-of-experiential-rewards-for-luxury-brands/)
- [CX Dive — Effective vs creepy personalization](https://www.customerexperiencedive.com/news/effective-creepy-businesses-personalization-privacy-trust/714485/)
- [Usercentrics — Hyper-personalization vs privacy](https://usercentrics.com/knowledge-hub/hyper-personalization-vs-privacy-boundaries/)
- [Contentful — First-party & zero-party data](https://www.contentful.com/blog/raise-first-party-data-zero-party-data-personalization/)
- [DestinationCRM — Zero-party data: personalization & privacy](https://www.destinationcrm.com/Articles/Editorial/Magazine-Features/Zero-Party-Data-Personalization-and-Privacy-Can-Coexist-141000.aspx)
- [Bruce Hardie / Fader — The Gamma-Gamma Model of Monetary Value](https://www.brucehardie.com/notes/025/gamma_gamma.pdf)
- [Fader & Hardie — "Counting Your Customers" the Easy Way (BG/NBD)](https://pubsonline.informs.org/doi/10.1287/mksc.1040.0098)
- [CLVTools — BG/NBD & Gamma-Gamma reference](https://www.clvtools.com/reference/gg.html)
- [ScienceDirect — NPS vs alternative calculation methods (predictive validity)](https://www.sciencedirect.com/science/article/abs/pii/S0148296322003897)
- [Sage — NPS construct & predictive validity assessment](https://journals.sagepub.com/doi/10.1177/14707853231213274)
