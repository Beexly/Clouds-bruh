Publish founder-approved Lumera candidates.

Steps:
1. Run `pnpm vendor:preflight`.
2. Run `pnpm publish:approved`.
3. For every candidate, report whether it published, drafted, or blocked.
4. If blocked, return the exact blocker from the publish payload.
5. Never bypass margin, media-rights, supplier, shipping, or admin-token gates.

Expected output:
- One line per candidate.
- `published`, `drafted`, or `blocked` status.

Do not proceed if:
- Founder approval is missing.
- `MEDUSA_ADMIN_API_TOKEN` is missing.
- Product has `media_rights: unknown`.
- Product uses manual supplier while `MANUAL_SUPPLIER_VERIFIED=false`.

Recovery:
- Do not alter candidate status by hand.
- Fix the named blocker, then rerun this command.
