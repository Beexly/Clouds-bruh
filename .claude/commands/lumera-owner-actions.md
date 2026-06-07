List the Lumera account, legal, and founder-approval actions that code cannot complete.

Steps:
1. Run `pnpm owner:actions` for code-readiness.
2. Run `pnpm owner:actions -- --live` only when proving live production readiness.
3. Report missing env values separately from founder approval items.
4. Keep the exit code meaningful: missing production values block live readiness, not local push readiness.
5. Link the operator to `docs/LUMERA_OWNER_ACTIONS.md`.

Expected output:
- Missing env keys, if any.
- `proof_mode=code` or `proof_mode=live`.
- Owner approvals that must be confirmed outside code.
- Whether live vendor order flags are disabled.

Do not proceed if:
- `VENDOR_LIVE_MODE=true` or `AUTO_SUBMIT_VENDOR_ORDERS=true` without founder approval and sandbox/draft-order proof.
- Legal copy is still placeholder text.
- Vendor, Stripe, Medusa, or Cockpit secrets are missing.

Recovery:
- Return the exact missing owner action list.
- Do not invent account setup status or mark live-ready from fixture data.
