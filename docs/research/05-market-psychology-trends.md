# 05 — Market Teardown, Buying Psychology & Trend Detection

**For:** Eclipse (Galaxy Network) — autonomous luxury commerce house
**Prepared:** 2026-05-30
**Scope:** (1) Top-10 marketplace UX teardown, (2) buying psychology → ethical Eclipse tactics, (3) what/how people buy online (2025–2026), (4) an implementable, dependency-free trend-detection algorithm for the sourcing agent.

> **Eclipse guardrails applied throughout:** no fake scarcity, no fake reviews, no padded MSRPs, profanity-free voice. Every tactic below is the *honest* version. Where a mass-market mechanic relies on manipulation (Shein/Temu-style fake timers, spin-to-win, confirmshaming), it is flagged AVOID. The prime directive holds: **agents propose and prepare; humans approve and publish.**

---

## PART 1 — Marketplace / Mega-Retailer UX Teardown

The big marketplaces are conversion machines optimized over decades of A/B testing. Eclipse should steal the *mechanics* (search, recommendations, trust, checkout friction removal) but reject the *mass-market dressing* (clutter, banner spam, manipulative urgency) that is poison to a luxury brand. Luxury converts on restraint, editorial storytelling, imagery, and earned trust — not on noise.

### 1.1 Conversion-critical mechanics by retailer

| Retailer | Search / Autocomplete | Faceted Filtering | Product Cards | PDP Layout | Reviews / Social Proof | Recommendations | Cart / Checkout | Urgency / Scarcity | Trust Signals | Returns Messaging |
|---|---|---|---|---|---|---|---|---|---|---|
| **Amazon** | Instant autocomplete w/ category scoping, query suggestions, typo tolerance, search-as-you-type | Deep left-rail facets (brand, price, rating, Prime, features); applied-filter chips | Image + title + star rating + review count + price + Prime badge + "X bought in past month" | Above-fold: gallery, title, rating, price, **Buy Box**, delivery promise; below: A+ content, Q&A, reviews | Star avg + count + verified-purchase + ranked "helpful" reviews + photo reviews | **"Frequently bought together"** (bundle), "Customers also viewed/bought," "Sponsored" | 1-click buy, persistent cart, saved addresses/cards, Prime fast checkout | **Honest:** "X bought in past month," real low-stock ("Only 3 left"). **Some pressure** on deal timers | Verified Purchase, ratings distribution, A+ brand content, seller ratings | Prominent free returns window, "FREE Returns" label on card |
| **Walmart** | Autocomplete + dept scoping; strong grocery/pickup intent | Facets + pickup/delivery toggle, brand, price | Image + price + "save" + rollback price + pickup/shipping ETA | Gallery + price + add-to-cart + fulfillment options + specs + reviews | Star avg + count + structured review attributes | "Customers also considered," "Similar items," sponsored | Cart → pickup/delivery choice; guest checkout; Walmart Pay | Honest "rollback"/clearance labels; low-stock | Price-match history, ratings, "sold & shipped by" | Free 90-day returns messaging, in-store return option |
| **Shopify storefronts** | Theme/app-dependent (Search & Discovery app: autocomplete, synonyms, filters) | Merchant-config facets (tag/option/price/availability) | Highly themeable; image + title + price + variant swatches + badges | Theme-driven; typically gallery + variant pickers + ATC + trust badges + cross-sells | App-driven (Judge.me, Loox photo reviews, Yotpo) | "You may also like," recently viewed, bundle apps | **Shop Pay** = accelerated 1-tap, high-converting; cart drawer + upsell | App-driven (honest scarcity apps); easy to misuse — discipline required | Shop Pay trust, SSL, badges, policy pages | Configurable; best-in-class show policy on PDP |
| **Etsy** | Autocomplete w/ trending + category, long-tail handmade queries | Facets: price, item type, ships-from, custom, material; "Star Seller" | Image-forward + title + price + free-shipping flag + **"X people have this in cart"** + ratings | Big imagery + variations + personalization fields + shop story + reviews + policies | Shop + item reviews, photos, "Star Seller" badge, review-photo gallery | "You may also like," "Explore related," "More from this shop" | Cart per-shop; guest checkout; Etsy Payments/PayPal | **Honest urgency** ("In X carts," "Almost gone — only 2 left") tied to real data | Star Seller, reviews, shop age, "smoke-free studio" type detail | Per-shop policies surfaced on PDP; 100%-positive highlighting |
| **eBay** | Autocomplete + category; supports both auction & BIN intent | Facets: condition, price, buying format, item specifics, location, seller | Image + title + price + shipping + **"X sold"** + watchers + time-left (auctions) | Gallery + price/bid + Buy-It-Now + item specifics + seller card + Q&A | Seller feedback score/% + item reviews + "top rated seller" | "Similar sponsored items," "People who viewed also viewed" | Cart or immediate BIN; guest checkout; managed payments | **Honest:** "X watching," "X sold," real auction countdowns; **last chance** | Feedback %, Top Rated Seller, Money Back Guarantee badge | eBay Money Back Guarantee, per-listing returns terms |
| **Shein** | Autocomplete + image search + trend feeds | Heavy facets + endless scroll | Dense grid, low price, "trends," **#hot** flags | Gallery + size guide + fit reviews + bundle "Often bought with" | Volume reviews, fit photos, "true to size" sliders | "You may also like" infinite, outfit completion | Cart + coupon stacking; gamified | **AVOID:** persistent countdowns, "X people viewing," flash sales, low-stock pressure (often manipulative) | Volume of reviews, ratings | Returns shown but de-emphasized vs urgency |
| **Temu** | Autocomplete + aggressive trend surfacing | Facets + "lightning deals" rails | Dense + deep-discount anchors (often inflated reference price) | Gallery + "X sold" + bundles + "almost sold out" | High-volume reviews + photos | "More to love," constant cross-sell | Gamified cart, spin-wheels, coupons | **AVOID:** spin-to-win, fake countdowns, "127 people viewing," padded "was" prices, confirmshaming | Volume reviews, buyer-protection badge | Buyer protection / free returns pushed as acquisition hook |
| **Alibaba / AliExpress** | Autocomplete + image search; B2B (Alibaba) tiered | Facets: price, MOQ, supplier type, ships-from | Image + price + **"X sold"** + store rating + shipping | Gallery + SKU matrix + tiered/volume pricing + supplier card + reviews | Volume reviews, store ratings, "Choice" badges | "More to love," "ranking" lists, store recs | Cart + coupons; Trade Assurance (Alibaba) | "X sold," limited coupons; some inflated discounts | **Trade Assurance**, verified supplier, store age/rating | Buyer protection, dispute/refund flow surfaced |
| **Mercado Libre** | Strong autocomplete; dominant LATAM intent | Facets + "Full" (fast-ship) filter + installments filter | Image + price + **installments ("12x sin interés")** + free-ship + reviews + "MÁS VENDIDO" (best-seller) flag | Gallery + price + installments + Mercado Envíos ETA + Q&A + reviews | Star avg + count + Q&A; seller reputation (color/medal) | "Productos relacionados," "Quien vio esto compró" | Cart + Mercado Pago; installments first-class | Honest "MÁS VENDIDO"/"X vendidos"; stock counts | Seller reputation thermometer, MercadoPago protection | Free returns + buyer protection prominent |
| **Target** | Autocomplete + dept; pickup/Drive-Up intent | Facets + pickup/same-day toggle, brand, price | Clean image + price + RedCard/Circle savings + ratings + fulfillment | Gallery + price + fulfillment + specs + reviews + "highlights" | Ratings + structured reviews + Q&A | "You may also like," "Frequently bought together," "Similar items" | Cart → fulfillment choice; guest; Circle/RedCard | Honest deal/clearance + Circle offers; low-stock | Brand reputation, ratings, RedCard | Free 90-day returns, in-store return ease |

