# Integrations

All external services sit behind seams in [`src/adapters/`](../src/adapters/). The selector `src/adapters/index.mjs` returns **mock** implementations by default — fully offline, no secrets, no network. Live adapters are imported lazily **only** when `ALTAR_LIVE=1`, and each falls back to its mock if the live module isn't present yet.

```
ALTAR_LIVE unset/0  →  claude.mock, websearch.mock, imagegen.mock, github.mock   (Phase 1)
ALTAR_LIVE=1        →  *.live.mjs if present, else *.mock.mjs                      (Phases 2–4)
```

## Seams

| Seam | Mock (now) | Live (later) | Phase |
|---|---|---|---|
| `claude` | deterministic concept generator | Claude + web research | 5 |
| `websearch` | example.com source links | real search | 5 |
| `imagegen` | placeholder SVG MediaRefs (`approved:false`) | image/video gen MCP | 3 |
| `github` | in-memory issue store | GitHub MCP (issue per candidate) | 2 |
| `stripe` | `payments.mjs` intent-only (`live:false`) | Stripe MCP products/payment-links/refunds | 4 |

## Secrets

The repo contains **zero** credentials. `.env` is gitignored; only `.env.example` (names, no values) is committed. Live adapters read `process.env` at runtime.

## Going live (Stripe, Phase 4)

1. Set `STRIPE_SECRET_KEY` in `.env`, `STRIPE_MODE=test`, `ALTAR_LIVE=1`.
2. Verify test-mode product creation and payment links against the test dashboard.
3. Refunds remain **human-gated** (support/QA), never autonomous.
4. Going to `STRIPE_MODE=live` is a deliberate, separate, documented human action — never automated.
