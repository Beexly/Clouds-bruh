import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Modules } from '@medusajs/framework/utils';
import { createApiKeysWorkflow, linkSalesChannelsToApiKeyWorkflow } from '@medusajs/medusa/core-flows';

/**
 * Find-or-create a publishable API key and link it to every sales channel, then print it as
 * `PUBLISHABLE_KEY=<token>` so the bootstrap can capture it. This is what makes a clean-checkout
 * store reachable — without a linked publishable key, every /store route returns 400.
 *
 *   npx medusa exec ../../scripts/ensure-publishable-key.ts
 */
export default async function ensurePublishableKey({ container }: { container: any }) {
  const apiKeyModule = container.resolve(Modules.API_KEY);
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL);

  const existing = await apiKeyModule.listApiKeys({ type: 'publishable' }).catch(() => []);
  let keyId: string;
  let token: string;

  if (existing.length) {
    keyId = existing[0].id;
    token = existing[0].token;
    console.log('[ensure-pk] using existing publishable key');
  } else {
    const { result } = await createApiKeysWorkflow(container).run({
      input: { api_keys: [{ type: 'publishable', title: 'Storefront', created_by: 'system' }] },
    });
    keyId = result[0].id;
    token = result[0].token;
    console.log('[ensure-pk] created publishable key');
  }

  const channels = await salesChannelModule.listSalesChannels({}).catch(() => []);
  if (channels.length) {
    await linkSalesChannelsToApiKeyWorkflow(container)
      .run({ input: { id: keyId, add: channels.map((c: any) => c.id) } })
      .catch((e: any) => console.warn('[ensure-pk] link warning:', e.message?.slice(0, 80)));
    console.log(`[ensure-pk] linked ${channels.length} sales channel(s)`);
  }

  // Emit for capture (stdout is the source of truth). Also persist to a temp file owner-only for
  // convenience — never a world-readable fixed path.
  try {
    writeFileSync(join(tmpdir(), 'lumera-pk'), token, { mode: 0o600 });
  } catch {
    // best-effort convenience write; stdout capture below is authoritative
  }
  console.log(`PUBLISHABLE_KEY=${token}`);
}
