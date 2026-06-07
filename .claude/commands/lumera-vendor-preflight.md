Run the Lumera vendor readiness gate.

Steps:
1. Run `pnpm vendor:preflight`.
2. If `VENDOR_LIVE_MODE=true`, treat any missing vendor credential, missing Medusa admin token, or Stripe test key as a launch blocker.
3. Report each vendor as `missing_credentials`, `configured-gated`, or `order-ready`.
4. Do not enable live vendor order submission.

Expected output:
- `VERDICT: vendor lane configured safely` in gated mode.
- Provider rows for Printify, Printful, and CJ.

Do not proceed if:
- `VENDOR_LIVE_MODE=true` and any provider is missing credentials.
- Stripe is a test key while vendor live mode is true.
- `MEDUSA_ADMIN_API_TOKEN` is missing and the next step is publishing.

Recovery:
- Return the exact missing env var names.
- Do not invent credentials or change live-mode flags.
