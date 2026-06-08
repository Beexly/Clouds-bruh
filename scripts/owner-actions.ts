const requiredEnv = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'COOKIE_SECRET',
  'STORE_CORS',
  'ADMIN_CORS',
  'MEDUSA_ADMIN_API_TOKEN',
  'NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY',
  'LUMERA_SALES_CHANNEL_ID',
  'LUMERA_SHIPPING_PROFILE_ID',
  'STRIPE_API_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'PRINTIFY_TOKEN',
  'PRINTIFY_SHOP_ID',
  'PRINTIFY_WEBHOOK_SECRET',
  'PRINTFUL_TOKEN',
  'PRINTFUL_STORE_ID',
  'PRINTFUL_WEBHOOK_SECRET',
  'CJ_API_KEY',
  'CJ_ACCESS_TOKEN',
  'CJ_WEBHOOK_SECRET',
  'COCKPIT_KEY',
];

const ownerApprovals = [
  'Final legal copy is live for terms, privacy, and returns.',
  'First live supplier list is founder-approved.',
  'First 20 live products are founder-approved from the curation board.',
  'Sample purchases are approved where quality risk requires it.',
  'Stripe live mode is approved after test checkout proof.',
  'Vendor live order submission is approved after sandbox/draft proof.',
  'Paid campaign spend is approved separately from product publishing.',
];

const args = new Set(process.argv.slice(2));
const liveProof =
  args.has('--live') ||
  args.has('--mode=live') ||
  process.env.LUMERA_LIVE_PROOF === 'true' ||
  process.env.VENDOR_LIVE_MODE === 'true';

function isMissing(key: string) {
  const value = process.env[key];
  return !value || value.includes('change_me') || value.includes('...');
}

function main() {
  const missing = requiredEnv.filter(isMissing);
  console.log('\nLumera owner action ledger');
  console.log('==========================\n');
  console.log(`proof_mode=${liveProof ? 'live' : 'code'}`);

  if (missing.length) {
    console.log(liveProof ? 'Missing required live env values:' : 'Live env values not present in this local shell:');
    missing.forEach((key) => console.log(`- ${key}`));
  } else {
    console.log('Required env values are present.');
  }

  console.log('\nOwner approvals to confirm outside code:');
  ownerApprovals.forEach((approval) => console.log(`- ${approval}`));

  const liveMode = process.env.VENDOR_LIVE_MODE === 'true';
  const autoSubmit = process.env.AUTO_SUBMIT_VENDOR_ORDERS === 'true';
  if (liveMode || autoSubmit) {
    console.log('\nWARNING: live vendor flags are enabled. Confirm sandbox proof and founder approval before launch.');
  } else {
    console.log('\nVendor live order submission remains disabled.');
  }

  if (liveProof && missing.length) {
    process.exitCode = 1;
  }
}

main();
