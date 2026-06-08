import pg from 'pg';
import crypto from 'node:crypto';
import {
  attachReview,
  candidateToProductTruth,
  fixtureCandidates,
  radarDiscover,
  radarConfigured as radarConfiguredShared,
  type CandidateStatus,
  type ProductCandidate,
  type ProductTruth,
  type RadarSource,
  type VendorConnection,
  type VendorId,
} from '@alterxiv/shared';

let _pool: pg.Pool | null = null;

export function pool() {
  if (_pool) return _pool;
  _pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://alterxiv:alterxiv@localhost:5432/alterxiv',
  });
  return _pool;
}

export async function ensureLumeraTables() {
  await pool().query(`
    CREATE TABLE IF NOT EXISTS lumera_vendor_connection (
      id text primary key,
      label text not null,
      mode text not null,
      connected boolean not null default false,
      can_publish boolean not null default false,
      can_submit_orders boolean not null default false,
      last_checked_at timestamptz not null default now(),
      missing_env jsonb not null default '[]'::jsonb,
      message text not null default ''
    );

    CREATE TABLE IF NOT EXISTS lumera_product_candidate (
      id text primary key,
      vendor text not null,
      supplier_id text not null,
      supplier_name text not null,
      title text not null,
      handle text not null unique,
      status text not null,
      score integer not null default 0,
      gross_margin numeric(8,4) not null default 0,
      lead_time_days integer not null default 0,
      stock integer not null default 0,
      payload jsonb not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    CREATE TABLE IF NOT EXISTS lumera_approval_request (
      id text primary key,
      candidate_id text not null references lumera_product_candidate(id) on delete cascade,
      action text not null,
      status text not null,
      reason text,
      payload jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    CREATE TABLE IF NOT EXISTS lumera_vendor_order (
      id text primary key,
      order_id text,
      vendor text not null,
      vendor_order_id text,
      status text not null,
      payload jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    CREATE TABLE IF NOT EXISTS lumera_vendor_webhook_event (
      id text primary key,
      vendor text not null,
      event_type text not null,
      payload jsonb not null,
      received_at timestamptz not null default now(),
      processed_at timestamptz
    );

    CREATE TABLE IF NOT EXISTS lumera_return_case (
      id text primary key,
      order_id text,
      email text,
      status text not null default 'submitted',
      reason text,
      payload jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    CREATE TABLE IF NOT EXISTS lumera_product_design (
      id text primary key,
      title text not null,
      status text not null default 'draft',
      payload jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
}

export function vendorConnections(): VendorConnection[] {
  const liveMode = process.env.VENDOR_LIVE_MODE === 'true';
  const autoSubmit = process.env.AUTO_SUBMIT_VENDOR_ORDERS === 'true';
  return [
    connection('printify', 'Printify', ['PRINTIFY_TOKEN', 'PRINTIFY_SHOP_ID'], liveMode, autoSubmit),
    connection('printful', 'Printful', ['PRINTFUL_TOKEN', 'PRINTFUL_STORE_ID'], liveMode, autoSubmit),
    connection('cj', 'CJ Dropshipping', ['CJ_API_KEY', 'CJ_ACCESS_TOKEN'], liveMode && process.env.CJ_SANDBOX !== 'true', autoSubmit),
    connection('spocket', 'Spocket', ['SPOCKET_API_KEY'], liveMode, autoSubmit),
    connection('syncee', 'Syncee (Alibaba-backed)', ['SYNCEE_API_KEY'], liveMode, autoSubmit),
    manualConnection(),
    connection('radar', 'Radar Only', [], false, false, process.env.OXYLABS_USER || process.env.APIFY_TOKEN ? 'sandbox' : 'fixture'),
  ];
}

export async function persistVendorConnections() {
  await ensureLumeraTables();
  const rows = vendorConnections();
  for (const c of rows) {
    await pool().query(
      `INSERT INTO lumera_vendor_connection
        (id, label, mode, connected, can_publish, can_submit_orders, last_checked_at, missing_env, message)
       VALUES ($1,$2,$3,$4,$5,$6,now(),$7,$8)
       ON CONFLICT (id) DO UPDATE SET
         label=EXCLUDED.label, mode=EXCLUDED.mode, connected=EXCLUDED.connected,
         can_publish=EXCLUDED.can_publish, can_submit_orders=EXCLUDED.can_submit_orders,
         last_checked_at=now(), missing_env=EXCLUDED.missing_env, message=EXCLUDED.message`,
      [c.id, c.label, c.mode, c.connected, c.can_publish, c.can_submit_orders, JSON.stringify(c.missing_env), c.message]
    );
  }
  return rows;
}

export async function seedCurationCandidates(force = false) {
  await ensureLumeraTables();
  const existing = await pool().query(`SELECT count(*)::int AS n FROM lumera_product_candidate`);
  if (!force && Number(existing.rows[0]?.n ?? 0) > 0) return listCandidates();

  const primaryVendor = bestConfiguredVendor();
  const candidates = fixtureCandidates(primaryVendor);
  for (const candidate of candidates) await upsertCandidate(candidate);
  return listCandidates();
}

export function radarConfigured(): boolean {
  return radarConfiguredShared();
}

export function defaultRadarQueries(): string[] {
  const raw = process.env.LUMERA_RADAR_QUERIES;
  if (raw) return raw.split(',').map((q) => q.trim()).filter(Boolean);
  return ['oversized hoodie', 'gold pendant necklace', 'cargo pants', 'minimalist leather tote', 'ribbed beanie'];
}

/**
 * Pull live discovery candidates from the configured radar source (AliExpress/Alibaba/Shein),
 * score them, and upsert onto the board. No-op (empty) when no scraping creds are configured, so
 * curation stays fixture-safe until Garrett turns the keys on.
 */
export async function discoverAndIngestRadar(queries?: string[]) {
  if (!radarConfigured()) return { source: 'unconfigured' as const, ingested: 0, candidates: [] as ProductCandidate[] };
  const source = (process.env.LUMERA_RADAR_SOURCE as RadarSource) || 'aliexpress';
  const limit = Number(process.env.LUMERA_RADAR_LIMIT ?? 8);
  const fulfillmentVendor = (process.env.LUMERA_RADAR_FULFILLMENT as VendorId) || 'manual';
  const qs = (queries?.length ? queries : defaultRadarQueries()).slice(0, 6);
  const candidates: ProductCandidate[] = [];
  for (const query of qs) {
    const found = await radarDiscover({ query, source, limit, fulfillmentVendor }).catch(() => [] as ProductCandidate[]);
    for (const candidate of found) {
      await upsertCandidate(candidate).catch(() => {});
      candidates.push(candidate);
    }
  }
  return { source, ingested: candidates.length, candidates };
}

export async function upsertCandidate(candidate: ProductCandidate) {
  const reviewed = attachReview(candidate, marginFloor(), maxShippingDays());
  await ensureLumeraTables();
  await pool().query(
    `INSERT INTO lumera_product_candidate
      (id, vendor, supplier_id, supplier_name, title, handle, status, score, gross_margin, lead_time_days, stock, payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (id) DO UPDATE SET
      vendor=EXCLUDED.vendor, supplier_id=EXCLUDED.supplier_id, supplier_name=EXCLUDED.supplier_name,
      title=EXCLUDED.title, handle=EXCLUDED.handle, status=EXCLUDED.status, score=EXCLUDED.score,
      gross_margin=EXCLUDED.gross_margin, lead_time_days=EXCLUDED.lead_time_days, stock=EXCLUDED.stock,
      payload=EXCLUDED.payload, updated_at=now()`,
    [
      reviewed.id,
      reviewed.vendor,
      reviewed.supplier_id,
      reviewed.supplier_name,
      reviewed.title,
      reviewed.handle,
      reviewed.status,
      reviewed.score?.total ?? 0,
      reviewed.score?.gross_margin ?? 0,
      reviewed.lead_time_days,
      reviewed.stock,
      JSON.stringify(reviewed),
    ]
  );
  return reviewed;
}

export async function listCandidates(status?: CandidateStatus) {
  await ensureLumeraTables();
  const result = await pool().query(
    `SELECT payload FROM lumera_product_candidate
      ${status ? 'WHERE status=$1' : ''}
      ORDER BY
        CASE status
          WHEN 'ready_for_review' THEN 1
          WHEN 'needs_sample' THEN 2
          WHEN 'approved' THEN 3
          WHEN 'published' THEN 4
          ELSE 5
        END,
        score DESC,
        updated_at DESC`,
    status ? [status] : []
  );
  return result.rows.map((row) => row.payload as ProductCandidate);
}

export async function getCandidate(id: string) {
  await ensureLumeraTables();
  const result = await pool().query(`SELECT payload FROM lumera_product_candidate WHERE id=$1`, [id]);
  return (result.rows[0]?.payload as ProductCandidate | undefined) ?? null;
}

export async function setCandidateStatus(id: string, status: CandidateStatus, action: string, reason?: string) {
  const candidate = await getCandidate(id);
  if (!candidate) throw new Error(`Candidate ${id} not found`);
  const updated: ProductCandidate = { ...candidate, status, updated_at: new Date().toISOString() };
  await upsertCandidate(updated);
  const approvalId = `apr_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  await pool().query(
    `INSERT INTO lumera_approval_request (id, candidate_id, action, status, reason, payload)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [approvalId, id, action, status, reason ?? null, JSON.stringify({ candidate: updated })]
  );
  return updated;
}

export async function recordWebhook(vendor: VendorId, eventType: string, payload: unknown) {
  await ensureLumeraTables();
  const id = `wh_${vendor}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  await pool().query(
    `INSERT INTO lumera_vendor_webhook_event (id, vendor, event_type, payload) VALUES ($1,$2,$3,$4)`,
    [id, vendor, eventType, JSON.stringify(payload ?? {})]
  );
  return { id, vendor, event_type: eventType, status: 'recorded' };
}

export function verifyVendorWebhook(vendor: VendorId | 'stripe', payload: unknown, headers: Record<string, any>) {
  const secretByVendor: Record<string, string | undefined> = {
    printify: process.env.PRINTIFY_WEBHOOK_SECRET,
    printful: process.env.PRINTFUL_WEBHOOK_SECRET,
    cj: process.env.CJ_WEBHOOK_SECRET,
    stripe: process.env.STRIPE_WEBHOOK_SECRET,
  };
  const secret = secretByVendor[vendor];
  if (!secret) return { valid: true, proof: 'unsigned_no_secret_configured' };

  const raw = JSON.stringify(payload ?? {});
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const provided =
    headers['x-printify-hmac-sha256'] ||
    headers['x-pf-signature'] ||
    headers['x-cj-signature'] ||
    headers['stripe-signature'] ||
    headers['x-lumera-signature'];
  const normalized = String(provided ?? '').replace(/^sha256=/, '');
  const valid = Boolean(normalized) && safeEqual(expected, normalized);
  return { valid, proof: valid ? 'hmac_sha256_verified' : 'signature_invalid' };
}

export async function processVendorWebhook(vendor: VendorId, payload: any) {
  await ensureLumeraTables();
  const vendorOrderId =
    payload?.vendor_order_id ??
    payload?.order_id ??
    payload?.orderId ??
    payload?.data?.order_id ??
    payload?.data?.id ??
    payload?.result?.id;
  if (!vendorOrderId) return { matched: false };

  const trackingNumber =
    payload?.tracking_number ??
    payload?.trackingNumber ??
    payload?.tracking?.number ??
    payload?.shipment?.tracking_number ??
    payload?.data?.tracking_number;
  const trackingUrl =
    payload?.tracking_url ??
    payload?.trackingUrl ??
    payload?.tracking?.url ??
    payload?.shipment?.tracking_url ??
    payload?.data?.tracking_url;
  const status = payload?.status ?? payload?.event_type ?? payload?.type ?? 'webhook_received';

  const result = await pool().query(
    `UPDATE lumera_vendor_order
        SET status=$2,
            payload = payload || jsonb_build_object(
              'last_webhook_at', now(),
              'tracking_number', $3::text,
              'tracking_url', $4::text,
              'last_webhook_payload', $5::jsonb
            ),
            updated_at=now()
      WHERE id=$1 OR vendor_order_id=$1
      RETURNING id`,
    [String(vendorOrderId), String(status), trackingNumber ?? null, trackingUrl ?? null, JSON.stringify(payload ?? {})]
  );
  return { matched: result.rowCount > 0, vendor_order_id: String(vendorOrderId), status: String(status) };
}

export async function createReturnCase(input: { order_id?: string; email?: string; reason?: string; payload?: unknown }) {
  await ensureLumeraTables();
  const id = `ret_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  await pool().query(
    `INSERT INTO lumera_return_case (id, order_id, email, reason, payload) VALUES ($1,$2,$3,$4,$5)`,
    [id, input.order_id ?? null, input.email ?? null, input.reason ?? null, JSON.stringify(input.payload ?? {})]
  );
  return { id, status: 'submitted' };
}

export async function productTruthByHandle(handle: string): Promise<ProductTruth | null> {
  const candidate = (await listCandidates()).find((c) => c.handle === handle);
  if (candidate) return candidateToProductTruth(candidate);

  const result = await pool()
    .query(`SELECT id, title, handle, metadata FROM product WHERE handle=$1 AND deleted_at IS NULL LIMIT 1`, [handle])
    .catch(() => ({ rows: [] as any[] }));
  const product = result.rows[0];
  if (!product) return null;
  const metadata = product.metadata ?? {};
  const truth = metadata.lumera_truth ?? {};
  return {
    product_id: product.id,
    handle: product.handle,
    title: product.title,
    supplier_name: truth.supplier_name ?? metadata.supplier_name ?? 'Verified supplier pending',
    supplier_region: truth.supplier_region ?? metadata.supplier_region ?? 'Region pending',
    fulfillment_provider: truth.fulfillment_provider ?? metadata.fulfillment_provider ?? 'unknown',
    estimated_ship_days: Number(truth.estimated_ship_days ?? metadata.lead_time_days ?? maxShippingDays()),
    return_window_days: Number(truth.return_window_days ?? 30),
    quality_checks: truth.quality_checks ?? ['Supplier proof pending', 'Stock freshness pending', 'Media rights pending'],
    price_logic: truth.price_logic ?? 'Price verified against supplier cost before launch.',
    stock_freshness: truth.stock_freshness ?? 'Stock sync pending.',
    verified_reviews_count: Number(truth.verified_reviews_count ?? metadata.verified_reviews_count ?? 0),
    selected_because: truth.selected_because ?? ['Curated for Lumera fit'],
  };
}

export function shippingPromise(days = maxShippingDays()) {
  const max = Math.max(3, days);
  return {
    min_days: Math.max(2, max - 4),
    max_days: max,
    provider: process.env.VENDOR_LIVE_MODE === 'true' ? 'vendor-routed fulfillment' : 'launch-safe fulfillment preview',
    message: `Estimated delivery window: ${Math.max(2, max - 4)}-${max} business days.`,
    requires_delay_consent: max > 30,
  };
}

function connection(
  id: VendorId,
  label: string,
  requiredEnv: string[],
  liveCapable: boolean,
  orderCapable: boolean,
  overrideMode?: VendorConnection['mode']
): VendorConnection {
  const missing = requiredEnv.filter((key) => !process.env[key]);
  const connected = missing.length === 0;
  const mode = overrideMode ?? (connected ? (liveCapable ? 'live' : 'sandbox') : 'missing_credentials');
  return {
    id,
    label,
    mode,
    connected,
    can_publish: connected && id !== 'radar' && process.env.AUTO_PUBLISH_APPROVED !== 'false',
    can_submit_orders: connected && liveCapable && orderCapable,
    last_checked_at: new Date().toISOString(),
    missing_env: missing,
    message: connected
      ? `${label} credentials are configured; live behavior remains gated by VENDOR_LIVE_MODE and AUTO_SUBMIT_VENDOR_ORDERS.`
      : `${label} is wired but missing credentials: ${missing.join(', ') || 'none'}.`,
  };
}

function manualConnection(): VendorConnection {
  const verified = process.env.MANUAL_SUPPLIER_VERIFIED === 'true';
  return {
    id: 'manual',
    label: 'Manual Supplier Intake',
    mode: verified ? 'sandbox' : 'fixture',
    connected: verified,
    can_publish: verified && process.env.AUTO_PUBLISH_APPROVED !== 'false',
    can_submit_orders: false,
    last_checked_at: new Date().toISOString(),
    missing_env: verified ? [] : ['MANUAL_SUPPLIER_VERIFIED'],
    message: verified
      ? 'Manual supplier intake is founder-verified; order submission remains founder-approved.'
      : 'Manual supplier intake is fixture-backed until a vetted supplier CSV/API is approved.',
  };
}

export function bestConfiguredVendor(): VendorId {
  const configured = vendorConnections().find((v) => v.connected && v.id !== 'radar');
  return configured?.id ?? 'manual';
}

/** Vendor ids that currently have credentials (used for routing failover decisions). */
export function connectedVendorIds(): VendorId[] {
  return vendorConnections()
    .filter((v) => v.connected && v.id !== 'radar')
    .map((v) => v.id);
}

function marginFloor() {
  return Number(process.env.SUPPLIER_MARGIN_FLOOR ?? 0.38);
}

function maxShippingDays() {
  return Number(process.env.MAX_SHIPPING_DAYS ?? 12);
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
