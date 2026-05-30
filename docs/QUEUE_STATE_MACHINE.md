# Review Queue State Machine

Code: [`src/queue/transitions.mjs`](../src/queue/transitions.mjs). This is where "agents propose, humans approve" is literally enforced.

## States

`proposed → queued → in_review → { needs_changes | approved | rejected }`
`approved → publishing → published`
plus `expired`; re-entry `needs_changes → proposed` (agent revises).

## Transitions

| From → To | Actor | Guard |
|---|---|---|
| (new) → `proposed` | Agent | schema-valid; unseen idempotency key |
| `proposed` → `queued` | System (on append) | scores + gate snapshot attached |
| `queued` → `in_review` | Human | reviewer recorded |
| `in_review` → `approved` | **Human only** | `gate.passed === true` |
| `in_review` → `needs_changes` | Human | `changesRequested[]` required |
| `* ` → `rejected` | Human | note required |
| `approved` → `publishing` → `published` | Human → System | gate re-checked at publish |

## Hard invariants

- `allowed(from, to, actor)` returns **false** when `actor.kind === 'agent'` and `to ∈ {approved, publishing, published}`.
- `approved` is refused unless `gate.passed === true` (recomputed, never trusted).
- Every transition appends to `history`; nothing is mutated in place.

## GitHub mirror (Phase 2)

Each candidate ↔ one GitHub issue for remote, mobile approve/reject:

| Queue | GitHub |
|---|---|
| `proposed`/`queued` | issue opened, labels `altar:candidate`, `status:queued`; body = summary + source links + cost/score table + imagery |
| label `in-review` / `approved` / `needs-changes` / `rejected` | pulled by QA/orders tick → applied as a **human-actor** transition |
| `published` | issue closed with a link to the live product |
| `rejected` | issue closed as not planned |

### Pulling decisions back (implemented)

`src/queue/decisions.mjs#applyGithubDecision({ candidateId, labels }, actor)` maps an issue's
labels to the matching human-gated review action via `transitionForLabels`:

- On **conflicting labels, the most conservative action wins**: `reject` > `needs-changes` > `approve`.
- The labeling operator is the **actor of record** — so this routes through the same
  `review-actions` path as the CLI, and the agent-can't-approve gate still holds.
- Idempotent: already-resolved candidates are no-ops.

The agent reads issue labels via the GitHub MCP and calls this resolver; Node never calls MCP directly.
