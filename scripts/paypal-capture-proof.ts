/**
 * paypal-capture-proof.ts — one-command proof of the PayPal money boundary.
 *
 *   pnpm paypal:proof
 *
 * Purpose: confirm — against the REAL PayPal sandbox API — that Lumera's integer-cents convention
 * round-trips correctly to PayPal's 2-decimal major-unit strings. It reuses the exact production
 * helpers (formatPayPalAmount + paypalBaseUrl from the lumera-payment-paypal module), authenticates
 * with OAuth2 client-credentials, CREATES an Orders v2 order for several representative cent amounts,
 * reads each order back, and asserts PayPal echoes the precise value we sent.
 *
 * Why create + read back (not a full capture): completing a capture needs buyer approval in a browser,
 * which can't be automated headlessly. Create+read still proves auth + the cents↔decimal boundary at
 * the live API. The script prints the approve URL for the first order so you can OPTIONALLY finish a
 * real capture by hand.
 *
 * Safety + gating (matches the rest of the lane):
 *  - Unconfigured (no PAYPAL_CLIENT_ID/SECRET) → no-op, exits 0 (safe in CI / credential-less).
 *  - Defaults to sandbox. Refuses to touch live unless PAYPAL_PROOF_ALLOW_LIVE=true is set explicitly.
 *  - Creating an order does NOT move money; nothing is captured.
 */
import { formatPayPalAmount, paypalBaseUrl } from '../apps/backend/src/modules/lumera-payment-paypal/money';

const TIMEOUT_MS = 15_000;
// Representative cent amounts: round dollars, sub-dollar, odd cents, a markup-style value, and a large one.
const CASES_CENTS = [100, 99, 4200, 4914, 1234567];

async function getToken(base: string, id: string, secret: string): Promise<string | null> {
  const auth = Buffer.from(`${id}:${secret}`).toString('base64');
  try {
    const res = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) {
      console.error(`✗ OAuth failed: ${res.status} ${res.statusText}`);
      return null;
    }
    const data = (await res.json()) as { access_token?: string };
    return data.access_token ?? null;
  } catch (e) {
    console.error(`✗ OAuth request error: ${(e as Error).message}`);
    return null;
  }
}

async function main() {
  console.log('\nLUMERA · PAYPAL CAPTURE PROOF (money-unit boundary)');
  console.log('='.repeat(50));

  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  const env = (process.env.PAYPAL_ENV ?? 'sandbox').toLowerCase();
  const base = paypalBaseUrl(env);

  if (!id || !secret) {
    console.log('• PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET not set — gated (mock mode). Nothing to prove.');
    console.log('  Set sandbox creds + PAYPAL_ENV=sandbox, then re-run: pnpm paypal:proof');
    return; // exit 0 — safe in CI / credential-less
  }

  if (env === 'live' && process.env.PAYPAL_PROOF_ALLOW_LIVE !== 'true') {
    throw new Error('PAYPAL_ENV=live — refusing to run against live. Use sandbox, or set PAYPAL_PROOF_ALLOW_LIVE=true to override.');
  }

  console.log(`• env=${env}  base=${base}`);
  console.log('• Verifying cents → PayPal amount.value round-trips exactly (no capture / no money moved).\n');

  const token = await getToken(base, id, secret);
  if (!token) throw new Error('Could not obtain PayPal OAuth token — check the sandbox credentials.');
  console.log('✓ OAuth token acquired\n');

  const failures: string[] = [];
  let firstApproveUrl: string | undefined;

  for (const cents of CASES_CENTS) {
    const expected = formatPayPalAmount(cents); // the EXACT string checkout would send
    let line = `cents=${String(cents).padStart(8)} → expect "${expected}" : `;
    try {
      const res = await fetch(`${base}/v2/checkout/orders`, {
        method: 'POST',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{ amount: { currency_code: 'USD', value: expected } }],
        }),
      });
      const order = (await res.json()) as any;
      if (!res.ok || !order?.id) {
        failures.push(`${cents}: create failed (${res.status}) ${JSON.stringify(order?.details ?? order)?.slice(0, 160)}`);
        console.log(line + '✗ create failed');
        continue;
      }
      // Read back and assert PayPal echoes exactly what we sent.
      const got = order?.purchase_units?.[0]?.amount?.value;
      if (got === expected) {
        console.log(line + `✓ echoed "${got}"  (order ${order.id}, status ${order.status})`);
      } else {
        failures.push(`${cents}: PayPal echoed "${got}", expected "${expected}"`);
        console.log(line + `✗ echoed "${got}"`);
      }
      if (!firstApproveUrl) {
        const approve = (order?.links ?? []).find((l: any) => l?.rel === 'approve' || l?.rel === 'payer-action');
        if (approve?.href) firstApproveUrl = approve.href;
      }
    } catch (e) {
      failures.push(`${cents}: request error ${(e as Error).message}`);
      console.log(line + '✗ request error');
    }
  }

  console.log('\n' + '-'.repeat(50));
  if (firstApproveUrl) {
    console.log('To complete a REAL sandbox capture by hand, approve the first order here, then');
    console.log('capture it via your flow / the PayPal dashboard (login with a sandbox buyer):');
    console.log(`  ${firstApproveUrl}`);
  }

  if (failures.length) {
    console.error(`\n✗ PAYPAL PROOF FAILED — ${failures.length} mismatch(es):`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exitCode = 1;
    return;
  }
  console.log(`\n✓ PAYPAL PROOF PASSED — all ${CASES_CENTS.length} amounts round-tripped cents→PayPal exactly.`);
  console.log('  The cents↔decimal money unit is verified at the live sandbox boundary.');
}

main().catch((e) => {
  console.error(`\n✗ ${(e as Error).message}`);
  process.exitCode = 1;
});
