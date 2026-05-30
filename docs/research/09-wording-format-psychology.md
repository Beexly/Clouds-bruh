# 09 — The Psychology of Wording, Format & Presentation → The Eclipse Copy/Format System

Research brief for **Eclipse** (Galaxy Network) — autonomous luxury commerce house, dark luxury × punk/gothic, profanity-free, "for those who already know." Honest charter: no fake scarcity, no fake reviews, no padded MSRPs.

This document covers (1) the science of *why* specific words/structures convert, (2) format & scanning science, (3) the Eclipse **Voice & Copy Doctrine** + lexicons, (4) a deterministic **Copy Linter/Scorer** module spec for use as a candidate-pipeline gate, and (5) CTA / PDP / trust-page templates. Every "dark tactic" is paired with the honest alternative Eclipse uses instead.

Scope note for engineering: the doctrine and the scorer are designed to be dependency-free (Node built-ins + `node:test`), deterministic, and append-only-friendly — they slot beside `src/storefront/copy.mjs` and act like the imagery quality gate so off-voice or dishonest copy cannot reach a human reviewer as "ready."

---

## PART 1 — PERSUASIVE LANGUAGE SCIENCE

### 1.1 Specificity is trust (concrete > abstract)
The brain treats **specific, concrete, sensory claims** as more credible than vague ones. "Increased conversions by 34%" reads as more trustworthy than "boosted results significantly"; concrete language (numbers, measurements, things you can see/touch/hear) "paints vivid pictures" and converts because readers can verify and visualize it [Knowadays; Diginamix; HiddenFalls]. For Eclipse this is the load-bearing mechanism: **specificity replaces hype.** "400GSM organic ring-spun cotton" does the persuasive work that "premium quality" cannot — it is checkable, sensory, and confident. This aligns with the existing Altar XIV copy ("the weight you feel on contact").

Design implication: the scorer should **reward specificity tokens** (numbers, units like GSM/mm/ct, materials, place-of-origin, construction nouns) and **penalize empty intensifiers** ("very," "really," "extremely," "world-class," "premium" used alone).

### 1.2 Verbs beat adjectives/nouns (action over description)
Copy practitioners and neuromarketing both find **verbs carry persuasion**; adjectives "season," verbs are the "entrée." Verbs imply movement and nudge the reader toward action; "discover/experience/transform/empower" create dynamism and stick in memory [Neuromarketing; Medium/Tewari; MarketingWords].

Important honesty caveat for the charter: the famous identity-noun finding — Bryan et al. (Stanford), where framing voting as *"being a voter"* (noun/identity) beat *"to vote"* (verb), raising turnout (reported 11–14 pts; "96% vs 82%" in one item) — **failed to replicate** in a large psychologically-authentic field experiment (Gerber et al., PNAS 2016) [NatGeo; PNAS 2016; Stanford SPARQ]. Lesson: identity-framing ("for those who already know") is a legitimate *brand voice* choice, but Eclipse must **not** treat it as a guaranteed conversion lever or make claims about its effect. Use it because it's true to the brand, not because of an over-claimed statistic.

### 1.3 "You"-framing + present tense
"You" creates a one-to-one relationship and is near-universal in high-converting copy; present tense creates immediacy and directness [Copyblogger; ContentConga]. Eclipse nuance: dark-luxe voice uses **"you" sparingly and confidently** ("Built for the person who carries conviction") rather than the chummy mass-market "you'll love this!" Present tense + second person, but unhurried.

### 1.4 CTA microcopy — what the A/B data actually says
- **First-person framing** ("Start *my* free trial") beat second-person ("*your*") by ~90% in Aagaard/Unbounce's landmark test; replications land in the +10–40% range, and "Add to *My* Cart" reportedly beat "Add to Cart" ~25% via psychological ownership [Kissmetrics; VerticalResponse; UpwardEngine]. Treat the 90% as a famous outlier, not a promise.
- **"Add to Cart" vs "Add to Bag":** luxury/fashion (Ralph Lauren, Coach, Saks, Neiman Marcus) widely use "Add to Bag" for brand fit; however CRO tests repeatedly find **"Add to Cart" converts as well or better** because it's the universally understood term [UXMovement; ConversionFanatics]. So "Bag" is a *voice* decision with a small comprehension cost — acceptable for Eclipse, but the primary buy action must stay unambiguous.
- **Luxury CTA verbs:** luxury favors **experiential** verbs — "Discover," "Explore," "Reserve," "Request," "Enter" — over hard "Buy now / Shop now / Act now," which read mass-market [Appnova; Croud].
- **"Button color tests" are mostly noise** — copy, context, and hierarchy move conversion far more than hue [AtticusLi].

