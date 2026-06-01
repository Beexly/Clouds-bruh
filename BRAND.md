# LUMERA — BRAND LEXICON

> The naming system for the marketplace. Lumera lives in the **Galaxy** ecosystem; its words are
> **light + celestial** — faint cousins of Galaxy, never heavy-handed. One coherent vocabulary, applied
> to everything a person sees. (Internal code identifiers are intentionally *not* renamed — see the line
> at the bottom.)
>
> **Visual + voice system:** see `docs/BRAND_GUIDELINES.md` (v2, evidence-tagged) — palette, wordmark,
> motion, and voice, implemented in the storefront.

## The ecosystem
| Term | Is | Root / why |
|---|---|---|
| **Lumera** | the marketplace (the consumer brand) | *lumen* (light) + *-era* (a sphere/age) — a living field of light |
| **The Broadcast** | the storefront experience inside Lumera | a real-time stream of light/signal — what you watch and shop |
| **Galaxy** | the parent ecosystem | Lumera is one light within it |
| **Orbit** | the creator program | makers who circle Lumera |
| **ALTER** | a house label that sells on Lumera | one brand among many — *not* the platform |

## Parent & attribution
- **Brand-facing:** Lumera is endorsed as **"a Galaxy company"** — small, never competing (footer, micro · uppercase · muted).
- **Legal:** the legal entity is **Galaxy Network**; legal copy reads **"Lumera is owned and operated by Galaxy Network"** (Terms + the footer copyright bar).
- **Source of truth:** `apps/storefront/src/lib/brand.ts` → `PARENT` (`Galaxy`) and `LEGAL_ENTITY` (`Galaxy Network`). Don't hardcode the parent name anywhere else.

## Provenance (the anti-mixing rule)
Only **The Constellation**, conducted by the **Operator**, authors into this repo. Anything signed **"Eclipse · Galaxy Network"** is **not** a Lumera agent — in Lumera, *Eclipse* is the base palette color (`#0B0B0D`), and **Galaxy / Sports is a firewalled separate project** (`ALTER_TEMPORARY_HANDOFF_FOR_CHATGPT.md`: *"never import"*). Galaxy-lane artifacts — issues, branches, product candidates — do **not** belong in the Lumera repo; route product intake through **Curator**, human-approved (`docs/ARCHITECTURE.md` §3.4 / §5).

## The vocabulary (what people see)
| Concept | Lumera word | Was (Alter XIV) | Note |
|---|---|---|---|
| In-store currency / credits | **Lumens** | Altar Credits | units of light · 1 Lumen = 1 credit = 1¢ |
| Loyalty program | **Luminance** | Altar Rewards | your accrued light / standing |
| Loyalty levels (earned) | **Spark → Glow → Aurora → Zenith** | Seeker → Faithful → Anointed → Elect | ascending light, by lifetime Lumens |
| Membership tiers (paid) | **Ember → Luminary** | Disciple → Patron | Luminary earns 2× Lumens |
| The autonomous agent collective | **The Constellation** | CONGREGATION | ten agents = a field of stars; the **Operator** conducts them |
| The conversational guide (concierge) | **Polaris** | the Shepherd | one guiding star in the Constellation; advisory only (component + `/store/shepherd` keep the codename) |
| Curated collections | **Chapters** (Stillness · Armor · Signal · Altar · Relentless) | — | kept for now; a cross-category curation overlay, *not* an apparel lock. A future editorial pass may relight these. |

## Voice
Dark, editorial, spare, premium. Confident and warm. General — everything worth having, across every
category — not faith- or apparel-specific (that register belongs to the **ALTER** house label, not to Lumera).

## What is NOT renamed (engineering boundary — deliberate)
Brand = the display layer. The load-bearing internals stay so the live deployment never breaks and no
migration is needed: the `alter-xiv/` path, the `deploy/medusa-cloud` branch, `@alterxiv/*` packages, Medusa
**module** names (`monetization`, `drops`, `signal`, …), DB tables/columns, and the data **keys**
(`credits`, tier keys `disciple`/`patron`, the `congregation` job group, segment enums). Users never see
these; renaming them would be cost with no brand value. The single display source for the storefront is
`apps/storefront/src/lib/brand.ts`.

## Follow-up
- ✅ **Agent voices generalized** to Lumera's register (dark · luminous · editorial · spare). Faith/
  drop-house/scripture copy removed across the Constellation and the Shepherd; "sacred editorial" →
  "luminous editorial" throughout.
- ✅ **Brand Guidelines v2 implemented** (`docs/BRAND_GUIDELINES.md`): desaturated palette
  (Eclipse · Corona · First Light · Signal · Umbra), corona-ring favicon, lowercase grotesque
  wordmark, flat foil. Remaining faith-coded storefront copy neutralized — chapter lines, the
  checkout / error / product strings, and the concierge (**the Shepherd → Polaris**).
- Optional (founder / editorial call): relight the five **Chapters** (Stillness · Armor · Signal · Altar ·
  Relentless) into a light/spectrum framing if you want the collection names fully on-lexicon too.
