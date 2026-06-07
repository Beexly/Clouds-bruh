import { allVendorClients } from '../apps/intelligence/src/vendors';

async function main() {
  console.log('\nLUMERA FULFILLMENT SANDBOX');
  console.log('='.repeat(32));

  if (process.env.VENDOR_LIVE_MODE === 'true' || process.env.AUTO_SUBMIT_VENDOR_ORDERS === 'true') {
    throw new Error('fulfillment:sandbox refuses to run while live vendor submission flags are enabled');
  }

  const failures: string[] = [];
  for (const client of allVendorClients()) {
    const health = await client.healthCheck();
    const candidates = await client.searchProducts('lumera sandbox', 1);
    const candidate = candidates[0];
    if (!candidate) {
      failures.push(`${health.label} returned no candidate for sandbox drill`);
      continue;
    }

    const draft = await client.createDraftOrder({
      external_order_id: `sandbox_${client.id}_${Date.now()}`,
      items: [{ supplier_sku: candidate.supplier_sku, quantity: 1 }],
      shipping_address: {
        name: 'Lumera Sandbox',
        address1: '1 Sandbox Way',
        city: 'Austin',
        state_code: 'TX',
        country_code: 'US',
        zip: '78701',
      },
    });
    const submit = await client.submitOrder(draft.vendor_order_id);

    console.log(`\n${health.label}`);
    console.log(`- mode=${health.mode}`);
    console.log(`- candidate=${candidate.id}`);
    console.log(`- draft=${draft.status} ${draft.vendor_order_id}`);
    console.log(`- submit=${submit.status}`);

    if (submit.status !== 'submission_gated') {
      failures.push(`${health.label} submission was not gated in sandbox mode`);
    }
    if (health.connected && process.env.VENDOR_DRAFT_ORDER_PROOF !== 'true' && draft.status !== 'draft_order_proof_gated') {
      failures.push(`${health.label} did not gate external draft-order proof`);
    }
  }

  if (failures.length) {
    console.log('\nBLOCKED');
    failures.forEach((failure) => console.log(`- ${failure}`));
    process.exit(1);
  }

  console.log('\nVERDICT: fulfillment sandbox proof completed with live submission gated.');
}

main().catch((e) => {
  console.error('[fulfillment:sandbox] error:', e.message);
  process.exit(2);
});