### 1.5 Price presentation — the most important luxury divergence
- **Charm pricing (.99 / "9-endings")** exploits **left-digit bias** (Thomas & Morwitz 2005): $3.00→$2.99 reads as a bigger drop than 1¢. The MIT/University of Chicago women's-apparel test ($34 vs $39 vs $44) found the $39 (charm) price **sold best — up to ~24%** more than round prices [Price2Spy; Business.com; Capital One Shopping].
- **BUT luxury deliberately rejects charm pricing.** *Journal of Consumer Research*: **odd prices signal value/discount; even (round) prices signal trust, quality, prestige.** Round, whole numbers (e.g., **$500**, not $499.99) convey wholeness, confidence, and exclusivity; luxury houses (e.g., Louis Vuitton) use clean round numbers and pull the eye to the product before the price [Omnia; Phoenix Strategy; Intuit]. **→ Eclipse uses prestige/rounded pricing. This is a brand-integrity rule, not a tactic.** (See the explicit rule in Part 3.5.)
- **Font/size of the price:** Coulter & Coulter (2005) "size congruity" — a number *looks* smaller (cheaper) when set in a **physically smaller font**; congruent size↔magnitude raises value perception. Luxury inverts the discount playbook: **don't make the price tiny to seem cheap; present it calmly, same weight, no strike-through theatrics, no "was/now" unless genuinely true** [ResearchGate; PMC size-congruity].

### 1.6 Hype/spam words that *kill* luxury (and deliverability)
Spam-filter and luxury-voice research converge on the same banned list: **"Free," "Act now," "Limited time," "Last chance," "Guaranteed," "Risk-free," "Buy now," "Don't miss out," "100% / best-selling."** These trip spam filters *and* read cheap; an "established sender" can survive a stray "free," but overuse tanks both inbox placement and prestige [EngageBay; ActiveCampaign; Mailmeteor; Appnova]. Honest swaps: "free"→"included / at no additional cost"; "guaranteed results"→cite the actual spec/return terms; "limited time"→state the *real* run size or window.

---

## PART 2 — FORMAT, STRUCTURE & SCANNING SCIENCE

### 2.1 Users scan, they don't read — F-pattern & Z-pattern
NN/g's eye-tracking (2006, re-confirmed on desktop + mobile) found the **F-pattern**: a top horizontal sweep, a shorter second horizontal sweep, then a vertical scan down the left edge [NN/g]. Critically, NN/g calls the F-pattern a **failure state** — it emerges when copy *lacks structure* (weak/absent headings, dense paragraphs, no hierarchy). Give the eye anchors — clear headings, short paragraphs, **front-loaded** first words, bolded keywords, bullets — and users read the meaningful parts instead of skimming an F [NN/g; Acquia; GraphicMint]. The **Z-pattern** governs sparse, visual, low-text pages (logo → hero → CTA), which is exactly the luxury hero/landing pattern [BlurTest].

Design implications for Eclipse PDPs:
- **Front-load** every line: the first 2 words of titles, bullets, and paragraphs must carry meaning ("400GSM organic cotton — …", not "This is made from…").
- **Bold the load-bearing noun/number** in each bullet (the spec, not the adjective).
- Keep paragraphs ≤ ~3 lines; one idea each (inverted pyramid: conclusion first).

### 2.2 Spec sheets — scannability is measurable
Baymard: **~50% of e-commerce sites have spec sheets users struggle to scan.** Eye-tracking finding: **horizontal shading (zebra rows)** lets users trace a label→value line "much more quickly and reliably" than vertical/none; **group** related specs, post-process vendor data into consistent **units**, and don't dump a raw blob [Baymard spec-sheet]. Eclipse `specs{}` should render as a labeled, grouped, zebra-striped table with normalized units (GSM, mm, ct, mm, %).

