# Eclipse — Design Law

Eclipse is a house in the **Galaxy Network** (sibling to Galaxy Sports). Aesthetic: **dark luxury × punk/gothic** — the breadth and autonomous curation of the mega-retailers, the polish and price confidence of the luxury houses, the edge of streetwear, kept clean and **profanity-free**. Single source of truth for identity: [`src/brand.mjs`](src/brand.mjs).

> Altar XIV is retained as a **future capsule** (sub-line), not the master brand. Its copy lives in `conversion/altar-xiv-conversion-system.md` and seeds the first apparel capsule.

## The five non-negotiables (enforced in code)

1. **Default-deny visibility.** Every product is born `draft / hidden / out-of-stock`. `src/storefront/projection.mjs` is the only place that decides what is public, emitting **only** `published + visible + in-stock`. Fuzz-tested.
2. **The queue is the only door.** Agents cannot mutate the catalog — they only append candidates. A human `approve` is the sole writer of `approved`; a distinct `publish` flips a product live. (`src/queue/transitions.mjs`)
3. **No secrets, no live calls in v1.** Integrations sit behind `src/adapters/*` with mock defaults; live adapters read `process.env` only when `ALTAR_LIVE=1`. The repo holds zero keys.
4. **Append-only truth, derived views.** `queue/candidates.ndjson` and `data/events.ndjson` are append-only; `index.json` / `catalog.json` are projections.
5. **Determinism over cleverness.** Seeded RNG, content-addressed IDs — stable tests, reproducible reviews.

## Tokens (mirror of `src/brand.mjs` palette → `public/styles/tokens.css`)

| Token | Value | Use |
|---|---|---|
| `--void` | `#0A0A0D` | page base |
| `--surface` / `--surface-hi` | `#14141A` / `#1E1E27` | raised surfaces |
| `--ink` / `--muted` | `#F4F4F6` / `#9A9AA5` | text |
| `--corona` | `#E9C46A` | primary accent (eclipse-ring gold) |
| `--plasma` | `#6C4BF4` | secondary (cosmic violet) |
| `--oxblood` | `#7A1E2B` | punk accent / danger |
| `--signal` | `#3FB6A8` | success / in-stock |

**Type:** display = Cormorant Garamond (serif, gothic-luxe) with `'Times New Roman'` fallback; body = system sans; mono for prices/IDs. Wordmark is uppercase, wide letter-spacing.

## Component contracts

- **Product card** (`.card`): media (4:5), tier badge, serif title, spec chips, mono price. Hover lifts + corona border. Only **approved** media renders.
- **Review card** (`.qcard`): title, gate badge (pass/blocked), cost + margin, imagery thumbs, **source links**, and the exact CLI approve command. This is the "links for me to look at before it goes on the site."
- **Lane bar** (`.lane`): plasma→corona fill, integer %.

## Accessibility & voice anti-patterns

- Maintain contrast on `--void`; never rely on color alone (gate badges carry text).
- **No** fabricated scarcity, fake reviews, countdown manipulation, or padded MSRPs. Urgency must be real (true inventory, real run counts).
- **No profanity.** Confidence and exclusivity are expressed through specificity and restraint, never crude language.
