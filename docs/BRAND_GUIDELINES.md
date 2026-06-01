# LUMERA — Brand Guidelines v2 (evidence-tagged)

*A Galaxy company. Structure modeled on a modern brand book; identity is Lumera's own.*

> **Implementation status (this repo):** the load-bearing **[DATA]** specs are live in code —
> the desaturated palette (`apps/storefront/tailwind.config.ts`, `globals.css`) and the wordmark
> mechanics (eased tracking, medium weight, flat Corona). Wordmark case locked to **(A) lowercase
> `lumera`**. Brand display strings resolve through `apps/storefront/src/lib/brand.ts`.
> Still to lock for production: licensed display typeface + print CMYK/Pantone.

---

## How to read this version

Every load-bearing spec carries one of three tags:

- **[DATA]** — backed by peer-reviewed marketing/design research (cited inline; full list in *Sources*).
- **[CONVENTION]** — standard, defensible industry practice, but not from a specific study.
- **[TASTE]** — aesthetic call. Defensible, but evidence is neutral — stress-test it freely.

**What changed from v1:**
1. Wordmark letter-spacing eased from ~0.18em to ~0.08–0.10em, minimum weight raised — heavy tracking + thin strokes hurt glance-legibility **[DATA]**.
2. Body/UI type spec'd to sentence case (not lowercase styling) for readability **[DATA]**.
3. Added a *prototypicality* rule: restraint must not cost "instantly reads as a marketplace" **[DATA]**.
4. Signal-violet kept desaturated — saturation fights the premium signal **[DATA]**.
5. Lowercase-vs-uppercase wordmark surfaced as an open decision (§2) — **locked to (A) lowercase in code**.

---

## 0. How to use this

The usage book — how to apply the brand, not the strategy. When in doubt, choose restraint. The fastest way to make Lumera look cheap is to add more; the fastest way to look premium is to take away.

**The one correction that governs everything — restraint, but recognizable. [DATA]** First impressions form in ~50ms and halo onto perceived trust and usability (Lindgaard et al. 2006). Lower visual complexity improves that impression — *but only alongside prototypicality*: the page must also look like the kind of site it is (Reinecke et al. 2013). For Lumera: calm and uncluttered, **and** unmistakably a marketplace — visible search, a product grid, obvious CTAs. Calm, not cryptic.

---

## 1. Brand attributes

| Attribute | What it means |
|---|---|
| **Luminous** | Light is the hero. Things emerge from dark, clean and bright. |
| **Rare** | Scarcity and timing. A drop is an event, not a restock. |
| **Effortless** | Premium through subtraction. Calm, fast, uncluttered — *but still legibly a store.* |
| **Expansive** | An everything-platform. Neutral enough to hold any category. |

Supporting keywords: *quiet, precise, cosmic, confident, modern.*

---

## 2. Logo & wordmark

- **Mark — the corona ring:** a thin luminous ring around a dark disc, with one bright "first-light" point at the ring's edge. Crisp and flat. No glow. **[DATA]** Circular logos activate warmth/wholeness associations and lifted willingness-to-pay vs angular marks (Jiang et al. 2016, *JCR*, five experiments). *Tradeoff:* a circle does not signal hard/technical/rugged.
- **Wordmark:** `lumera`, tracked grotesque at **~0.08–0.10em**, **medium weight or heavier**. **[DATA]** For glanced strings, heavy tracking + thin/condensed weights are worst for legibility (NN/g 2020).
- **Wordmark case — LOCKED to (A). [TASTE]** Two sanctioned options; **(A) lowercase `lumera`** chosen — modern, quiet-luxury — executed with eased tracking + medium weight; favicon uses the mark-only so small-size legibility holds. (B) spaced uppercase `L U M E R A` remains a one-line swap if more glance-legibility / traditional-luxury authority is wanted.
- **Lockups:** horizontal (mark + wordmark); stacked (mark over wordmark); mark-only (favicons, watermarks, tags).
- **Clearspace:** 50% of the mark's height on all sides. **[CONVENTION]**
- **Misuse — never:** recolor the mark; add glow/gradient/shadow/bevel; stretch/rotate/outline; place on busy imagery; redraw the ring; set the wordmark in another typeface.

---

## 3. Tagline

**"Some things only happen once."** Use strategically — a headline or closing anchor (a drop launch, a campaign end-card), not everyday chrome.

**[DATA] + a hard condition.** Scarcity/rarity cues raise perceived value and purchase intention; exclusivity lifts premium-good value (Lynn 1992; Cialdini 2008). Loss-framing beats gain-framing (Cialdini 2008). **Non-negotiable:** scarcity only works while *genuine* — fake counts/resetting timers reverse the effect and erode trust the moment they're detected. Lumera's drops must be real.

---

## 4. Color

| Role | Name | HEX | RGB |
|---|---|---|---|
| Base | Eclipse | `#0B0B0D` | 11 / 11 / 13 |
| Primary accent | Corona | `#E9D8A6` | 233 / 216 / 166 |
| Light | First Light | `#F4EEDD` | 244 / 238 / 221 |
| System accent | Signal | `#6E5BD6` | 110 / 91 / 214 |
| Neutral | Umbra | `#54545A` | 84 / 84 / 90 |

*CMYK + Pantone to be matched at print production.*