### 2.3 Chunking, whitespace, cognitive load
Bullets beat prose for benefits/specs; whitespace lowers cognitive load and reads as confidence/luxury. Editorial luxury copy is **sparse, confident, restrained** — "fewer words, more weight; messaging that signals, not sells" [ProCopywriters; Appnova]. Eclipse PDP = a short editorial paragraph (story/positioning) + a tight benefit bullet list (specifics) + a grouped spec table — not a wall of text.

### 2.4 Above-the-fold + labels/eyebrows
Above the fold should answer "what is this, who is it for, what does it cost" with the product image dominant and price calm. **Eyebrows/labels** (small caps kicker above a title, e.g., "ALTAR XIV · CAPSULE") orient the scan cheaply and add editorial polish. Z-pattern places brand top-left, hero center, primary CTA at the terminal bottom-right.

### 2.5 Reading-ease as conversion (clarity = conversion)
Flesch Reading Ease 0–100 (higher = easier). Landing/product copy converts best around **60–80** ("plain English," ~7th–9th grade); trust/policy pages should be **even easier (70–85)** because 54% of US adults read at ≤ 6th-grade level and confusion drives chargebacks [Readable; Elite Editing; YouStable]. Luxury nuance: prestige ≠ obscurity. Eclipse keeps **short sentences and common words**, earning "premium" from confidence and specificity, not from long Latinate sentences. **Target band: Flesch 55–75** for PDP body (a touch more sophisticated than mass-market, still plain); **≥ 65** for trust pages. Penalize, don't hard-fail, sub-50.

---

## PART 3 — THE ECLIPSE VOICE & COPY DOCTRINE

### 3.1 Persona (one paragraph the agents can encode)
Eclipse speaks like **a confident insider who has nothing to prove.** It states facts, not adjectives. It is **dark-luxe, exclusive, specific, unhurried, profanity-free.** It never shouts, never begs, never invents urgency. It assumes the reader already has taste ("for those who already know") and respects their intelligence: it shows the weight, the stitch, the origin, and lets them decide. Restraint is the flex.

### 3.2 Tone dimensions (NN/g's 4 axes, set for Eclipse) [NN/g Four Dimensions]
- **Funny ↔ Serious → Serious** (dry wit allowed; no jokes/puns).
- **Formal ↔ Casual → Lightly formal** (editorial, not stiff; contractions OK, slang no).
- **Respectful ↔ Irreverent → Respectful with an edge** (punk confidence, never sneering at the customer).
- **Enthusiastic ↔ Matter-of-fact → Matter-of-fact** (the single biggest divergence from mass-market; let specifics generate the desire).

### 3.3 DO lexicon — power-word **allowlist** (use freely)
Grouped; these reward in the scorer.

- **Material / construction (specificity engine):** GSM, ring-spun, loopback, French terry, garment-dyed, buckram, full-grain, vegetable-tanned, box-stitch, bartack, selvedge, double-needle, set-in sleeve, Goodyear-welt, solid brass, sterling, carat/ct, micron, denier, mm, oz.
- **Provenance / honesty:** Made in [place], small-run, numbered, single drop, controlled run, sourced, traceable, archival.
- **Sensory / weight:** heavyweight, structured, brushed, dense, substantial, weight, hand, drape, matte, blackened, tonal.
- **Identity / belonging (true):** for those who already know, the ones who know, considered, deliberate, conviction, restraint, intentional, set apart.
- **Experiential CTAs / verbs:** Discover, Explore, Enter, Reserve, Request, View, Add to Bag, Carry, Inspect, Step into.
- **Durability / value (honest):** built to outlast, five-year wear, ages well, pre-washed, holds shape, repairable.

### 3.4 DON'T lexicon — **banned** words/phrases

**(A) Hype / spam (banned outright — cheapens + spam-flag):**
free, act now, buy now, shop now, order now, hurry, don't miss out, last chance, final hours, while supplies last, limited time, today only, best-selling, best seller, #1, world-class, ultimate, insane, amazing, unbelievable, must-have, game-changer, revolutionary, guaranteed, 100%, mind-blowing, blowout, sale sale, lowest price, cheap, bargain, deal of the.