### 1.2 What to ADOPT for a luxury house

| Adopt | Why it works | Eclipse luxury implementation |
|---|---|---|
| **Fast, typo-tolerant search w/ autocomplete + suggestions** | Search users convert at 2–3× browse users; autocomplete reduces effort & errors | Editorial autocomplete: products, collections, "the muses/capsules," materials. Suggest *curation*, not 10k SKUs. |
| **Faceted filtering with applied-filter chips** | Lets intent-driven buyers self-segment; removes dead-ends | Tasteful facets: material, price band, capsule, occasion, "in stock." Keep counts honest; default-deny still applies (only published+visible+in-stock public). |
| **Rich PDP: gallery + clear price + single primary CTA + delivery promise** | Imagery + clarity is the #1 conversion lever; one clear CTA beats many | Hero imagery (multi-angle, on-body, detail macro), one "Acquire/Add" CTA, honest delivery & returns line, story/materials/provenance below fold. |
| **Verified, photo-rich reviews ranked by helpfulness** | **~91–95% of consumers read reviews before buying**; **70% trust reviews over ads**; displaying 5+ reviews can lift CVR materially (one cited figure ~270%); UGC interactors convert ~2× | **Verified-buyer reviews only** (never seed fakes). Show rating distribution + buyer photos. Quality > quantity for luxury. |
| **Recommendations: "pairs with / complete the look / also viewed"** | Recommendation placements drive **~35% of Amazon's revenue** (item-to-item collaborative filtering); recommended-product sections ≈ 35% of sales | "Pairs with," "Complete the ritual," "From the same capsule." Editorial bundles, not algorithmic clutter. |
| **Accelerated checkout (Shop Pay-style 1-tap) + guest checkout** | #1 abandonment cause is friction (forced accounts, long forms) | Guest checkout always; express wallets (Apple/Google Pay, Shop Pay/Link via Stripe); minimal fields; address autocomplete. |
| **Trust signals: authenticity, provenance, secure-payment, policy clarity** | Trust gates luxury purchases more than price | Authenticity guarantee, provenance/maker story, secure-checkout marks, clear policies, real human-approved content. |
| **Honest urgency: real low-stock, real best-seller, real "in carts"** | Genuine scarcity is a legitimate, powerful motivator | Surface only *true* signals: "Final pieces — N remaining" when N is real; "Most coveted this week" from real velocity. Never fabricate. |
| **Clear, generous returns messaging on PDP & cart** | Return clarity reduces purchase anxiety, lifts conversion, cuts abandonment | State window + ease prominently ("Considered returns within N days"). Anxiety reduction is pure upside. |
| **Installments / financing surfaced early (where appropriate)** | Mercado Libre proves payment flexibility expands the buyable audience for high-ticket | Offer split-pay (e.g., Stripe-supported BNPL) on PDP for higher-ticket pieces — framed as access, not desperation. |

