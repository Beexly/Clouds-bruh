# Eclipse · Galaxy Network

An **autonomous luxury commerce house**. Agents do the work — source products, write copy, generate imagery requests, manage orders, watch inventory — and the only human touchpoint is an **approval queue**: every candidate arrives with source links, imagery, costs, and a gate snapshot for you to approve before it ever reaches the storefront.

**Dark luxury × punk/gothic.** Dependency-free Node (built-ins + `node:test` only). No secrets in the repo. Nothing goes live until a human approves it.

> Part of the Galaxy Network (sibling to Galaxy Sports). Brand identity is one file: [`src/brand.mjs`](src/brand.mjs) — change the name there and the whole system rebrands.

## The safety model in one line

**Agents propose and prepare. Humans approve and publish.** Encoded in `src/queue/transitions.mjs`: an agent actor can never reach `approved`, `publishing`, or `published`, and `approve` is refused unless the launch gate passes.

## Quickstart

```bash
npm test                         # 37 tests — the safety guarantees
npm run seed                     # seed the Altar XIV capsule (all draft/hidden/out-of-stock)
npm run agent sourcing 6         # an agent proposes 6 product candidates into the queue
npm run review list              # see the queue: titles, gate status, source links
npm run review approve <id>      # you approve → materializes a hidden draft product
npm run review publish <id>      # you publish → it goes live
npm run serve                    # storefront at http://localhost:8080, ops at /ops/
```

The storefront is empty until you approve and publish — by design. The ops console (`/ops/`) shows the live review board, progress ledger, and agent roster.

## The autonomous loop

```
sourcing agent ─► REVIEW QUEUE ─► (you approve) ─► draft product ─► (you publish) ─► storefront
   restock agent ─┘   ▲                                                   │
   pricing / imagery ─┘   every candidate carries links + imagery + costs + a gate snapshot
   qa/governance can BLOCK a publish — it can never approve one
```

## Project structure

| Path | What |
|---|---|
| `src/model/` | entities + enums + IDs + validation (Product, Order, ReviewQueueItem, …) |
| `src/scoring/` | readiness, supplier, media, pricing-margin, **launch-gate** (the publish guard) |
| `src/queue/` | append-only store, **state machine**, board, review actions |
| `src/catalog/` | event log, catalog projection, **publish** flow |
| `src/storefront/` | **default-deny projection**, brand copy, render |
| `src/agents/` | registry + runtime + sourcing/catalog/pricing/imagery/support/orders/restock/qa |
| `src/adapters/` | mock-by-default seams for Claude / web search / imagegen / GitHub / Stripe |
| `src/orders/`, `src/restock/` | order lifecycle + payment intents, restock loop |
| `public/` | storefront + `ops/` console (dependency-free, data-driven) |
| `test/` | `node:test` suite |
| `docs/` | architecture, agents, queue state machine, integrations |

## Phases

- **Phase 1 (this build):** full offline loop — seed → source → review → approve → publish → storefront, orders + restock lifecycles, scoring/gating, ops console, green tests. Mock adapters; no secrets.
- **Phase 2:** GitHub mirror — one issue per candidate for remote mobile approve/reject.
- **Phase 3:** real imagery via the image-gen MCP.
- **Phase 4:** Stripe (test mode first; going live is a deliberate, documented flip).
- **Phase 5:** broaden the Vault catalog and run agents on real cadences.

See [`docs/`](docs/) for details.