**(B) Empty intensifiers / filler (penalize; replace with a spec):**
very, really, extremely, super, totally, literally, premium (alone), high-quality (alone), top-quality, luxurious (telling not showing), exquisite, finest, perfect, exclusive (when unproven), iconic, curated (overused), elevate/elevated, unlock, seamless, next-level.

**(C) Dishonest / fabricated (HARD FAIL — charter violation):**
- Fake urgency/scarcity: "only N left!" / countdown timers / "selling fast" / "almost gone" **unless the number is real and live** (FTC + ACM enforce; 73% of consumers recall manipulative countdowns) [FTC 2022; ACM; Deceptive.design].
- Fake social proof: "thousands sold," "everyone's buying," invented review counts/ratings, "as seen in [unearned]."
- Padded value: struck-through "MSRP/was" prices that were never genuine; "save $X" vs a fictional anchor.
- Unverifiable superlatives/claims: "the best," "#1," health/performance claims without basis.

**(D) Profanity:** any. (Brand charter.)

### 3.5 Price-presentation rule (the luxury divergence — encode literally)
> **Eclipse prices in whole, rounded major units. No charm/9-endings. No `.99`. No `.95`.**
> Money is stored as integer minor units + currency (existing constraint). A price is **valid for display** iff `amountMinor % 100 === 0` (whole units) — and the linter **flags** prices where the last two digits are `99`/`95`/`98` as off-brand "charm pricing."
> Display: render the rounded number calmly, **same visual weight** as surrounding text, with the currency symbol; **no strike-throughs, "was/now," or "save"** unless a markdown is genuinely, verifiably real (charter forbids padded MSRPs). Rationale: round numbers signal trust/quality/prestige; charm endings signal discount and read mass-market [JCR via Omnia; Phoenix Strategy; Intuit]. Optional refinement: prefer "clean" tiers (e.g., 120, 150, 180, 220, 280, 350, 500) over arbitrary wholes like 187.

### 3.6 Title / description / CTA templates (deterministic-friendly)
- **Eyebrow (optional):** `BRAND · {CAPSULE|CATEGORY}` in small caps.
- **Title:** `{ProductName}` — 1–4 words, no hype, no ALL-CAPS shouting (Title Case or brand caps OK).
- **Subtitle = the spec hook:** the single most concrete fact — `400GSM Heavyweight Cotton`, `Full-Grain Veg-Tanned Leather`, `Solid Sterling, Hand-Finished`.
- **Description (editorial, 2–3 sentences, ≤ ~45 words):** `{positioning/identity sentence}. {construction + material specifics}. {durability/origin sentence}.` Front-loaded, present tense, "you/person who" once.
- **Benefit bullets (3–5):** each `{Spec/feature} — {why it matters, sensory/durability}`. Bold the spec. (Mirrors existing Altar XIV bullet shape.)
- **Spec table:** grouped, zebra rows, normalized units.
- **Primary CTA:** `Add to Bag` (universal `Add to Cart` acceptable). **Secondary/editorial CTAs:** `Discover`, `Explore the Capsule`, `Reserve`, `Request`, `Enter`.

---

## PART 4 — THE COPY LINTER / SCORER (module spec)

**Purpose:** a deterministic, dependency-free gate (Node built-ins only) that scores any product/marketing copy for **brand-voice adherence, reading ease, specificity, banned-word violations, and honesty.** It mirrors the imagery quality gate: **off-voice or dishonest copy cannot be marked "ready" for a human.** Hard-fail conditions block; soft scores produce a 0–100 grade + reasons. No `Math.random()`; same string in → same result out (pure function), so it's replay-safe with the append-only logs.

### 4.1 Proposed location & shape
- File: `src/scoring/copy-gate.mjs` (sits with `launch-gate.mjs`).
- Lexicons: `src/scoring/lexicons.mjs` (exports `ALLOW`, `BAN_HYPE`, `BAN_FILLER`, `BAN_DISHONEST_PATTERNS`, frozen).
- Export: `scoreCopy(copy, opts) -> { score, band, passed, hardFails, violations, metrics, reasons }`.
- `copy` = the object `vaultCopyFor`/`ALTAR_XIV_CAPSULE` already produce: `{ title, subtitle, description, bulletBenefits[], emotionalHooks[], specs{} }` (+ optional `priceMinor`, `currency`).

