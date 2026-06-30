# Seed datasets

## What actually ships in the repo

Two tiny **synthetic** verification fixtures (5 rows each, clearly labelled, **no real imagery** —
`image_url`/`main_image` are blank), used by `scripts/seed.ts` as a fallback so `pnpm seed` always
produces a queryable catalog locally and in CI:

- `fixtures/amazon-products.fixture.csv` — columns: `asin, title, description, categories,
  final_price, image_url, brand, rating, reviews_count`
- `fixtures/shein-products.fixture.csv` — columns: `product_id, model_number, product_name,
  description, category_tree, root_category, final_price, main_image, rating, reviews_count`

These exist for local/CI verification only. They are **not** a merchandisable launch catalog.

## Real / larger datasets (not committed)

`scripts/seed.ts` first looks for `*.sample.csv` Bright Data sample exports
(`amazon-products.sample.csv`, `shein-products.sample.csv`) and falls back to the fixtures above when
they are absent. The `.sample.csv` files and any Bright Data full exports are **git-ignored**
(`packages/data/*.csv`) and must be supplied out-of-band — they are not in the repo.

A genuinely launch-quality catalog comes from founder-curated, approved products (see the Lumera
curation board / `LUMERA_OWNER_ACTIONS.md`), not from these fixtures.

## Product-model reference

For the canonical product/event schema see `docs/ARCHITECTURE.md` and
`packages/shared/src/types.ts`. Useful real-world primitives to model when sourcing real data:
ranking/social-proof (rank, reviews, ratings), identifiers (gtin/upc/sku), variations
(sizes/colors), and category trees.
