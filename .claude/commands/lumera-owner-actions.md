List the Lumera account, legal, and founder-approval actions that code cannot complete.

Steps:
1. Run `pnpm owner:actions`.
2. Report missing env values separately from founder approval items.
3. Keep the exit code meaningful: missing production values are a launch blocker, not a test failure.
4. Link the operator to `docs/LUMERA_OWNER_ACTIONS.md`.

Expected output:
- Missing env keys, if any.
- Owner approvals that must be confirmed outside code.
- Whether live vendor order flags are disabled.

Do not proceed if:
- `VENDOR_LIVE_MODE=true` or `AUTO_SUBMIT_VENDOR_ORDERS=true` without founder approval and sandbox/draft-order proof.
- Legal copy is still placeholder text.
- Vendor, Stripe, Medusa, or Cockpit secrets are missing.

Recovery:
- Return the exact missing owner action list.
- Do not invent account setup status or mark live-ready from fixture data.
