# Decision Log

## Decisions

### Shared agent coordination

Codex and Claude Code will coordinate through repo files instead of trying to share one live session.

Shared files:

- AGENTS.md
- CLAUDE.md
- .agent/HANDOFF.md
- .agent/WORK_QUEUE.md
- .agent/DECISIONS.md

### Agent responsibilities

Codex should focus on:

- architecture
- review
- tests
- refactors
- risk identification

Claude Code should focus on:

- implementation
- file edits
- docs
- UI/code execution
- cleanup

### Handoff rule

Before stopping, each agent must update `.agent/HANDOFF.md` with:

- what changed
- files touched
- tests run
- remaining risks
- what the other agent should do next
