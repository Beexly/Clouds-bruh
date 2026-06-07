import pg from 'pg';
import { vendorClient } from '../apps/intelligence/src/vendors/clients';
import type { VendorId } from '../packages/shared/src/curation';

type VendorOrderRow = {
  id: string;
  order_id: string | null;
  vendor: VendorId;
  vendor_order_id: string | null;
  status: string;
  payload: any;
};

const liveMode = process.env.VENDOR_LIVE_MODE === 'true';
const autoSubmit = process.env.AUTO_SUBMIT_VENDOR_ORDERS === 'true';
const databaseUrl = process.env.DATABASE_URL;

async function main() {
  console.log('\nLUMERA VENDOR ORDER SUBMITTER');
  console.log('================================');
  console.log(`VENDOR_LIVE_MODE=${String(liveMode)}`);
  console.log(`AUTO_SUBMIT_VENDOR_ORDERS=${String(autoSubmit)}`);

  if (!liveMode || !autoSubmit) {
    console.log('\nVERDICT: submission gated. No vendor orders were submitted.');
    return;
  }

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required before processing ready vendor orders.');
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    const { rows } = await pool.query<VendorOrderRow>(
      `SELECT id, order_id, vendor, vendor_order_id, status, payload
       FROM lumera_vendor_order
       WHERE status IN ('ready_for_vendor_submission', 'retry_staged')
       ORDER BY updated_at ASC
       LIMIT 25`
    );

    if (!rows.length) {
      console.log('\nNo ready vendor orders found.');
      return;
    }

    for (const row of rows) {
      await processVendorOrder(pool, row);
    }
  } finally {
    await pool.end().catch(() => {});
  }
}

async function processVendorOrder(pool: pg.Pool, row: VendorOrderRow) {
  const payload = row.payload ?? {};
  const items = Array.isArray(payload.items) ? payload.items : [];
  const supplierItems = items
    .map((item: any) => ({
      supplier_sku: item.supplier_sku,
      quantity: Number(item.quantity ?? 1),
    }))
    .filter((item: { supplier_sku?: string; quantity: number }) => item.supplier_sku && item.quantity > 0);

  if (!supplierItems.length) {
    await updateVendorOrder(pool, row.id, 'blocked_missing_supplier_sku', null, {
      submitter_blocker: 'missing_supplier_sku',
    });
    console.log(`- ${row.id}: blocked_missing_supplier_sku`);
    return;
  }

  const client = vendorClient(row.vendor);
  const draft = await client.createDraftOrder({
    external_order_id: payload.external_order_id ?? `${row.order_id ?? row.id}-${row.vendor}`,
    items: supplierItems,
    shipping_address: payload.shipping_address,
  });

  const draftIsReal = draft.source !== 'fixture' && draft.status !== 'draft_order_proof_gated';
  if (!draftIsReal) {
    await updateVendorOrder(pool, row.id, draft.status, null, { draft });
    console.log(`- ${row.id}: ${draft.status}`);
    return;
  }

  const submitted = await client.submitOrder(draft.vendor_order_id);
  const submittedIsReal = submitted.status !== 'submission_gated';
  await updateVendorOrder(pool, row.id, submitted.status, submittedIsReal ? submitted.vendor_order_id : null, {
    draft,
    submit: submitted,
  });
  console.log(`- ${row.id}: ${submitted.status}`);
}

async function updateVendorOrder(
  pool: pg.Pool,
  id: string,
  status: string,
  vendorOrderId: string | null,
  patch: Record<string, unknown>
) {
  await pool.query(
    `UPDATE lumera_vendor_order
        SET status=$2,
            vendor_order_id=COALESCE($3, vendor_order_id),
            payload = payload || $4::jsonb || jsonb_build_object('vendor_submitter_checked_at', now()),
            updated_at=now()
      WHERE id=$1`,
    [id, status, vendorOrderId, JSON.stringify(patch)]
  );
}

main().catch((error) => {
  console.error('[vendor-orders:submit] error:', error.message);
  process.exit(1);
});
