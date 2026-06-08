type Connection = {
  id: string;
  label: string;
  missing: string[];
  connected: boolean;
  orderReady: boolean;
};

const required = [
  ['printify', 'Printify', ['PRINTIFY_TOKEN', 'PRINTIFY_SHOP_ID']],
  ['printful', 'Printful', ['PRINTFUL_TOKEN', 'PRINTFUL_STORE_ID']],
  ['cj', 'CJ Dropshipping', ['CJ_API_KEY', 'CJ_ACCESS_TOKEN']],
] as const;

const liveMode = process.env.VENDOR_LIVE_MODE === 'true';
const autoSubmit = process.env.AUTO_SUBMIT_VENDOR_ORDERS === 'true';
const draftProof = process.env.VENDOR_DRAFT_ORDER_PROOF === 'true';

const connections: Connection[] = required.map(([id, label, keys]) => {
  const missing = keys.filter((key) => !process.env[key]);
  return {
    id,
    label,
    missing,
    connected: missing.length === 0,
    orderReady: missing.length === 0 && liveMode && autoSubmit,
  };
});

const stripeLive = Boolean(process.env.STRIPE_API_KEY && !process.env.STRIPE_API_KEY.startsWith('sk_test'));
const adminToken = Boolean(process.env.MEDUSA_ADMIN_API_TOKEN || process.env.MEDUSA_ADMIN_TOKEN);
const marginFloor = Number(process.env.SUPPLIER_MARGIN_FLOOR ?? 0.38);
const maxShippingDays = Number(process.env.MAX_SHIPPING_DAYS ?? 12);

console.log('\nLUMERA VENDOR PREFLIGHT');
console.log('='.repeat(32));
console.log(`VENDOR_LIVE_MODE=${String(liveMode)}`);
console.log(`AUTO_SUBMIT_VENDOR_ORDERS=${String(autoSubmit)}`);
console.log(`VENDOR_DRAFT_ORDER_PROOF=${String(draftProof)}`);
console.log(`SUPPLIER_MARGIN_FLOOR=${marginFloor}`);
console.log(`MAX_SHIPPING_DAYS=${maxShippingDays}`);
console.log(`MEDUSA_ADMIN_API_TOKEN=${adminToken ? 'set' : 'missing'}`);
console.log(`STRIPE live key=${stripeLive ? 'yes' : 'no'}`);

for (const c of connections) {
  const state = c.connected ? (c.orderReady ? 'order-ready' : 'configured-gated') : `missing ${c.missing.join(', ')}`;
  console.log(`- ${c.label}: ${state}`);
}

const blockers: string[] = [];
if (liveMode) {
  if (!stripeLive) blockers.push('STRIPE_API_KEY must be a live key before VENDOR_LIVE_MODE=true.');
  if (!adminToken) blockers.push('MEDUSA_ADMIN_API_TOKEN is required to publish approved products.');
  for (const c of connections) {
    if (!c.connected) blockers.push(`${c.label} missing credentials: ${c.missing.join(', ')}`);
  }
}

if (blockers.length) {
  console.log('\nBLOCKED');
  blockers.forEach((b) => console.log(`- ${b}`));
  process.exit(1);
}

console.log('\nVERDICT: vendor lane configured safely.');
