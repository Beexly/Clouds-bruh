Populate the Lumera curation board.

Steps:
1. Confirm the backend is running at `MEDUSA_BACKEND_URL`.
2. Run `pnpm curate -- --force`.
3. Open `/cockpit` and verify candidate cards show score, margin, supplier, stock, shipping, compliance, and founder actions.
4. Do not publish products unless Garrett approves from the board.

Expected output:
- Candidate count.
- Candidate rows with status and score.
- Cockpit board cards for ready, needs-sample, and blocked states.

Do not proceed if:
- Backend is unavailable.
- `/cockpit` cannot access the board with `COCKPIT_KEY`.
- Candidates only contain fixture data and the task is live launch.

Recovery:
- Run `pnpm vendor:preflight`.
- Report whether the board source is fixture, sandbox, or configured vendor.
