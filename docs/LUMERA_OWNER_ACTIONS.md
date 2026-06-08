# Lumera Owner Actions

These are the remaining actions Claude Code cannot complete without account access, legal approval, or founder approval. Treat this file as the handoff ledger before a live launch run.

## Production Accounts

- Create or confirm Printify, Printful, and CJ Dropshipping accounts.
- Generate API tokens with catalog, product, inventory, order, shipment, and webhook permissions.
- Add webhook URLs for `/hooks/vendor/printify`, `/hooks/vendor/printful`, and `/hooks/vendor/cj`.
- Keep `AUTO_SUBMIT_VENDOR_ORDERS=false` until sandbox or draft-order proof exists for each provider.

## Medusa And Checkout

- Create a Medusa admin API token and set `MEDUSA_ADMIN_API_TOKEN`.
- Confirm production `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `COOKIE_SECRET`, `STORE_CORS`, and `ADMIN_CORS`.
- Set `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `LUMERA_SALES_CHANNEL_ID`, and `LUMERA_SHIPPING_PROFILE_ID`.
- Configure Stripe live mode and webhook secrets only after test checkout proof passes.

## Legal And Trust

- Replace all terms, privacy, and returns placeholder text with final legal copy.
- Confirm business legal name, registered address, support email, jurisdiction, return window, refund policy, shipping delay-consent process, and data processors.
- Do not represent reviews unless they are verified customer reviews.

## Launch Approvals

- Approve the first live supplier list.
- Approve the first 20 live products from the curation board.
- Approve any sample purchases.
- Approve live vendor order submission by setting both `VENDOR_LIVE_MODE=true` and `AUTO_SUBMIT_VENDOR_ORDERS=true`.
- Approve paid campaign spend separately from product publishing.
