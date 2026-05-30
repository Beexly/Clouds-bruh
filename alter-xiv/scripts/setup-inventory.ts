/**
 * Phase 6 — Configure variants for drop-ship (no inventory tracking).
 * Sets manage_inventory=false and allow_backorder=true on all variants.
 * Run: pnpm --filter backend exec ../../scripts/setup-inventory.ts
 */
import type { ExecArgs } from '@medusajs/framework/types';
import { Modules } from '@medusajs/framework/utils';

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT) as any;

  const products = await productModule.listProducts(
    { deleted_at: null },
    { select: ['id', 'variants.id'], relations: ['variants'] }
  ) as any[];

  let total = 0;
  const BATCH = 20;

  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH);
    for (const product of batch) {
      for (const variant of (product.variants ?? [])) {
        await productModule.updateProductVariants(variant.id, {
          manage_inventory: false,
          allow_backorder: true,
        } as any).catch((e: Error) =>
          console.warn(`[setup-inv] Variant ${variant.id}:`, e.message?.slice(0, 60))
        );
        total++;
      }
    }
    console.log(`[setup-inv] ${total} variants updated (allow_backorder=true, manage_inventory=false)`);
  }

  console.log('[setup-inv] ✅ All variants configured for drop-ship.');
}
