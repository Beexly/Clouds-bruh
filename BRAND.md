# LUMERA — BRAND LEXICON

> The naming system for the marketplace. Lumera lives in the **Galaxy** ecosystem; its words are
> **light + celestial** — faint cousins of Galaxy, never heavy-handed. One coherent vocabulary, applied
> to everything a person sees. (Internal code identifiers are intentionally *not* renamed — see the line
> at the bottom.)

## The ecosystem
| Term | Is | Root / why |
|---|---|---|
| **Lumera** | the marketplace (the consumer brand) | *lumen* (light) + *-era* (a sphere/age) — a living field of light |
| **The Broadcast** | the storefront experience inside Lumera | a real-time stream of light/signal — what you watch and shop |
| **Galaxy** | the parent ecosystem | Lumera is one light within it |
| **Orbit** | the creator program | makers who circle Lumera |
| **ALTER** | a house label that sells on Lumera | one brand among many — *not* the platform |

## The vocabulary (what people see)
| Concept | Lumera word | Was (Alter XIV) | Note |
|---|---|---|---|
| In-store currency / credits | **Lumens** | Altar Credits | units of light · 1 Lumen = 1 credit = 1¢ |
| Loyalty program | **Luminance** | Altar Rewards | your accrued light / standing |
| Loyalty levels (earned) | **Spark → Glow → Aurora → Zenith** | Seeker → Faithful → Anointed → Elect | ascending light, by lifetime Lumens |
| Membership tiers (paid) | **Ember → Luminary** | Disciple → Patron | Luminary earns 2× Lumens |
| The autonomous agent collective | **The Constellation** | CONGREGATION | ten agents = a field of stars; the **Operator** conducts them |
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
- Optional (founder / editorial call): relight the five **Chapters** (Stillness · Armor · Signal · Altar ·
  Relentless) into a light/spectrum framing if you want the collection names fully on-lexicon too.
