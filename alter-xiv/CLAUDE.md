# CLAUDE.md — orientation for Claude Code

You are building **Alter XIV**, an intelligent commerce platform. **Read `docs/ARCHITECTURE.md` first — it is the source of truth.**

## What this is
A faith-rooted, drop-culture luxury commerce platform ("The Broadcast") with a GSN-class intelligence layer: real-time personalization, a learning loop, autonomous Claude-agent departments, and continuous self-audit. Commerce core is Medusa v2; storefront is Next.js; the agents use the Claude Agent SDK.

## Repo shape
- `apps/backend` — Medusa v2 + custom modules: `signal` (events), `personalization` (MIND), `recommendation` (ORACLE), `drops`.
- `apps/storefront` — Next.js "The Broadcast".
- `apps/intelligence` — the autonomous agent runtime (CONGREGATION) + Learning Loop + INTROSPECTION.
- `packages/shared` — types + the SIGNAL event taxonomy (the contract between apps).
- `packages/data` — Bright Data sample datasets for seeding/benchmarks.
- `scripts/seed.ts` — seed the catalog from the datasets.

## How to work
1. Build in the order in `docs/ARCHITECTURE.md` §7 and `BUILD.md`.
2. Data models first (`packages/shared/src/types.ts`) — they are hard to reverse.
3. Every custom Medusa module follows the EverShop-style anatomy: model + service + migration + api route + subscriber.
4. Personalize anything that can be personalized. Every storefront interaction must emit a SIGNAL event.
5. Agents follow `apps/intelligence/src/agents/_contract.md` — least privilege, self-audit, escalation.

## Non-negotiables (do not violate)
- **Verified, not assumed.** Don't mark anything done until it renders/compiles/passes. Write the test, run it.
- **No autonomous money movement, publishing, or destructive action** by any agent without Garrett's explicit approval. Wire approvals as a gate.
- **Brand integrity**: dark sacred editorial luxury. Off-brand assets don't ship. Use the frontend-design skill for UI.
- Use the local Anthropic repos for patterns: `claude-agent-sdk-python`/typescript, `claude-cookbooks`, the `claude-code` action. Don't reinvent agent loops, tool use, or memory — adapt these.
- Install the **claude-seo** plugin for the Scribe agent's SEO work instead of rebuilding SEO.

## Quality bar
Galaxy Sports Network. If it isn't intelligent, dynamic, personalized, self-improving, and beautiful, it isn't finished.
