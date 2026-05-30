# CLAUDE.md — Eclipse (Galaxy Network)

Guidance for any future Claude/Codex session working in this repo. Read this first.

## What this is

**Eclipse** is an autonomous luxury commerce house in the Galaxy Network (sibling to Galaxy Sports). Agents source products, write copy, request imagery, manage orders, and watch inventory; the **only** human touchpoint is an approval queue. Aesthetic: dark luxury × punk/gothic, profanity-free.

Brand identity is one file: `src/brand.mjs`. Change `name`/`key` there and the whole system rebrands. (Altar XIV is a retained *future capsule*, not the master brand; its copy is in `conversion/altar-xiv-conversion-system.md`.)

## The prime directive

**Agents propose and prepare. Humans approve and publish.** Never weaken this. The enforcement points:

- `src/queue/transitions.mjs` — an `agent` actor can never reach `approved`/`publishing`/`published`; `approved` requires `gate.passed === true`.
- `src/storefront/projection.mjs` — default-deny: only `published + visible + in-stock` products are ever public (fuzz-tested).
- `src/scoring/launch-gate.mjs` — `human_approved` is a required launch gate.

If you touch these, the safety tests must stay green and the invariant must hold.

## Hard constraints

- **Dependency-free**: Node built-ins + `node:test` only. ESM `.mjs`. No `npm install`.
- **No secrets in the repo**: live integrations read `process.env` at runtime; only `.env.example` (names) is committed. Mock adapters are the default (`ALTAR_LIVE` unset).
- **Money is integer minor units** (cents) + a currency field. Never floats.
- **Append-only truth**: `queue/candidates.ndjson` and `data/events.ndjson` are appended; `*/index.json` and `catalog.json` are projections (`npm run rebuild`).
- **Determinism**: seeded RNG (`src/lib/rng.mjs`), content-addressed IDs (`src/lib/hash.mjs`), injectable clock (`src/lib/clock.mjs`). No `Math.random()`.

## Commands

```bash
npm test               # node:test suite — keep it green
npm run seed           # seed suppliers + Altar XIV House capsule (all draft/hidden/out-of-stock)
npm run agent <role> [count] [seed]   # run one agent (sourcing, restock, qa, …)
npm run tick           # one cadence tick across the whole roster
npm run review [list|open|approve|publish|reject|changes] <id>
npm run mirror         # export GitHub-issue payloads for un-mirrored candidates
npm run stripe:plan    # build TEST-mode Stripe create_product/price requests (no live calls)
npm run serve          # storefront http://127.0.0.1:8080, ops console at /ops/
npm run rebuild        # replay logs → rebuild projections
```

## Integration pattern (important)

The Node runtime CANNOT call MCP tools. So every external integration follows: **export a request artifact → the Claude agent fulfills it via MCP → record the result back.**

- GitHub (Phase 2, done): `src/queue/mirror-github.mjs` builds issue payloads; the agent creates issues via the GitHub MCP and calls `recordMirror`. `src/queue/decisions.mjs#applyGithubDecision` pulls operator label decisions back through the human-gated review actions.
- Stripe (Phase 4 groundwork): `src/orders/stripe-sync.mjs` builds TEST-mode requests; an agent fulfills via the Stripe MCP and calls `recordProductSync`. Going live is a deliberate, separate operator action — never automate it.
- Imagery (Phase 3, pending): same shape — request shots, agent calls the image MCP, media stays `approved:false` until a human approves.

## Layout

`src/model` entities · `src/scoring` gates/scores · `src/queue` store + state machine + mirror + decisions · `src/catalog` events/projection/publish · `src/storefront` projection/copy/render · `src/agents` registry + runtime + roles · `src/adapters` mock-by-default seams · `src/orders` lifecycle/payments/stripe-sync · `src/restock` · `public/` storefront + ops console · `test/` · `docs/`.

## Working agreement

- Branch: `claude/quirky-meitner-VrHVy`. Commit + push when a unit of work is green.
- Run `npm test` before every commit. Don't commit `.env` or `data/runtime/*`.
- Don't post to GitHub or spend money (Stripe, image gen) without it being clearly in scope; these reach outside the repo.
- Keep the voice profanity-free; keep urgency real (no fake scarcity, no fake reviews, no padded MSRPs).
