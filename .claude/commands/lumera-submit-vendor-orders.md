Process Lumera vendor orders that are ready for provider submission.

Steps:
1. Run `pnpm vendor-orders:submit`.
2. Confirm `VENDOR_LIVE_MODE=true`, `AUTO_SUBMIT_VENDOR_ORDERS=true`, and `DATABASE_URL` are set before expecting submissions.
3. Report each processed vendor order by id and resulting status.

Expected output:
- Gated verdict when live submission flags are disabled.
- Submitted, proof-gated, or blocked status for each ready vendor order.

Do not proceed if:
- The command would need to invent supplier SKUs or shipping addresses.
- A provider returns fixture or proof-gated status and the operator expects a live supplier order.
- `DATABASE_URL` is missing while live submission flags are enabled.

Recovery:
- Leave records in `ready_for_vendor_submission`, `retry_staged`, or a named blocked state.
- Do not mark an order submitted unless the provider adapter returns a real accepted vendor order id.
