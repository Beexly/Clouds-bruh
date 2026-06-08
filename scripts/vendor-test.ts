import { allVendorClients } from '../apps/intelligence/src/vendors';

async function main() {
  console.log('\nLUMERA VENDOR TEST');
  console.log('='.repeat(32));

  const failures: string[] = [];
  for (const client of allVendorClients()) {
    const health = await client.healthCheck();
    const candidates = await client.searchProducts('lumera', 2);
    const fixtureFallback = candidates.some((candidate) => candidate.source_url?.includes('lumera.local'));
    const draft = await client.createDraftOrder({
      external_order_id: `vendor_test_${client.id}_${Date.now()}`,
      items: [{ supplier_sku: candidates[0]?.supplier_sku ?? 'fixture-sku', quantity: 1 }],
      shipping_address: {
        name: 'Lumera Vendor Test',
        address1: '1 Test Way',
        city: 'Austin',
        state_code: 'TX',
        country_code: 'US',
        zip: '78701',
      },
    });

    console.log(`\n${health.label}`);
    console.log(`- mode=${health.mode}`);
    console.log(`- connected=${health.connected}`);
    console.log(`- can_submit_orders=${health.can_submit_orders}`);
    console.log(`- candidates=${candidates.length}${fixtureFallback ? ' fixture_fallback=true' : ''}`);
    console.log(`- draft_order=${draft.status} ${draft.vendor_order_id}`);
    if (draft.status === 'draft_order_proof_gated') {
      console.log('- draft_order_note=set VENDOR_DRAFT_ORDER_PROOF=true only for an approved sandbox/draft proof run');
    }

    if (health.connected && fixtureFallback) {
      failures.push(`${health.label} credentials are present but search fell back to fixtures.`);
    }
    if (!candidates.length) failures.push(`${health.label} returned zero candidates.`);
  }

  if (failures.length) {
    console.log('\nBLOCKED');
    failures.forEach((failure) => console.log(`- ${failure}`));
    process.exit(1);
  }

  console.log('\nVERDICT: vendor adapters passed safe test mode.');
}

main().catch((e) => {
  console.error('[vendor:test] error:', e.message);
  process.exit(2);
});
