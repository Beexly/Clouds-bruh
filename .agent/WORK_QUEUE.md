# Shared Work Queue

## Active Tasks

### 1. Confirm repo structure

Identify:

- framework
- package manager
- test commands
- build commands
- deployment target
- environment variable requirements

### 2. Fix cloud setup reliability

Make sure cloud setup does not fail just because optional docs are missing.

### 3. Confirm agent instructions

Make sure both Codex and Claude Code can find:

- AGENTS.md
- CLAUDE.md
- .agent/HANDOFF.md
- .agent/WORK_QUEUE.md
- .agent/DECISIONS.md

### 4. Run project checks

Run available checks such as:

- install
- lint
- typecheck
- test
- build

Only run commands that exist in the repo.

### 5. Update handoff

Every agent must update `.agent/HANDOFF.md` before stopping.

## Done

- Created shared coordination files.
