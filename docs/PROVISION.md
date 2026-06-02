# PROVISION — making the live store show products

> Why a fresh deploy looks empty, and the one command that fixes it. Verified end-to-end
> (local, demo fixtures) on 2026-06-02.

## TL;DR
The storefront, catalog, pricing, drops, rebrand, and recommendation rails **all work**. A new
Medusa Cloud deploy looks empty because **Cloud runs migrations on deploy, not seed** — the database
has no catalog until it's bootstrapped. Fix = run `bootstrap` against the Cloud DB (now automated via
the `predeploy` hook), then make sure the storefront's publishable key matches.

## What populates the store
`scripts/bootstrap.ts` — one idempotent command (safe to re-run) that does everything a fresh DB needs:

| Step | Script | Result |
|------|--------|--------|
| catalog | `seed.ts` | products from the Bright Data **Amazon/Shein** samples → 5 chapters. Only the **5+5 fixtures** are committed (`packages/data/fixtures/`), so a clean run seeds **~10 demo products + 2 drops**. |
| commerce | `setup-commerce.ts` | US region · stock location · fulfillment · service zone · free-shipping option · sales-channel link |
| prices | `setup-prices.ts` | every variant priced in USD (required for checkout + price display) |
| inventory | `setup-inventory.ts` | drop-ship config (`manage_inventory=false`, backorder on) |
| tiers | `seed-monetization.ts` | membership tiers (disciple, patron) |
| key | `ensure-publishable-key.ts` | find-or-create a publishable API key, **linked to the sales channel**; prints `PUBLISHABLE_KEY=pk_…` |

Pricing only renders with three things wired (bootstrap does all three): a **region**, products in the
**sales channel tied to the publishable key**, and the storefront fetching with `region_id` +
`*variants.calculated_price` (it already does).

## Auto-provisioning on deploy (wired)
`apps/backend/package.json` → `"predeploy": "bash ../../scripts/predeploy.sh"`. Medusa Cloud runs
`predeploy` on every deploy, after build, before the app starts. The script:

1. **`medusa db:migrate`** — fatal (a bad schema blocks the release).
2. **`bootstrap.ts`** — idempotent, **non-fatal** (a seed hiccup can never break a deploy).

**Disable the seed without a code change:** set `AUTO_BOOTSTRAP=false` in the Cloud backend env
(migrations still run). Do this once you move from demo data to a real/managed catalog.

## ⚠ The one manual step: match the publishable key
Auto-bootstrap creates/links a key in the **backend DB**, but the storefront sends the key baked into
its build via `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`. They must be the same value:

- **If the storefront already has a `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` that exists in the DB**, bootstrap
  links *that* key → products appear, no change needed.
- **Otherwise** (e.g. first ever provision): read the `PUBLISHABLE_KEY=pk_…` from the deploy logs (or
  Medusa Admin → Settings → Publishable API Keys), set it as the storefront's
  `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` in Medusa Cloud, and **redeploy the storefront** (NEXT_PUBLIC vars
  are baked at build time). One-time; stable after that.

## Manual provisioning (if you'd rather not auto-seed)
Set `AUTO_BOOTSTRAP=false`, then run once against the Cloud DB:

```bash
# From Medusa Cloud's console/shell (DATABASE_URL already set):
cd apps/backend && npx medusa exec ../../scripts/bootstrap.ts

# …or from your machine, if you can reach the Cloud Postgres:
cd apps/backend && DATABASE_URL="<cloud postgres url>" npx medusa exec ../../scripts/bootstrap.ts
```
Managed Postgres is often reachable only from the Cloud network — if the second form can't connect,
use the console form.

## Optional: ORACLE rails + hybrid search (embeddings)
Recommendation rails and `/store/search` rank by pgvector embeddings. Bootstrap intentionally skips
them (needs the extension). To enable:

```bash
# enable the extension on the DB once:  CREATE EXTENSION IF NOT EXISTS vector;
cd apps/backend && DATABASE_URL="<db url>" npx tsx ../../scripts/setup-embeddings.ts
```
Without it, chapter pages, drops, and direct product views still work; the personalized home rails just
fall back / stay sparse.

## Catalog depth
- **Now:** ~10 demo fixtures (chosen for first light). Clearly placeholder Amazon/Shein sample data.
- **Fuller demo:** drop the full Bright Data sample CSVs (`amazon-products.sample.csv`,
  `shein-products.sample.csv`, ~400 rows each) into `packages/data/`, then re-run bootstrap — same command.
- **Real catalog / suppliers:** there are **no real partner or dropship integrations** yet. The
  drop-order flow's `notifySupplier` is mocked (`place-drop-order.ts`), and `supplier_*` fields are
  placeholders. Real sourcing is a separate effort (real supplier feed + order routing).

## Verified (local, 2026-06-02)
Fresh DB → `bootstrap` (exit 0) → boot backend → `/store/products` returned **10 products with prices**
($89/$99/$129/$149) across all chapters → storefront rendered the products, prices, the live drop
**THE IRON GATE**, and chapter pages (e.g. **Penumbra** at $89.00). The only thing the live site needs
is this same bootstrap against its DB + the key match above.