### 4.2 What it CHECKS (criteria)

1. **Banned-word scan — hype/spam (`BAN_HYPE`).** Case-insensitive, word-boundary, whitespace/punctuation-normalized (catch "act   now", "act-now"). Each hit = violation; > 0 hits caps `score ≤ 60` and sets `passed=false`.
2. **Honesty / fabrication scan (`BAN_DISHONEST_PATTERNS`) — HARD FAIL.** Regexes for fake scarcity ("only \d+ left", "selling fast", "almost gone", "ends in", "hurry"), fake social proof ("\d+\+? (sold|bought|reviews|five-star)", "everyone", "thousands of"), padded price ("was \$?\d", "msrp", "save \$?\d", "\d+% off"), unverifiable superlatives ("the best", "#1", "world'?s (best|finest)"). Any match → `hardFails`, `passed=false`, `score` floored regardless of other metrics. (These can only be cleared if the system has a *verified* data field backing the claim — e.g., a real live-stock count — passed via `opts.verifiedClaims`.)
3. **Profanity scan — HARD FAIL.** Small frozen list; any hit → fail.
4. **Filler / empty-intensifier scan (`BAN_FILLER`).** Each hit = minor penalty (−4 each, capped) + a "replace with a spec" reason. Not a hard fail.
5. **Specificity score (reward).** Count specificity signals across all fields: digits, units regex (`GSM|gsm|oz|mm|ct|carat|micron|denier|%|[0-9]GSM`), material/construction allowlist hits, place-of-origin ("Made in"). Compute `specificityDensity = signals / max(1, contentWords/25)`. Reward up to +25; **require ≥ 1 concrete spec in subtitle OR bullets** or `passed=false` (luxury copy must show something checkable).
6. **Voice-allowlist adherence (reward).** Allowlist hits add small positive weight (capped) — nudges toward brand lexicon without keyword-stuffing (cap prevents gaming).
7. **Reading ease (Flesch).** Implement Flesch Reading Ease in-module (syllable counter via vowel-group heuristic; sentence split on `.?!`; word count). Target band **55–75** for PDP body; reward in-band, mild penalty 50–55 and 75–85, larger penalty < 45 (too dense) — never hard-fail on this alone. For `kind:'trust'` pages, target **≥ 65**.
8. **Structure / format checks.** Title word-count 1–6; subtitle present & contains a spec; 3–5 bullets; each bullet front-loaded with a noun/number (penalize bullets starting with "This/The/A/Very"); description ≤ ~55 words and 2–4 sentences; no ALL-CAPS words > 4 chars except known brand tokens (XIV, GSM, OS). Each miss = small penalty + reason.
9. **Price-presentation check.** If `priceMinor` present: `priceMinor % 100 !== 0` → flag "non-whole price"; last two digits ∈ {99,95,98} → flag "charm pricing (off-brand)". These are **brand violations** (cap score, `passed=false`) per Part 3.5, not hard fabrication fails.
10. **"You"-framing balance.** Reward presence of ≥1 second-person/"person who" reference; penalize > ~3 "you/your" per 60 words (mass-market chumminess). Light touch.

### 4.3 Scoring model (deterministic)
- Start `score = 100`.
- Apply hard-fail checks first: any `hardFails` → `passed = false`, `score = min(score, 25)`, return early-ish (still report all reasons).
- Subtract penalties (filler, structure, reading-ease, price, hype) and add capped rewards (specificity, allowlist).
- Clamp 0–100. **Gate threshold:** `passed = (hardFails.length === 0) && (hype === 0) && (priceOk) && (hasConcreteSpec) && (score >= THRESHOLD)`; default `THRESHOLD = 70`.
- `band`: ≥85 "on-voice", 70–84 "acceptable", 50–69 "off-voice (revise)", <50 "reject".
- Output `reasons[]` are human-readable, actionable ("Replace 'premium' (filler) with a material spec"; "Charm price 18900 → round to 19000 or 18000"; "Add a GSM/material fact to the subtitle"). These surface in the review queue exactly like imagery-gate notes.

