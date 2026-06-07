# Lumera Vendor Credentials Matrix

Use this as the owner-action checklist before Claude Code attempts live vendor integration.

| Provider | Purpose | Required Env | Required Scopes / Access | Webhook URL | Live Gate |
|---|---|---|---|---|---|
| Printify | POD, house-label, founder-designed products | `PRINTIFY_TOKEN`, `PRINTIFY_SHOP_ID` | catalog/products/orders/webhooks | `/hooks/vendor/printify` | Sandbox/search proof plus draft order proof |
| Printful | Premium POD, samples, product studio | `PRINTFUL_TOKEN`, `PRINTFUL_STORE_ID` | catalog/orders/shipping/webhooks | `/hooks/vendor/printful` | Store connected, draft order proof, webhook proof |
| CJ Dropshipping | Broad dropship catalog and fulfillment | `CJ_API_KEY`, `CJ_ACCESS_TOKEN`, `CJ_SANDBOX` | product/order/logistics/stock | `/hooks/vendor/cj` | Sandbox product and order proof |
| Stripe | Payments and tax monitoring | `STRIPE_API_KEY`, webhook secret when added | Checkout/payment/refund/tax | `/hooks/stripe` | Live key only after checkout/fraud/tax gates |
| Medusa Admin | Product publish/update | `MEDUSA_ADMIN_API_TOKEN` | product create/update/read | n/a | Required for publish-approved |
| Redis | Agent jobs and event bus | `REDIS_URL` | stream read/write | n/a | Required for autonomous curation loop |
| S3/MinIO | Durable media | `S3_FILE_URL`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET` | object read/write | n/a | Required before heavy media/product studio launch |

## Owner-Only Actions

- Create vendor accounts and API keys.
- Enable Stripe live mode and configure real webhook secrets.
- Provide Medusa Cloud database and admin token.
- Approve live supplier order submission.
- Approve samples, refunds, price changes, and public campaign spending.

## Claude Code Rules

- Never paste secrets into committed files.
- Update `.env.example` only with variable names.
- If a provider has no credentials, keep its adapter in fixture/test mode.
- Keep `VENDOR_DRAFT_ORDER_PROOF=false` until the owner approves external sandbox/draft order creation.
- If live credentials exist but sandbox proof has not passed, keep `AUTO_SUBMIT_VENDOR_ORDERS=false`.
