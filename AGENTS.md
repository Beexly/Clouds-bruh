# AGENTS.md — orientation for Codex

Building **Alter XIV**, an intelligent commerce platform. **Read `docs/ARCHITECTURE.md` first.** It is the source of truth; this file is the quick brief.

## Mission
Ship a drop-culture luxury commerce platform with a first-class intelligence layer: personalization, a learning loop, autonomous agent "departments", and self-audit. Stack: Medusa v2 (TS) + Postgres/pgvector + Redis + Next.js + a custom agent tool-use loop on the Anthropic SDK (`@anthropic-ai/sdk`; the `@anthropic-ai/claude-agent-sdk` dep is declared but currently unused — see `docs/ARCHITECTURE.md` §1).

## Where to build what
| Task | Location |
|---|---|
| Domain types + event taxonomy | `packages/shared/src/{types,events}.ts` |
| Commerce + intelligence modules | `apps/backend/src/modules/{signal,personalization,recommendation,drops}` |
| Orchestrated processes | `apps/backend/src/workflows`, `apps/backend/src/jobs` |
| Custom API (events, recs, agents) | `apps/backend/src/api` |
| Storefront "The Broadcast" | `apps/storefront/src` |
| Autonomous agents + learning | `apps/intelligence/src` |
| Catalog seed | `scripts/seed.ts` (+ `packages/data`) |

## Rules
- TypeScript everywhere. Strict. No `any` in domain code.
- Each Medusa module = model + service + migration + api + subscriber.
- Storefront emits a SIGNAL event on every meaningful interaction (see `packages/shared/src/events.ts`).
- Agents obey `apps/intelligence/src/agents/_contract.md`: least privilege, self-audit, explicit escalation. **No autonomous spend/publish/delete without human approval.**
- Verify before done: write + run tests (Vitest), use APIAuto for API regression.

## Build order
Follow `BUILD.md`. Data models → SIGNAL/MIND → ORACLE → storefront → agents → INTROSPECTION → Learning Loop → tests.
