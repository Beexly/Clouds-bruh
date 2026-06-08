/**
 * Lumera — one-command production bootstrap (idempotent; safe to re-run).
 *
 *   pnpm bootstrap                 # from the repo root
 *   # or directly:
 *   cd apps/backend && npx medusa exec ../../scripts/bootstrap.ts
 *
 * Runs everything a fresh Medusa Cloud deploy needs to become a real store:
 *   catalog → commerce (region · shipping · sales-channel) → prices → inventory →
 *   membership tiers → publishable API key (printed at the end).
 *
 * Migrations are run automatically by Medusa Cloud on deploy, so this only seeds/links data.
 * Does NOT require pgvector. Recommendations & hybrid search use embeddings, which are a
 * separate optional step that needs the `vector` extension enabled on the database:
 *   cd apps/backend && DATABASE_URL=... npx tsx ../../scripts/setup-embeddings.ts
 */
import type { ExecArgs } from '@medusajs/framework/types';
import seedCatalog from './seed';
import setupCommerce from './setup-commerce';
import setupPrices from './setup-prices';
import setupInventory from './setup-inventory';
import seedMonetization from './seed-monetization';
import ensurePublishableKey from './ensure-publishable-key';

export default async function bootstrap(args: ExecArgs) {
  const steps: { name: string; run: (a: ExecArgs) => Promise<unknown> }[] = [
    { name: 'catalog', run: seedCatalog },
    { name: 'commerce (region · shipping · sales-channel)', run: setupCommerce },
    { name: 'prices', run: setupPrices },
    { name: 'inventory', run: setupInventory },
    { name: 'membership tiers', run: seedMonetization as (a: ExecArgs) => Promise<unknown> },
    { name: 'publishable API key', run: ensurePublishableKey as (a: ExecArgs) => Promise<unknown> },
  ];

  console.log('\n[bootstrap] ▸ Lumera store bootstrap starting...');
  for (const step of steps) {
    console.log(`\n[bootstrap] ── ${step.name} ──`);
    await step.run(args);
    console.log(`[bootstrap] ✓ ${step.name}`);
  }
  console.log(
    '\n[bootstrap] ✅ Store ready.\n' +
      '[bootstrap]    → Copy the PUBLISHABLE_KEY printed above into the storefront env as ' +
      'NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY.\n' +
      '[bootstrap]    → For recommendations/search: enable the pgvector extension, then run ' +
      'scripts/setup-embeddings.ts.',
  );
  // One-shot command: exit cleanly even if a module left a DB/Redis handle open (otherwise the
  // process can hang after the work is done).
  process.exit(0);
}
