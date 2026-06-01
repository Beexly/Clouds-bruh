# Seed datasets

Committed fixtures under `fixtures/` are tiny synthetic rows for clean local
verification. They are not sellable products and are only meant to keep
`pnpm verify:api` reproducible from a fresh checkout.

Optional Bright Data samples may be added locally for richer seeding:
`amazon-products.sample.csv`, `shein-products.sample.csv`, `walmart-products.sample.csv`.
Those sample CSVs are ignored by Git.

These are the blueprint for the product model (see `docs/ARCHITECTURE.md` §4). Columns worth stealing:
- Amazon: `bs_rank`, `bought_past_month`, buybox, `discount`, `variations` (ranking + social proof primitives)
- Walmart: `gtin`, `upc`, `sku`, `unit_price`, `breadcrumbs`
- Shein: `all_available_sizes`, `related_products`, `color`, `category_tree`

Full datasets (1,000+ rows each, + Shopee/Lazada + promotions): Bright Data ecommerce dataset samples.