### 1.3 What to AVOID (too mass-market / dark-pattern / off-brand)

- **Fabricated urgency**: fake countdown timers, "127 people viewing," resetting flash sales (Shein/Temu). Illegal-adjacent under FTC dark-pattern scrutiny and brand-corrosive.
- **Padded MSRPs / inflated "was" prices** (Temu/AliExpress reference-price inflation). Banned by Eclipse charter and increasingly by regulators.
- **Gamification gimmicks**: spin-to-win, mystery-coupon wheels, lucky draws. Cheapens a luxury house.
- **Confirmshaming** ("No thanks, I hate saving money") opt-out copy. Manipulative.
- **Cluttered, banner-spam, infinite-scroll dense grids.** Luxury = whitespace, editorial pacing, curation.
- **Aggressive sponsored-listing injection** into results. Erodes trust and taste.
- **Forced account creation before checkout.** Top abandonment driver.

---

## PART 2 — Buying Psychology → Ethical Eclipse Tactics

People buy emotionally and justify rationally. Luxury purchases especially are identity/affect-driven: the buyer is purchasing a feeling (status, belonging, self-expression, ritual) and post-rationalizing with materials/craft/value. The job is to *let people fall in love and feel safe buying* — never to trick them.

### 2.1 Cialdini's 7 principles → honest Eclipse tactics

| Principle | What it is | Honest Eclipse tactic | Dark version to AVOID |
|---|---|---|---|
| **Reciprocity** | We feel obliged to return value first given to us | Give genuine value pre-purchase: styling guides, care rituals, early access for members, a real gift-with-first-order, useful content. | Manipulative "free" gift that auto-enrolls a subscription. |
| **Commitment / Consistency** | We honor prior small commitments & self-image | Low-friction first step (save to wishlist, "notify me," join the house list), then honor it. Let buyers self-identify ("for the collector in you"). | Forced multi-step funnels designed to trap; pre-checked add-ons. |
| **Social proof** | We look to others' behavior, esp. similar others | **Verified** reviews + photos, real "most coveted this week," real sold counts, press/editorial mentions, real UGC. | Fake reviews, invented "X people viewing," paid undisclosed shills. |
| **Authority** | We defer to credible experts/signals | Provenance, maker credentials, materials sourcing, designer notes, authenticity guarantee, real certifications. | Fake "expert approved" badges, invented awards. |
| **Liking** | We buy from people/brands we like & relate to | Distinct, consistent brand voice (dark luxury × punk/gothic, profanity-free); founder/house story; human, warm service; aesthetic cohesion. | Manufactured "relatable" personas that misrepresent the brand. |
| **Scarcity** | Rarer = more valued; fear of missing out | **Real** limited capsules/editions, true low-stock counts, genuine waitlists, time-bounded *real* drops. | Fabricated stock counts, fake "ending soon," perpetual "last chance." |
| **Unity** | Shared identity ("one of us") drives action | A named community/house ("the inner circle / muses"), co-created drops, member-only language, belonging over transaction. | Exclusionary gatekeeping used purely to extract; fake "membership." |

### 2.2 Behavioral-economics levers → honest Eclipse tactics

