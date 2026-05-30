# Architecture

## Data flow

```
agents ──► queue (candidates.ndjson, append-only) ──► index.json (projection)
                         │
                  human review (approve)
                         │
                         ▼
          catalog.json (materialized draft) ──► publish (gate-checked) ──► live
                         │                                                   │
                  events.ndjson (audit log)                          storefront.json
                                                                    (only live products)
```

## Principles

- **Append-only truth, derived views.** `queue/candidates.ndjson` and `data/events.ndjson` are appended, never edited. `queue/index.json` and `data/catalog.json` are projections rebuilt by replay (`npm run rebuild`).
- **One read model.** `src/storefront/projection.mjs` is the only code that decides public visibility. Default-deny: `published + visible + in-stock` only.
- **One state machine.** `src/queue/transitions.mjs` is the only code that changes a candidate's status, and it encodes the human gate.
- **Deterministic.** IDs are content-addressed (`src/model/ids.mjs` + `src/lib/hash.mjs`); randomness is seeded (`src/lib/rng.mjs`); time is injectable (`src/lib/clock.mjs`).

## Stores

| Store | File | Shape |
|---|---|---|
| Catalog | `data/catalog.json` | `{ products: Product[] }` (materialized) |
| Events | `data/events.ndjson` | append-only domain events |
| Queue | `queue/candidates.ndjson` → `queue/index.json` | snapshots → latest-per-id projection |
| Storefront | `data/storefront.json` | public read model (live products only) |
| Suppliers / Collections | `data/suppliers.json`, `data/collections.json` | seeded |
| Orders / runs | `data/runtime/*` | gitignored runtime state |

## Paths

Every store accepts a `paths` object (`src/lib/paths.mjs#createPaths`) so tests run against temp directories and never touch committed data.