### 4.4 Pipeline integration
- Add a `copy_on_voice` gate to the candidate's gate set (sibling to `human_approved`, imagery gate). A candidate with failing copy **cannot present as "ready"**; the agent must regenerate copy (it's deterministic, so the agent can iterate against the scorer until `passed`). Humans still do final approval — the gate just prevents junk reaching them.
- Because `scoreCopy` is pure, it's unit-testable with `node:test`: golden on-voice fixtures (the Altar XIV capsule should score ≥ 85), and adversarial fixtures (a string with "ACT NOW! Only 3 left! Was $99 now $49!!!") must hard-fail. Fuzz with the seeded RNG to assert no dishonest pattern ever passes.

### 4.5 Honesty guardrail (explicit)
The scorer is the charter's teeth for language. It **forbids manipulation by construction**: any fabricated-scarcity / fake-proof / padded-price / unverifiable-superlative string is a hard fail that no other score can overcome, and scarcity/urgency claims are only permitted when a **verified live data field** backs them. The honest alternative is always available and rewarded: state the *real* run size, the *real* return window, the *real* spec.

---

## PART 5 — CTA, PDP & TRUST-PAGE PATTERNS (buildable templates)

### 5.1 CTA / microcopy patterns
| Slot | Eclipse pattern | Avoid |
|---|---|---|
| Primary buy | **Add to Bag** (Add to Cart acceptable) | "BUY NOW", "ORDER NOW", "GET IT NOW" |
| Out of stock | **Notify me when it returns** (honest, opt-in) | "Selling out — hurry!" |
| Capsule entry | **Enter the Capsule** / **Discover** / **Explore** | "Shop the sale" |
| Reserve/preorder | **Reserve** / **Request** (only if real) | fake "pre-order before it's gone" |
| Checkout reassurance microcopy | "Secure checkout. 30-day returns. Ships in 2–3 days." (state real terms) | "100% safe! Guaranteed!" |
| Cart nudge (honest) | "One piece per size in this run." *(only if literally true)* | fake "Only 2 left!" |

CTA copy rules: experiential verb, first-person where natural ("Add to *my* Bag" is optional and on-evidence), one primary action per view, never two competing primaries.

### 5.2 PDP copy structure (top → bottom)
1. **Eyebrow:** `ECLIPSE · ALTAR XIV` (small caps).
2. **Title + subtitle (spec hook).**
3. **Price** — rounded whole number, calm, same weight, currency symbol; no strike-through.
4. **Primary CTA** (Add to Bag) above the fold, with honest reassurance microcopy beneath.
5. **Editorial description** — 2–3 front-loaded sentences (identity → construction → durability/origin).
6. **Benefit bullets (3–5)** — `**Spec** — why it matters`, bold the spec.
7. **Spec table** — grouped, zebra rows, normalized units.
8. **Care / origin / returns** in plain language.
9. **(No fabricated reviews/scarcity anywhere.)**

### 5.3 Trust / policy page plain-language patterns (clarity = conversion)
67% of shoppers read the return policy before buying; unclear policies are the #1 driver of chargebacks; plain language can lift satisfaction and cut disputes [Upsell; ShipBuddies; ConvertMate]. Eclipse trust pages target **Flesch ≥ 65**, short declarative sentences, second person, real numbers:
- **Returns:** "You have 30 days to return any piece for a full refund. Tell us by email; we send a prepaid label; your refund lands in 5–7 days." (Concrete days, active voice, no jargon.)
- **Shipping:** state real handling + transit windows and cost; no "FREE!!!" — write "Shipping included over $X" if true.
- **Authenticity/provenance:** state where it's made and the run size honestly; this *is* the luxury story.
- Keep brand voice even here (Allbirds-style: clear, on-voice, no legalese) [Shopify microcopy].

---

