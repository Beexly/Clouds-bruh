# Agents

Single source of truth: [`src/agents/registry.mjs`](../src/agents/registry.mjs). Runtime dispatch + run logging: `src/agents/runtime.mjs`.

**Rule:** agents PROPOSE and PREPARE; humans APPROVE and PUBLISH. The only power an agent has over the live catalog is *blocking* (QA) — never *enabling*.

| Agent | Cadence | Autonomous | Gated (human) | Forbidden |
|---|---|---|---|---|
| Sourcing | every 60m | research, write product candidate, request imagery | approve, publish | mutate catalog, commit secret |
| Catalog | on `candidate.approved` | normalize approved → draft product | set visible, publish | flip visibility w/o publish |
| Pricing | every 1440m | compute margin, attach score, propose price change | apply below-floor price, publish price | hide margin from reviewer |
| Imagery | on candidate created | request/attach unapproved media | approve imagery | use unapproved media on storefront |
| Support | on inbound | draft reply, classify intent | send reply, issue refund | auto-refund |
| Orders | every 15m | advance routed→…→delivered, attach tracking | refund, force-cancel paid, enable live payments | capture funds (v1) |
| Restock | every 360m | emit signal, write restock candidate | approve restock, change live inventory | auto-restock |
| QA / Governance | every 30m | audit invariants, flag stale, **block** publish | escalate to human | approve / publish anything |

Run one agent: `npm run agent <role> [count] [seed]`. Run one cadence tick across all: `npm run tick`.

Each run records a `Task` to `data/runtime/agent-runs.ndjson` (gitignored).