| Lever | What it is | Honest Eclipse tactic | AVOID |
|---|---|---|---|
| **Price anchoring** | First number seen frames value perception (research: anchoring can raise perceived value ~30%+) | Anchor with *real* context: show the highest-tier/flagship first so mid-tier reads as attainable; cite genuine comparable craftsmanship value. | Padded "compare at" / fake MSRP. |
| **Decoy effect (asymmetric dominance)** | A 3rd "decoy" option steers choice toward target (classic Economist case: combo selection jumped 32%→84%; shifts of up to ~40% documented) | Offer a coherent good/better/best where the middle is genuinely the best value (real feature/material differences). | Engineered junk tier whose only purpose is to mislead. |
| **Loss aversion** | Losses loom ~2× larger than gains | Frame *real* expiring access honestly ("This capsule retires after the drop"); free-returns to remove fear of loss on purchase. | "You'll lose your cart/discount forever!" pressure on fake deadlines. |
| **Endowment effect** | We value what feels already ours | "Feel before you buy": immersive imagery, 360°/zoom/on-body, AR try-on, generous returns, personalization/monogram preview, wishlist ("yours, saved"). | Tricks that imply ownership to coerce. |
| **Choice architecture** | How options are arranged changes choice | Curate tightly; sensible defaults (best-seller variant pre-selected, recommended size from fit data); progressive disclosure; reduce overwhelm. | Default-opting users into paid add-ons/subscriptions. |
| **The "feel before you buy" / sensory transfer** | Inability to touch online raises anxiety; rich sensory cues substitute | Macro texture shots, material/weight specs, video, fabric/finish descriptions, AR, swatch detail, "what it feels like" copy. | Misleading imagery/filters that misrepresent the product. |
| **Cognitive ease / fluency** | Easy-to-process = trusted & preferred | Clean type, fast load, clear copy, frictionless flow, obvious next step. | (No dark version — pure good practice.) |
| **Trust/credibility cues** | Visible safety reduces perceived risk | Secure-checkout marks, clear policies, real contact/service, authenticity guarantee, transparent sourcing, real reviews. | Fake badges, hidden terms, dark-pattern fine print. |
| **Parasocial / brand-personality trust** | "People buy from people/brands they like"; relationships form one-sided | Consistent voice & POV; a recognizable house persona; founder/maker presence; storytelling; show the humans behind the approval queue. | Catfished personas, deepfaked "founders," undisclosed AI as human. |
| **Peak-end & post-purchase** | We remember peaks and endings; great unboxing/aftercare drives repeat & referral | Exceptional confirmation/unboxing narrative, proactive shipping updates, care/styling follow-up, surprise-and-delight. | Bait pre-purchase, neglect after. |

**Emotional vs rational:** Lead with emotion/identity/aesthetic (imagery, story, belonging) above the fold; supply rational ammunition (materials, craft, provenance, returns, reviews) below it so buyers can justify the feeling. Luxury skews emotional; provide enough rational scaffolding to license the splurge.

---

## PART 3 — What & How People Buy Online (2025–2026)

