# CLAUDE.md — orientation for Claude Code

You are building **Lumera**, an intelligent autonomous commerce platform. **Read `docs/ARCHITECTURE.md` first — it is the source of truth.**

## What this is
An editorial luxury commerce platform ("The Broadcast") with a GSN-class intelligence layer: real-time personalization, a learning loop, autonomous Claude-agent departments, and continuous self-audit. Commerce core is Medusa v2; storefront is Next.js; the agents currently run on a **custom tool-use loop built on the raw Anthropic SDK** (`@anthropic-ai/sdk`) in `apps/intelligence/src/orchestrator/run-agent.ts`. The `@anthropic-ai/claude-agent-sdk` package is declared but **not currently imported/used** — migrating onto it is a future step.

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
- **Brand integrity**: dark luminous editorial luxury. Off-brand assets don't ship. Use the frontend-design skill for UI.
- Use the local Anthropic repos for patterns: `claude-agent-sdk-python`/typescript, `claude-cookbooks`, the `claude-code` action. Prefer adapting these over reinventing agent loops, tool use, or memory. (Reality check: the current runtime hand-rolls the tool-use loop on the raw `@anthropic-ai/sdk`; the `@anthropic-ai/claude-agent-sdk` dep is declared but unused. Moving onto the agent SDK is the intended direction.)
- Install the **claude-seo** plugin for the Scribe agent's SEO work instead of rebuilding SEO.

## Lumera dropship lane
- Founder flow: run `/lumera-curate`, open `/cockpit`, pick candidates, then use `/lumera-publish-approved`.
- Safety flow: run `/lumera-vendor-preflight` before any live curation or publish work.
- Fulfillment flow: run `/lumera-fulfillment-drill`; live supplier order submission stays off unless `VENDOR_LIVE_MODE=true` and `AUTO_SUBMIT_VENDOR_ORDERS=true`.
- Product studio flow: use `/lumera-product-studio` for Garrett-designed Printify/Printful drafts and require sample approval for sizing-sensitive or unknown-quality products.
- Launch flow: `/lumera-launch-preflight` must keep build, tests, commerce env, and vendor readiness as separate proof layers.

## Quality bar
Galaxy Sports Network. If it isn't intelligent, dynamic, personalized, self-improving, and beautiful, it isn't finished.

---

# Shared Codex ↔ Claude Code Coordination

> Appended alongside the orientation above. The project brief stays the source of truth; this section governs how Claude Code and Codex hand work off to each other.

## Operating Rule

Before doing any work, read:

- AGENTS.md
- .agent/HANDOFF.md
- .agent/WORK_QUEUE.md
- .agent/DECISIONS.md

## Role

Claude Code should act as:

- implementation agent
- documentation agent
- UI/code execution agent
- repo cleanup agent

## Rules

- Work from `.agent/WORK_QUEUE.md`.
- Do not overwrite Codex work.
- Keep changes focused.
- Prefer small, reviewable commits.
- Before stopping, update `.agent/HANDOFF.md`.

## Finish Checklist

Before finishing, report:

- files changed
- tests run
- remaining risks
- what Codex should review next
