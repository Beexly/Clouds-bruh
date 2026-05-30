# Seed datasets (Bright Data samples)
Trimmed samples (~400 rows each) for local seeding + schema reference:
`amazon-products.sample.csv`, `shein-products.sample.csv`, `walmart-products.sample.csv`.

These are the blueprint for the product model (see `docs/ARCHITECTURE.md` §4). Columns worth stealing:
- Amazon: `bs_rank`, `bought_past_month`, buybox, `discount`, `variations` (ranking + social proof primitives)
- Walmart: `gtin`, `upc`, `sku`, `unit_price`, `breadcrumbs`
- Shein: `all_available_sizes`, `related_products`, `color`, `category_tree`

Full datasets (1,000+ rows each, + Shopee/Lazada + promotions): Bright Data ecommerce dataset samples.
