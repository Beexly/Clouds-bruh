# Lumera — The Broadcast
Lumera — a living, intelligent marketplace: every category, broadcast in real time and personalized to you. Self-improving, agent-run.

**Start here:** `docs/ARCHITECTURE.md` (source of truth) → `docs/INTEGRATIONS.md` (v0.2 upgrades) → `BUILD.md` (runbook).
**Dropship lane:** `docs/LUMERA_SOURCING_STACK.md` (sourcing/vendor/scraper stack — what's wired & what key turns each on) → `docs/LUMERA_DROPSHIP_RUNBOOK.md`.
**For Claude Code:** `CLAUDE.md`. **For Codex:** `AGENTS.md`.
**Contributing / verify flow:** `CONTRIBUTING.md`. **Backup & incidents:** `docs/DR_RUNBOOK.md`, `docs/INCIDENT_RUNBOOK.md`.

Stack: Medusa v2 · Postgres/pgvector · Redis · Next.js · Anthropic SDK (custom agent tool-use loop) · Higgsfield* · claude-seo*.
<sub>* Higgsfield and claude-seo are planned integrations; their in-app tools are stubs today (see `docs/ARCHITECTURE.md` §3.4 tool status).</sub>
