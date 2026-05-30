import { defineConfig, loadEnv } from '@medusajs/framework/utils';
loadEnv(process.env.NODE_ENV || 'development', process.cwd());

/**
 * Alter XIV commerce core. Standard Medusa modules + our four custom intelligence modules.
 * The custom modules are the nervous system; Medusa's built-ins are the skeleton.
 */
export default defineConfig({
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
    // Redis-backed event bus + workflow engine in production:
    { resolve: '@medusajs/medusa/event-bus-redis', options: { redisUrl: process.env.REDIS_URL } },
    { resolve: '@medusajs/medusa/workflow-engine-redis', options: { redis: { url: process.env.REDIS_URL } } },
  ],
});
