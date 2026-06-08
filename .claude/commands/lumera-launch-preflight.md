Run the full Lumera launch gate.

Steps:
1. Run `pnpm test`, `pnpm lint`, and `pnpm build`.
2. Run `pnpm preflight`, `pnpm vendor:preflight`, `pnpm owner:actions`, `pnpm vendor-orders:submit`, and `pnpm launch:proof` for code-push readiness.
3. Run `pnpm preflight -- --live` and `pnpm owner:actions -- --live` only when proving live production readiness.
4. Treat code health, commerce preflight, vendor preflight, owner actions, legal proof, and fulfillment proof separately in the report.
5. If any code-push gate fails, stop and return exact failing command and blocker.
6. Do not declare live-ready while vendor live mode, Stripe, Medusa admin publishing, legal, or vendor credentials are blocked.

Expected output:
- Separate results for tests, lint, build, commerce preflight, vendor preflight, legal proof, fulfillment proof, and vendor-order submission gate.
- Separate owner-action ledger for production accounts, legal copy, Stripe, and founder approvals.
- A clear distinction between `proof_mode=code` and `proof_mode=live`.

Do not proceed if:
- Any code-push proof layer fails.
- Terms/privacy/returns still contain placeholder language.
- Live launch is requested while products are fixture-only.

Recovery:
- Report the first red gate verbatim.
- Do not collapse env blockers into code-health blockers.
