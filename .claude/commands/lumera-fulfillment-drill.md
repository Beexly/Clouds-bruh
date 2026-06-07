Verify Lumera fulfillment safety.

Steps:
1. Run `pnpm fulfillment:drill`.
2. Verify vendor orders, webhook records, return cases, and live-mode flags.
3. Confirm the drill did not submit live vendor orders unless `VENDOR_LIVE_MODE=true` and `AUTO_SUBMIT_VENDOR_ORDERS=true`.
4. Report remaining blockers before accepting real orders.

Expected output:
- Vendor live-mode flags.
- Provider submit capability.
- Vendor order, webhook, and return counts.

Do not proceed if:
- Sandbox order proof is missing for the provider being launched.
- Live submit is enabled without founder approval.
- Webhook signature verification is failing.

Recovery:
- Keep orders staged.
- Capture the provider error and leave `AUTO_SUBMIT_VENDOR_ORDERS=false`.