**Market context (verified figures)**
- **Global retail e-commerce ≈ $6.4–7.4 trillion in 2025** (eMarketer ~$7.4T; other trackers $6.4–6.9T). Multi-trillion and growing.
- **Mobile is now the majority of e-commerce sales: ~57% in 2024, ~59% in 2025 (≈$2.5T+)**, crossing **60% during the 2025 holiday peak**. Smartphones drive **~70–80% of retail site traffic**. **Design mobile-first.**
- **Mobile vs desktop conversion nuance:** mobile dominates *traffic/discovery* but **desktop still converts higher and carries higher AOV** (desktop order ≈ **$155** vs mobile ≈ **$112**; desktop CVR ≈ 3–4.8% vs mobile ≈ 2.25–2.8%). One source notes mobile CVR reaching **~2.8% in 2026, near-parity** for the first time. **Apps convert ~3× mobile web.** Implication: luxury buyers discover on mobile/social and often convert on a larger screen — make it seamless cross-device (saved carts, wishlists, express wallets on mobile, optional app/PWA).
- **Social & short-form video commerce is the fastest-growing discovery channel.** **TikTok Shop ≈ $64–66B global GMV in 2025** (roughly double 2024's ~$33B; projected ~$112B in 2026); **US ≈ $15.8B, +108% YoY**; ~**18% of US social commerce**. **TikTok Shop CVR ~4.7%** (vs ~1.9% other social); **live-shopping sessions 6–18%**. **Short-form video drives ~60% of platform sales**; **~50% of TikTok Shop purchases tie to creator content.** Video on PDPs + shoppable short-form are table stakes for trend capture.

**Top online categories (high-velocity, 2025–2026):** apparel & accessories is the largest single category (**~18.7% of US online spend; ~$760B global apparel**); fastest movers include **food/grocery (+27% YoY)** and **health & beauty (+11% YoY, very social-driven)**; plus consumer electronics/accessories, home & décor, health/wellness & supplements, footwear, jewelry & watches, and "viral" niche objects surfaced by social. For a luxury house, the live lanes are **fashion accessories, jewelry/watches, beauty/fragrance, premium home/objet, and limited-edition collectibles.**

**Impulse vs considered (verified)**
- **Unplanned purchases now dominate:** one widely-cited figure puts **~72% of e-commerce revenue from unplanned purchases (up from ~42% in 2021)**; **~37%** of shoppers are more likely to buy impulsively online; impulse is **~20–40% of online sales** depending on definition. Critically for honest scarcity: **~78% of consumers say they're more likely to impulse-buy a product with limited availability** (Shopify), and **~60% buy limited editions to avoid missing out** — validating *real* scarcity as a powerful, legitimate lever.
- **Impulse**: low price, high emotional/aesthetic pull, social-video-triggered, time-sensitive. Honest urgency + frictionless checkout + strong imagery convert these. Note impulse now reaches high tickets too (**36% made an impulse buy of $250+ in Q1 2025**).
- **Considered / high-involvement** (where most luxury sits): longer research, multiple sessions/devices, heavy reliance on reviews, returns policy, authenticity, trust. These need rich content, social proof, financing, and anxiety reduction — not pressure.

**AOV drivers (verified magnitudes — use the honest ones):** genuine **free-shipping thresholds** (~**58% of shoppers add items to qualify**; set ~15–20% above current AOV); **bundling** (~20–55% AOV lift when done with intent); **cross-sell** (up to ~30% of e-comm revenue); **upsell** (~10–30% AOV lift); **post-purchase one-click offers** (high attach, ~6–7% CVR); loyalty/early-access; and **financing/BNPL** on higher-ticket items. 2025 benchmark AOV ≈ **$150**.

**Cart abandonment (verified)** — Baymard's meta-analysis of 49 studies = **70.19% average** (some 2025–2026 trackers cite ~70.2–75.4% overall; **mobile ~75–80% vs desktop ~66–70%** — a real mobile-friction gap). Baymard documents that fixing *solvable checkout-usability* issues can lift CVR by **~35%**. Leading *causes* of abandonment *during checkout* (Baymard, US adults who abandoned for non-just-browsing reasons; "just browsing" ≈ 43% is excluded as unfixable):

| Cause | Approx. share | Eclipse fix |
|---|---|---|
| **Extra/unexpected costs too high** (shipping, fees, taxes) | ~**48%** (top cause, 6 yrs running) | Show all-in cost early; honest shipping/duties; free-ship threshold; no checkout surprises. |
| **Required to create an account** | ~**26%** | Guest checkout, always. |
| **Don't trust site with card info** | ~**18–25%** | Trust marks, recognizable wallets (Apple/Google Pay, Link), clear security. |
| **Checkout too long / complicated** | ~**18–22%** | Minimal fields (ideal ≈ 7–8 fields), address autocomplete, progress clarity, express wallets. |
| **Can't see/calculate total upfront** | ~**21%** | Live order summary with all costs. |
| **Website errors / crashes** | ~**18%** | Performance budget; tested checkout. |
| **Returns policy not satisfactory** | ~**18%** | Generous, clearly stated returns. |
| **Too few / unwanted payment methods** | lower but real | Wallets, cards, BNPL on higher-ticket. |
| **Card declined** | lower | Smart retries, clear messaging. |

*(Exact percentages vary by survey wave; treat as directional. Supporting data points: trust badges/clear policies can cut abandonment up to ~28% and lift CVR up to ~25% (Baymard) — payment-mark badges alone ~8–15%.)*

**Highest-ROI abandonment fixes:** (1) kill surprise costs, (2) guest checkout, (3) express wallets / accelerated checkout, (4) trust + clear returns, (5) cart-recovery email/notify-me. Better checkout design alone is documented to recover a large share of otherwise-lost orders (Baymard estimates ~$260B recoverable across US+EU via checkout UX).

---

## PART 4 — The Eclipse Trend-Detection Algorithm

**Goal:** Let the **sourcing agent** autonomously surface *on-trend* product opportunities (categories, attributes, motifs) and propose them as candidates into the **human-approval queue** — never auto-publishing. Output is ranked, explainable, and append-only.

### 4.1 Design principles (fit Eclipse's charter)

- **Dependency-free**: Node built-ins + `node:test` only; ESM `.mjs`. No new packages.
- **Pluggable adapters**: each signal source is an adapter behind a common interface. **Mock adapters by default** (seeded RNG via `src/lib/rng.mjs`), live data later via **MCP/HTTP** (Google Trends, social, marketplace best-sellers) following the existing *request-artifact → agent fulfills via MCP → record result back* pattern.
- **Deterministic & explainable**: seeded fixtures reproduce; every score carries its component breakdown + provenance so a human reviewer sees *why* something trended.
- **Append-only truth**: raw signal pulls → `data/trends/signals.ndjson`; the ranked board → a projection (`trends/index.json`) rebuilt via `npm run rebuild`.
- **Honest by construction**: the algorithm flags opportunities; it never invents demand, never fabricates scarcity, and its output still passes through the full human gate.

### 4.2 Inputs (signal adapters)

Each adapter returns, per **term** (a product keyword/attribute/motif, e.g. `"chrome heart pendant"`, `"gothic silver ring"`, `"oxblood leather"`), a normalized time series and/or scalar:

| Adapter | Signal | Live source (later, via MCP/HTTP) | Mock (now) |
|---|---|---|---|
| `searchTrendAdapter` | Search interest over time (0–100 normalized), rising/breakout flags | Google Trends-style endpoint | Seeded series w/ injected trends/seasonality |
| `socialTrendAdapter` | Mentions/views velocity (short-form video, hashtags) | Social MCP/API | Seeded counts w/ spikes |
| `marketplaceVelocityAdapter` | Best-seller rank, units-sold velocity, "X in carts" | Marketplace best-seller feeds | Seeded ranks/velocity |
| `risingQueryAdapter` | Rising/breakout related queries (% growth) | Trends "rising" queries | Seeded query growth list |
| `seasonalityAdapter` | Seasonal index for term/category (0.5–1.5) | Historical decomposition | Static seasonal table |
| `internalDemandAdapter` | Eclipse's own search/wishlist/notify-me misses (unmet demand) | Eclipse event log (`data/events.ndjson`) | Replayed events |

> **Internal "demand gaps" are gold:** on-site searches and "notify me" with **no matching product** are the highest-confidence, first-party trend signal — weight them heavily and they carry no third-party rate limits.

### 4.3 Per-signal feature extraction

For each term *t* and signal series *s* (most-recent window), compute robust, outlier-resistant features:

```
level(t,s)        = latest smoothed value (EWMA, α≈0.4)         // current magnitude
velocity(t,s)     = (EWMA_now - EWMA_prev) / max(EWMA_prev, ε)  // % short-term growth
acceleration(t,s) = velocity_now - velocity_prev               // is growth speeding up?
zscore(t,s)       = (latest - median(window)) / (1.4826*MAD(window) + ε)  // robust spike
seasonAdj(t)      = clamp(seasonality(t, now), 0.5, 1.5)        // de-seasonalize demand
risingScore(t)    = log1p(maxRisingQueryGrowthPct(t)) / log1p(CAP)  // 0..1 breakout proxy
```

- **EWMA** smooths noise; **MAD/z-score** (median + 1.4826·MAD) makes spike detection robust to outliers (better than mean/std for spiky social data).
- **De-seasonalize**: divide level/velocity contributions by `seasonAdj` so we don't mistake December gift-season for a real emerging trend (and we *can* flag genuine seasonal lead-time buys separately).
- Clamp/normalize every feature to **0..1** (min-max within window or squashing via `x/(x+k)` / `log1p`) before weighting.

### 4.4 Scoring formula

A weighted composite per term, multiplied by quality gates:

```
# Per-signal sub-score (0..1), de-seasonalized
sub(t,s) = clamp01(
     wL*norm(level)        +
     wV*norm(velocity)     +
     wA*norm(acceleration) +
     wZ*norm(zscore)
) / seasAdj(t)
# defaults: wL=0.25, wV=0.35, wA=0.20, wZ=0.20   (sum=1.0)

# Cross-signal composite (source weights reflect trust/leadingness)
TrendScore_raw(t) =
     0.30 * sub(t, internalDemand)     +   # first-party, highest trust
     0.25 * sub(t, searchTrend)        +
     0.20 * sub(t, social)             +
     0.15 * sub(t, marketplaceVelocity)+
     0.10 * risingScore(t)                 # breakout/rising-query proxy

# Confidence: corroboration + data sufficiency (penalize single-source/thin data)
corroboration(t) = (# signals where sub(t,s) > 0.5) / (total signals)
sufficiency(t)   = clamp01(observedDataPoints(t) / MIN_POINTS)
confidence(t)    = 0.5*corroboration(t) + 0.5*sufficiency(t)

# Brand fit (does it fit dark-luxury × punk/gothic, profanity-free?) 0..1
#   keyword/affinity match + category allowlist; hard 0 if disallowed/off-brand/unsafe
fit(t) = brandFitScore(t)

# Saturation penalty: discount already-peaked/declining trends (we want emerging)
#   peaked = high level but velocity<=0 and acceleration<0
saturation(t)    = (velocity(searchTrend) <= 0 && accel(searchTrend) < 0) ? 0.6 : 1.0

# FINAL
TrendScore(t) = TrendScore_raw(t) * confidence(t) * fit(t) * saturation(t)   # 0..1
```

**Trajectory label** (for the reviewer, à la Exploding Topics' regular/exponential/peaked):
```
if velocity>0 && acceleration>0      -> "exponential / emerging"   (best to source)
elif velocity>0 && acceleration<=0   -> "regular / steady rise"
elif velocity<=0 && level high       -> "peaked / plateauing"      (caution)
else                                 -> "declining"                (skip)
```

### 4.5 Ranking, thresholds, output

1. Compute `TrendScore(t)` for all candidate terms.
2. Keep `TrendScore ≥ TAU` (default `TAU = 0.55`) **and** `confidence ≥ 0.4` **and** `fit > 0` (hard brand-safety gate).
3. **Dedupe/cluster** near-synonyms (normalize via `src/lib/hash.mjs` on a slug; merge variants of the same motif) so the queue isn't spammed with 12 phrasings of one trend.
4. Rank by `TrendScore` desc; break ties by `confidence`, then `acceleration`.
5. For the top *N* (default 10/run), the sourcing agent emits an **explainable candidate** (it does **not** create products): proposed attributes/motif, the score + full component breakdown, trajectory label, contributing sources w/ provenance, and a confidence note — appended to `queue/candidates.ndjson` for the **human approval queue**. Matching live products still require the full gate (`gate.passed === true`, `human_approved`), and storefront projection stays default-deny.

### 4.6 Refresh cadence

- **Internal demand gaps:** every `npm run tick` (cheapest, first-party, no limits).
- **Search/social/marketplace pulls:** scheduled (e.g., every 6–24h) to respect rate limits; cache to `data/trends/signals.ndjson` (append-only); recompute scores on each tick from cache.
- **Seasonality table:** refreshed monthly/quarterly.
- **Cold-start:** until live adapters are wired, run on mock/seeded fixtures so tests are deterministic and the pipeline is provable end-to-end.

### 4.7 Module shape (proposed, dependency-free)

```
src/trends/
  adapters/            # searchTrend, social, marketplaceVelocity, risingQuery,
                       #   seasonality, internalDemand  (mock-by-default seams)
  features.mjs         # EWMA, velocity, acceleration, robust z-score (MAD), normalize
  score.mjs            # sub-score, composite, confidence, fit, saturation, trajectory
  detect.mjs           # orchestrate: pull -> features -> score -> rank -> cluster
  propose.mjs          # emit explainable candidates -> queue/candidates.ndjson
  request.mjs          # export MCP/HTTP request artifacts for live data (Eclipse pattern)
test/trends.test.mjs   # seeded fixtures: known trend -> expected ranking (node:test)
data/trends/signals.ndjson   # append-only raw pulls
trends/index.json            # projection (npm run rebuild)
```

**Test invariants:** an injected breakout in fixtures must rank #1; a peaked/declining series must be down-ranked; an off-brand/unsafe term must score 0 via `fit`; thin single-source data must be filtered by `confidence`; proposals must land in the queue as `agent` actor only (never `approved`/`published`).

---

## PART 5 — Synthesis: the 12 highest-ROI ethical conversion tactics

1. **Frictionless, accelerated checkout** — guest checkout + express wallets (Apple/Google Pay, Stripe Link/Shop Pay-style), minimal fields, address autocomplete. Attacks the #1 abandonment cluster.
2. **All-in pricing, zero checkout surprises** — show shipping/duties/total early; honest free-ship threshold. Kills the top abandonment cause (~48% "extra costs").
3. **Verified, photo-rich social proof** — real buyer reviews + photos + rating distribution + real press/UGC. Never fabricated.
4. **"Feel before you buy" PDP** — multi-angle + macro texture + video + AR/360 + material/weight specs to beat the no-touch anxiety (endowment + sensory transfer).
5. **Honest scarcity & best-seller signals** — true low-stock counts, real limited capsules/drops, real "most coveted this week" from velocity. No fake timers, ever.
6. **Generous, prominently-stated returns** — reduces purchase anxiety (loss aversion); display on PDP + cart.
7. **Recommendations that lift AOV ethically** — "pairs with / complete the ritual / same capsule" + post-add cross-sell; editorial, not cluttered.
8. **Strong, consistent brand persona (liking + parasocial trust)** — distinctive dark-luxury voice, founder/maker story, human service; people buy from brands they like.
9. **Honest tiering + anchoring (good/better/best)** — real feature/material differences; flagship anchors value; optional genuine decoy as the best-value middle. No padded MSRPs.
10. **Trust & authenticity cues** — authenticity guarantee, provenance/sourcing, secure-checkout marks, clear policies, real contact. Trust gates luxury.
11. **Reciprocity + unity membership** — real pre-purchase value (styling/care guides, early access) + a named house community ("inner circle / muses") for belonging and repeat.
12. **Recover demand you already earned** — wishlist + "notify me / back-in-stock" + abandoned-cart email; these also feed the internal trend-detection demand-gap signal. (Bonus: mobile-first, fast-loading store — cognitive ease is conversion.)

---

## Sources

- Baymard Institute — Cart & Checkout Abandonment (70.19% avg; reasons breakdown; ~35% CVR uplift from checkout UX; ~$260B recoverable). https://baymard.com/lists/cart-abandonment-rate · https://baymard.com/blog/ecommerce-checkout-usability-report-and-benchmark
- Baymard Institute — Product List & Filtering UX (58% desktop / 78% mobile mediocre-or-worse; applied-filter chips; only ~16% effective faceted search). https://baymard.com/blog/current-state-product-list-and-filtering · https://baymard.com/learn/ecommerce-filter-ui
- Faceted search / filtering conversion (~20% CVR lift) — brokenrubik.com, fact-finder.com, optimonk.com.
- Robert Cialdini — 7 Principles of Persuasion (reciprocity, commitment/consistency, social proof, authority, liking, scarcity, unity) + ethical application. cxl.com/blog/cialdinis-principles-persuasion, suebehaviouraldesign.com, cognitigence.com.
- Behavioral-economics pricing (anchoring, decoy, loss aversion, endowment, choice architecture) — launchmystore.io, profit.co, thestrategystory.com (Economist 32%→84%), en.wikipedia.org/wiki/Decoy_effect.
- Amazon PDP & recommendations (~35% revenue from recs; Buy Box; A+ content +5.6%) — tinuiti.com, firney.com, marketingwithdave.com, Amazon Science, feedvisor.com.
- Reviews / social proof / trust badges (read-rate 91–95%; CVR lifts; badges +8–25%) — capitaloneshopping.com, fera.ai, judge.me, conversion.studio, discoveredlabs.com.
- Dark patterns & FTC enforcement (false scarcity/urgency, confirmshaming, drip pricing; Shein/Temu BEUC complaint, gamification) — ftc-coverage via agg.com, marketplace.org, glossy.co, beuc.eu, thefashionlaw.com.
- Exploding Topics & Glimpse — trend-detection methodology (search-volume growth + social signals; trajectory; seasonality-removed forecasting). explodingtopics.com, meetglimpse.com, pulsarplatform.com, sellersprite.com.
- Google Trends — 0–100 normalization; rising/breakout (+5000%) related queries; trending-now spike-vs-baseline. trends.withgoogle.com/year-in-search/data-methodology, newsinitiative.withgoogle.com, meetglimpse.com/google-trends. PyTrends archived Apr 2025 (github.com/GeneralMills/pytrends); official Trends API in alpha 2025.
- Time-series anomaly / trend math — EWMA, moving z-score & MAD/IQR, Holt-Winters, seasonal decomposition; HN/Reddit time-decay ranking. risingwave.com, medium.com (Booking.com & Kis), tinybird.co, supplychainmath.com, saturncloud.io.
- Global e-commerce & mobile-commerce share (~$6.4–7.4T 2025; m-commerce ~57–59%, >60% holiday peak; device CVR/AOV) — Statista, eMarketer (worldwide-retail-ecommerce-forecast-2025), redstagfulfillment.com, mobiloud.com, sqmagazine.co.uk.
- TikTok Shop / social commerce (~$64–66B GMV 2025; US $15.8B +108%; CVR ~4.7%; short-form ~60% of sales; live 6–18%) — emarketer.com, socialcommerceclub.com, statista.com, resourcera.com.
- Impulse vs considered & limited-edition impulse (72% unplanned revenue; 78% impulse on scarcity; 60% buy limited editions) — abtasty.com, awisee.com, invespcro.com, capitaloneshopping.com, Shopify.
- AOV levers (free-ship threshold ~58% add-to-qualify; bundling 20–55%; cross-sell ≤30%; upsell 10–30%) — getkard.com, swell.is, wisernotify.com.
- Luxury UX & consumer behavior (editorial PDPs, 360°/zoom, exclusivity/scarcity/FoMO, authenticity & provenance, multi-brand CVR 3.8–6.2%) — kndigital.co, Shopify luxury guide, brainandcode.com, arvisus.com, appnova.com, Mintel, Springer (s43621-025-01830-5).
- Parasocial / brand-personality trust & neuroselling — winsomemarketing.com, ScienceDirect, Springer, NCBI/PMC.
- Marketplace UX patterns observed via research above: Amazon, Walmart, Shopify (Search & Discovery, Shop Pay), Etsy, eBay, Shein, Temu, Alibaba/AliExpress, Mercado Libre, Target.
- Robust spike detection: median + MAD (1.4826·MAD) z-score; EWMA smoothing; Holt-Winters (level/trend/seasonal) & seasonal decomposition; Reddit/Hacker-News time-decay ranking — standard time-series / trending-topic practice. (RisingWave, Medium/Booking.com & Tinybird anomaly-detection write-ups; Saturn Cloud / Medianotes on HN-Reddit ranking; demand-forecasting guides on Holt-Winters & decomposition.)
- Recommendation revenue share (~35% of Amazon revenue; item-to-item collaborative filtering) — firney.com, marketingwithdave.com, Amazon Science.
- Reviews/social-proof & trust-badge conversion impact — capitaloneshopping.com, fera.ai, judge.me, conversion.studio, Baymard.
- AOV levers (free-ship thresholds, bundling, upsell/cross-sell, post-purchase) — getkard.com, swell.is, wisernotify.com, redstagfulfillment.com.
- Impulse-vs-considered & limited-edition impulse data — abtasty.com, awisee.com, invespcro.com, capitaloneshopping.com, Shopify.
- Luxury consumer behavior (storytelling, exclusivity, authenticity, blockchain/NFC provenance) — arvisus.com, appnova.com, Mintel, Springer (scarcity/FoMO study), Shopify luxury guide; luxury multi-brand CVR & AI-rec lift — kndigital.co, brainandcode.com.
- Parasocial/brand-personality trust — winsomemarketing.com, ScienceDirect, Springer; neuroselling — NCBI/PMC.

> **Caveats:** Specific abandonment percentages, GMV, and market-size figures vary by survey wave/source year (and many secondary blogs re-cite Baymard/Statista/eMarketer). Treat them as directional, not precise. Re-pull primary sources (Baymard, Statista, eMarketer, Google Trends) when wiring live dashboards. Figures reflect commonly-cited 2024–2026 data gathered May 2026.