## KEY NUMBERS TO REMEMBER (for the build)
- Charm pricing +~**24%** in the MIT/U-Chicago apparel test — **but luxury uses round/prestige pricing** (odd=value, even=prestige, *JCR*). Eclipse → rounded only.
- First-person CTA up to **+90%** (Unbounce; outlier) / ~**+25%** ("Add to My Cart"); treat as directional, not promised.
- F-pattern is a **failure state**; structure (headings, bold keywords, front-loading, bullets) makes users actually read.
- **~50%** of sites have unscannable spec sheets; **horizontal zebra shading** wins (Baymard).
- **67–73%** of shoppers read returns before buying; clarity cuts disputes — trust pages **Flesch ≥ 65**.
- Identity-noun ("be a voter") effect **failed to replicate** — use identity voice because it's true, not for a claimed lift.
- Alt text: meaningful, **< ~125 chars**, no "image of," matches brand tone (WCAG 1.1.1).

---

## SOURCES
- Knowadays — Concrete vs. Abstract Language in Copywriting: https://knowadays.com/blog/concrete-vs-abstract-language-which-is-best-for-copywriting/
- Diginamix — Concrete vs Abstract / sensory-rich words: https://www.diginamix.marketing/concrete-vs-abstract-why-sensory-rich-words-win-in-marketing
- Hidden Falls Media — 4 C's neuroscience copywriting: https://hiddenfallsmedia.com/the-4-cs-of-copywriting-a-neuroscience-backed-framework/
- Elementor — 800+ Power Words: https://elementor.com/blog/power-words/
- OptinMonster — 700+ Power Words: https://optinmonster.com/700-power-words-that-will-boost-your-conversions/
- Neuromarketing — Verbs Beat Adjectives: https://www.neurosciencemarketing.com/blog/articles/verbs-adjectives.htm
- Medium / Lata Tewari — Swap Adjectives for Verbs: https://medium.com/@LataTewari/supercharge-your-copywriting-by-swapping-adjectives-for-verbs-25cb3836ece6
- Copyblogger — Persuasive Copywriting Words: https://copyblogger.com/persuasive-copywriting-words/
- National Geographic — Power of Nouns ("be a voter"): https://www.nationalgeographic.com/science/article/the-power-of-nouns-tiny-word-change-increases-voter-turnout
- Stanford SPARQ — Don't Just Vote, Be a Voter: https://sparq.stanford.edu/solutions/dont-just-vote-be-voter
- PNAS 2016 (Gerber et al.) — subtle linguistic cues fail to replicate: https://www.pnas.org/doi/10.1073/pnas.1513727113
- Kissmetrics — CTA Button Best Practices: https://www.kissmetrics.io/blog/cta-button-best-practices
- VerticalResponse — Write CTAs from reader's POV (first-person): https://verticalresponse.com/blog/3-reasons-why-you-should-write-ctas-from-the-readers-point-of-view/
- Upward Engine — High-converting CTA buttons: https://upwardengine.com/blog/cta-button-high-converting/
- Atticus Li — Why button color tests are worthless: https://atticusli.com/blog/posts/cta-button-ab-tests-why-button-color-tests-are-worthless/
- UX Movement — Add to Cart vs Add to Bag: https://uxmovement.com/buttons/add-to-cart-vs-add-to-bag-which-button-label-to-use/
- Conversion Fanatics — Add to Bag vs Add to Cart (testing): https://conversionfanatics.com/add-to-bag-vs-add-to-cart/
- Appnova — Luxury copywriting essentials: https://www.appnova.com/8-copywriting-essentials-to-turn-luxury-brand-browsers-into-buyers/
- Appnova — Why luxury brands need a distinct voice: https://www.appnova.com/why-luxury-brands-need-a-distinct-voice-in-2025/
- ProCopywriters — Copywriting for luxury brands: https://www.procopywriters.co.uk/2023/12/make-it-memorable-copywriting-for-luxury-brands/
- Croud — Ad copywriting for luxury brands: https://croud.com/en-us/resources/the-lessons-weve-learnt-about-ad-copywriting-for-luxury-brands/
- Price2Spy — Charm pricing science: https://www.price2spy.com/blog/charm-pricing/
- Business.com — How the number 9 affects purchase behavior: https://www.business.com/articles/the-game-of-pricing-how-the-number-9-affects-purchase-behavior/
- Omnia Retail — What is charm pricing (odd vs even / prestige): https://www.omniaretail.com/blog/what-is-charm-pricing
- Phoenix Strategy Group — 9 pricing psychology tips: https://www.phoenixstrategy.group/blog/9-pricing-psychology-tips-for-better-unit-economics
- Intuit — Psychological / odd-even / charm pricing: https://www.intuit.com/enterprise/blog/pricing/psychological-pricing/
- Capital One Shopping — Pricing Psychology Statistics (charm, left-digit): https://capitaloneshopping.com/research/pricing-psychology-statistics/
- ResearchGate — Coulter & Coulter, font size & price (size congruity): https://www.researchgate.net/publication/309183936
- PMC — Size-Congruency Effect: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4976128/
- NN/g — F-Shaped Pattern, Misunderstood but Relevant: https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/
- NN/g — Four Dimensions of Tone of Voice: https://www.nngroup.com/articles/tone-of-voice-dimensions/
- NN/g — Impact of Tone of Voice on Brand Perception: https://www.nngroup.com/articles/tone-voice-users/
- Baymard — Spec Sheet Scannability (50% get it wrong): https://baymard.com/blog/spec-sheet-scannability
- Baymard — Product Page Usability research: https://baymard.com/research/product-page
- Baymard — Informational image accessibility / ALT text: https://baymard.com/blog/informational-image-accessibility
- Acquia — From F to Z reading patterns: https://www.acquia.com/blog/content-reading-patterns
- BlurTest — F-pattern and Z-pattern: https://www.blurtest.com/blog/f-pattern-and-z-pattern-how-users-actually-scan-your-website
- Graphic Mint — Reading patterns F to Z: https://graphicmint.com/design-reading-patterns/
- Readable — Flesch Reading Ease & Flesch-Kincaid: https://readable.com/readability/flesch-reading-ease-flesch-kincaid-grade-level/
- Elite Editing — Right Flesch Reading Ease for content: https://eliteediting.com/resources/content-marketing/whats-the-right-flesch-reading-ease-for-content/
- YouStable — What is Flesch Reading Ease 2026: https://www.youstable.com/blog/what-is-flesch-reading-ease/
- EngageBay — Email spam words list 2026: https://www.engagebay.com/blog/spam-words-list/
- ActiveCampaign — 188 spam words: https://www.activecampaign.com/blog/spam-words
- Mailmeteor — 349+ spam words: https://mailmeteor.com/blog/spam-words
- FTC — Report on dark patterns (2022): https://www.ftc.gov/news-events/news/press-releases/2022/09/ftc-report-shows-rise-sophisticated-dark-patterns-designed-trick-trap-consumers
- ACM (Netherlands) — Misleading countdown timers enforcement: https://www.acm.nl/en/publications/acm-confronts-online-stores-using-misleading-countdown-timers-their-practices
- Deceptive Design — Urgency (Ch.15): https://www.deceptive.design/book/contents/chapter-15
- Growth Suite — FTC rules for countdown timers: https://www.growthsuite.net/questions/what-ftc-rules-apply-to-timers
- Upsell — Ecommerce return policy (67% read it): https://upsell.com/blog/ecommerce-return-policy
- ShipBuddies — How returns affect trust: https://www.shipbuddies.com/how-returns-affect-customer-trust/
- ConvertMate — Return policy builds trust: https://www.convertmate.io/blog/how-to-use-your-return-policy-to-build-trust-with-customers
- Shopify — Writing microcopy for ecommerce UX: https://www.shopify.com/enterprise/blog/how-to-write-microcopy-that-influences-customers-even-if-they-don-t-read-it
- Level Access — Alt text for accessibility: https://www.levelaccess.com/blog/alt-text-for-accessibility/
- TestParty — Alt text guide / WCAG 1.1.1: https://testparty.ai/blog/alt-text-guide
- FasterCapital — Branding & storytelling (oxytocin/identity): https://fastercapital.com/content/Branding-and-storytelling--The-Science-Behind-Successful-Brand-Storytelling.html
- Storytelling & brand love (PANDORA case, PMC): https://pmc.ncbi.nlm.nih.gov/articles/PMC8494506/
