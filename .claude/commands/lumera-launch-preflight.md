Run the full Lumera local launch gate.

Steps:
1. Run `pnpm launch:preflight`.
2. Run `pnpm owner:actions` and treat missing owner actions as a live launch blocker.
3. Treat build, tests, commerce preflight, and vendor preflight separately in the report.
3. If any gate fails, stop and return exact failing command and blocker.
4. Do not declare launch-ready while vendor live mode, Stripe, legal, or Medusa admin publishing is blocked.

Expected output:
- Separate results for tests, build, commerce preflight, vendor preflight, legal proof, and fulfillment proof.
- Separate owner-action ledger for production accounts, legal copy, Stripe, and founder approvals.

Do not proceed if:
- Any proof layer fails.
- Terms/privacy/returns still contain placeholder language.
- Products are fixture-only.

Recovery:
- Report the first red gate verbatim.
- Do not collapse env blockers into code-health blockers.
