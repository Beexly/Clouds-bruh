const base = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';
const key = process.env.COCKPIT_KEY || '';

async function main() {
  const res = await fetch(`${base}/admin/lumera/fulfillment`, {
    headers: { ...(key ? { 'x-cockpit-key': key } : {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[fulfillment-drill] failed:', res.status, body);
    process.exit(1);
  }
  console.log('\nLUMERA FULFILLMENT DRILL');
  console.log('='.repeat(32));
  console.log(`vendor_live_mode=${body.live_mode?.vendor_live_mode}`);
  console.log(`auto_submit_vendor_orders=${body.live_mode?.auto_submit_vendor_orders}`);
  for (const c of body.connections ?? []) {
    console.log(`- ${c.label}: ${c.mode} publish=${c.can_publish} submit=${c.can_submit_orders}`);
  }
  console.log(`vendor_orders=${body.vendor_orders?.length ?? 0}`);
  console.log(`recent_webhooks=${body.recent_webhooks?.length ?? 0}`);
  console.log(`return_cases=${body.return_cases?.length ?? 0}`);
  console.log('\nVERDICT: fulfillment drill completed without submitting live vendor orders.');
}

main().catch((e) => {
  console.error('[fulfillment-drill] error:', e.message);
  process.exit(2);
});
