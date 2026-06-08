<!--
Lumera PR. Keep it honest: verified, not assumed. Nothing is "done" until it
renders / compiles / passes. Fill every section — delete the comments.
-->

## Summary

<!-- What changed and why, in 1-3 sentences. Link any issue/handoff. -->

## Verification

Paste the commands you ran and their outcome. Do not check a box you did not run.

- [ ] `pnpm test` — unit/integration green
- [ ] `pnpm lint` — typecheck green
- [ ] `pnpm build` — builds clean
- [ ] `pnpm verify:api` — operational pipeline green (when backend/API is touched)

```
# paste relevant output here
```

## Gates respected (non-negotiables)

- [ ] **No autonomous money movement, publishing, or destructive action** — any such action stays behind the founder-approval / escalation gate.
- [ ] Live vendor flags (`VENDOR_LIVE_MODE`, `AUTO_SUBMIT_VENDOR_ORDERS`) are **not** enabled by this change.
- [ ] No secrets committed; new config goes through `.env` / `.env.example` placeholders.
- [ ] Least-privilege: agents/tools added or changed keep the minimum scope they need.
- [ ] Docs updated to match reality (no overclaiming what is wired vs. stubbed).

## Screenshots / UI

<!-- Required for any storefront/UI change. Show before & after; confirm it matches the
     dark luminous editorial luxury brand. Off-brand assets don't ship. -->

- [ ] N/A — no user-facing UI change
- [ ] Screenshots attached and on-brand
