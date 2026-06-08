import { defineConfig, loadEnv } from '@medusajs/framework/utils';
loadEnv(process.env.NODE_ENV || 'development', process.cwd());

// Launch safety: never let production boot silently on the insecure fallback secrets below.
if (process.env.NODE_ENV === 'production') {
  for (const k of ['JWT_SECRET', 'COOKIE_SECRET'] as const) {
    if (!process.env[k]) {
      console.warn(`[lumera] SECURITY WARNING: ${k} is not set — using an INSECURE default. Set it before launch.`);
    }
  }
}

/**
 * Lumera commerce core (internal codename Alter XIV). Standard Medusa modules + our custom
 * intelligence modules (signal · personalization · recommendation · drops · monetization · lumera).
 * The custom modules are the nervous system; Medusa's built-ins are the skeleton.
 */
export default defineConfig({
  // Admin can be disabled per-process (e.g. a Medusa Cloud "worker" instance, or any boot where the
  // static admin bundle isn't built/needed). Server processes keep it on by default.
  admin: {
    disable: process.env.MEDUSA_ADMIN_DISABLED === 'true',
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS || process.env.STORE_CORS || 'http://localhost:3000',
      jwtSecret: process.env.JWT_SECRET || 'supersecret',
      cookieSecret: process.env.COOKIE_SECRET || 'supersecret',
    },
  },
  modules: [
    { resolve: './src/modules/drops' },
    { resolve: './src/modules/signal' },
    { resolve: './src/modules/personalization' },
    { resolve: './src/modules/recommendation' },
    { resolve: './src/modules/monetization' },
    { resolve: './src/modules/lumera' },
    // Redis-backed event bus + workflow engine ONLY when REDIS_URL is set. Without it Medusa
    // falls back to its in-memory defaults, so `db:migrate`, seed, and boot work on a clean
    // checkout with no Redis available (and never hang waiting on a Redis connection).
    ...(process.env.REDIS_URL
      ? [
          { resolve: '@medusajs/medusa/event-bus-redis', options: { redisUrl: process.env.REDIS_URL } },
          { resolve: '@medusajs/medusa/workflow-engine-redis', options: { redis: { url: process.env.REDIS_URL } } },
        ]
      : []),
    // Payment: pp_system_default always enabled; Stripe activated when key present
    {
      resolve: '@medusajs/medusa/payment',
      options: {
        providers: [
          ...(process.env.STRIPE_API_KEY ? [{
            resolve: '@medusajs/medusa/payment-stripe',
            id: 'stripe',
            options: { apiKey: process.env.STRIPE_API_KEY },
          }] : []),
        ],
      },
    },
    // Fulfillment: manual drop-ship provider
    {
      resolve: '@medusajs/medusa/fulfillment',
      options: {
        providers: [{ resolve: '@medusajs/medusa/fulfillment-manual', id: 'manual' }],
      },
    },
    // Promotions module (coupons, campaigns)
    { resolve: '@medusajs/medusa/promotion' },
    // Asset storage: MinIO/S3 when configured (set S3_FILE_URL + S3_ENDPOINT + creds),
    // else local disk. MinIO is S3-compatible — point S3_ENDPOINT at the MinIO server and
    // keep forcePathStyle for bucket addressing. (F07 research: storage-control grammar.)
    {
      resolve: '@medusajs/medusa/file',
      options: {
        // Activate S3/MinIO ONLY when fully credentialed (url + access key + secret); otherwise
        // fall back to local disk. A half-set S3_FILE_URL (e.g. injected by the host) must never
        // boot the S3 provider without credentials — that crashes startup.
        providers: process.env.S3_FILE_URL && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
          ? [
              {
                resolve: '@medusajs/medusa/file-s3',
                id: 's3',
                options: {
                  file_url: process.env.S3_FILE_URL,
                  access_key_id: process.env.S3_ACCESS_KEY_ID,
                  secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
                  region: process.env.S3_REGION || 'us-east-1',
                  bucket: process.env.S3_BUCKET || 'lumera',
                  endpoint: process.env.S3_ENDPOINT, // e.g. http://minio:9000
                  additional_client_config: { forcePathStyle: true }, // MinIO path-style
                },
              },
            ]
          : [
              {
                resolve: '@medusajs/medusa/file-local',
                id: 'local',
                options: {
                  upload_dir: 'static',
                  backend_url: `${process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'}/static`,
                },
              },
            ],
      },
    },
  ],
});
