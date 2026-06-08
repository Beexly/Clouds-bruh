/**
 * Integration ignition status for the Founder's Cockpit. Reports which capabilities are CONFIGURED
 * (presence of the key only — never the secret value itself) and what each one unlocks, so the founder
 * can see at a glance why a worker is idle and which key wakes it. Pure (takes env) so it's unit-tested.
 */
export interface IntegrationStatus {
  key: string;
  label: string;
  unlocks: string;
  configured: boolean;
}

/** The ANTHROPIC_API_KEY placeholder shipped in .env.example — treated as unset. */
const ANTHROPIC_PLACEHOLDER = 'sk-ant-...';

export function integrationStatus(env: NodeJS.ProcessEnv = process.env): IntegrationStatus[] {
  const has = (k: string) => typeof env[k] === 'string' && (env[k] as string).trim().length > 0;
  const anthropicLive = has('ANTHROPIC_API_KEY') && env.ANTHROPIC_API_KEY !== ANTHROPIC_PLACEHOLDER;

  return [
    { key: 'anthropic', label: 'Anthropic — the Constellation', unlocks: 'Wakes all 14 autonomous workers (mock → live)', configured: anthropicLive },
    { key: 'stripe', label: 'Stripe', unlocks: 'Card checkout + live financials', configured: has('STRIPE_API_KEY') },
    { key: 'paypal', label: 'PayPal', unlocks: 'PayPal Smart Buttons at checkout', configured: has('PAYPAL_CLIENT_ID') },
    { key: 'email', label: 'Email (Resend)', unlocks: 'Order confirmations + lifecycle email', configured: has('RESEND_API_KEY') },
    { key: 'redis', label: 'Redis', unlocks: 'Event bus + workflow engine + SIGNAL stream', configured: has('REDIS_URL') },
    { key: 'storage', label: 'Media storage (S3/MinIO)', unlocks: 'Durable product imagery across deploys', configured: has('S3_FILE_URL') && has('S3_ACCESS_KEY_ID') && has('S3_SECRET_ACCESS_KEY') },
    { key: 'radar', label: 'Product radar', unlocks: 'AliExpress / Alibaba / Shein discovery', configured: has('OXYLABS_USER') || has('APIFY_TOKEN') },
    { key: 'imagery', label: 'AI imagery (Higgsfield)', unlocks: 'Artisan product photography', configured: has('HIGGSFIELD_API_KEY') },
    { key: 'vendors', label: 'Supplier fulfillment', unlocks: 'Live vendor catalog + order routing', configured: has('PRINTIFY_TOKEN') || has('PRINTFUL_TOKEN') || has('CJ_API_KEY') },
  ];
}