**Strongest evidence in the book. [DATA]** Across seven studies, *less saturated* colors raised perceived status of premium brands — low saturation reads as heritage/time, the engine of "quiet luxury" (Zhou, Xiao, Yoon & Zhu 2025, *JCR*). Color's other proven jobs are recognition and differentiation, driven by *congruence* with the claimed brand personality, not fixed meanings (Labrecque & Milne 2012; Bottomley & Doyle 2006).

**Keep Signal desaturated. [DATA]** A loud violet would fight the status the rest of the palette earns. Treat `#6E5BD6` as a near-ceiling.

**One accent at a time. [CONVENTION]** Corona-gold for premium/editorial; Signal-violet for functional UI. Never both loud in one frame — that's the fake-luxury tell.

---

## 5. Typography

- **Display (wordmark, headlines):** a refined grotesque, per §2. Lock one licensed typeface. Style is a signal choice **[TASTE]**, constrained by §2 glance-legibility mechanics **[DATA]**.
- **Body & UI:** **sentence case**, not lowercase styling. **[DATA]** All-caps and uniform-lowercase read slower than sentence case (Perea et al.; NN/g 2020). Easy-to-read type raises credibility via processing fluency.
- **Legibility floor. [DATA]** Generous x-height; avoid extremely thin strokes (they break at favicon/mobile/caption sizes).
- **Two weights only — regular + medium.** Hierarchy from size and space. **[CONVENTION]** First Light on Eclipse is the default text pairing.

---

## 6. Light & motion (textures)

Lumera's "texture" is light itself, not a pattern. **[TASTE]**

- **The reveal:** content emerges from black as an arc of light widening into the ring — default loading/page transition.
- **Totality countdown:** the ring narrows to a sliver as a drop nears, snaps to full corona at launch. *(A genuine scarcity cue — tie to real drop timing per §3.)*
- Light **decorates, not distracts**. No persistent neon, no gradients on type. **[DATA-adjacent]** Keeps complexity low (§0).

---

## 7. Sub-branding (kept light)

- **Galaxy** — the parent. A small endorsement ("a Galaxy company"); never competes with Lumera.
- **ALTER** — a house label that sells *on* Lumera; one among many. Its own identity is allowed; on Lumera surfaces it follows Lumera's rules.
- **Orbit** — the creator program. Creator-facing only.

**Core rule. [CONVENTION]** A sub-brand never overshadows Lumera; in any co-lockup, Lumera reads first.

---

## 8. Imagery

Editorial, near-black, high-contrast. Light is the subject — a rim, a glow on an edge, a single bright point. One accent color per image. **[DATA-adjacent]** Low-saturation high-contrast editorial reinforces premium status (Zhou et al. 2025) and keeps complexity low (Reinecke et al. 2013). Avoid stock-lifestyle clutter and the gradient-heavy "premium dropship" look.

---

## 9. Voice

Confident, spare, a little mythic — never precious. Short sentences. Light/dark imagery with restraint. **[TASTE]**

- ✓ "It drops at totality. Then it's gone."
- ✓ "Found something you'll never see twice."
- ✗ "Align your soul with the cosmic marketplace of light." (too much)
- ✗ "Shop our huge selection of deals!" (too generic)

---

## 10. Applications

- **App icon:** corona ring + first-light point on Eclipse, rounded square. Must read at 16px. **[DATA]**
- **Site header:** wordmark left, live drop board center; keep prototypical commerce cues visible (search, account, cart) — the 50ms surface. **[DATA]**
- **Checkout:** Eclipse base, First Light text, one Corona CTA.
- **Shipping box:** matte black, blind-deboss ring, one gold edge line.
- **Social:** mark-only avatar; First Light wordmark on Eclipse banner.
- **Product watermark:** mark-only, low-opacity First Light.

---

## Quick do / don't

**Do:** near-black + low-saturation **[DATA]**, one accent **[CONVENTION]**, genuinely scarce drops **[DATA]**, let light be the hero, protect clearspace, stay restrained — and recognizably a marketplace **[DATA]**.

**Don't:** glow/gradient on the mark, mix both accents loud, set the wordmark in another font, thin/heavily-tracked type at small sizes **[DATA]**, fake scarcity **[DATA]**, crowd the layout, let a sub-brand outshine Lumera, or use the tagline as filler.

---

## Sources

- Labrecque & Milne (2012), *J. Acad. Marketing Science 40*. — Color ↔ brand-personality; saturation/value amplify traits.
- Bottomley & Doyle (2006), *Marketing Theory 6(1)*. — Color appropriateness/congruence, not fixed meaning.
- Zhou, Xiao, Yoon & Zhu (2025), *Journal of Consumer Research*. — 7 studies: lower saturation → higher perceived luxury status.
- Lynn (1992); Cialdini (2008). — Scarcity/rarity raise value & intent; loss-framing > gain; fake scarcity reverses.
- Lindgaard et al. (2006), *Behaviour & Information Technology 25(2)*. — ~50ms first impression; halo onto trust.
- Reinecke et al. (2013), *Proc. CHI*. — Low complexity + high prototypicality → higher appeal.
- Jiang, Gorn, Galli & Chattopadhyay (2016), *JCR 42(5)*. — Circular = soft/warm/inclusive (+WTP); angular = competence/durability.
- Nielsen Norman Group (2020). — Glanceable typography: uppercase ~26% faster to glance; thin/condensed worst.

*v2 — operational brand book, evidence-tagged.*
