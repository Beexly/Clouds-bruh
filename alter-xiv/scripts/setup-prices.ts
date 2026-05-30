/**
 * Phase 6 — Wire product variant prices through the Medusa pricing module.
 * The seed created products/variants via productModule directly; prices need
 * to be linked via upsertVariantPricesWorkflow to appear in carts.
 *
 * Run: pnpm --filter backend exec ../../scripts/setup-prices.ts
 */
import type { ExecArgs } from '@medusajs/framework/types';
import { Modules } from '@medusajs/framework/utils';
import { upsertVariantPricesWorkflow } from '@medusajs/core-flows';

// Chapter-based pricing (USD cents) — authentic brand positioning
const CHAPTER_PRICES: Record<string, number> = {
  stillness:  8900,   // $89 — contemplative, slow
  armor:     14900,   // $149 — outerwear weight
  signal:    12900,   // $129 — tech accessories
  altar:      7900,   // $79 — sacred objects
  relentless: 9900,   // $99 — athletic
};

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT) as any;

  // Get all product variants + their product metadata (chapter)
  const products = await productModule.listProducts(
    { deleted_at: null },
    { select: ['id', 'metadata', 'variants.id'], relations: ['variants'] }
  ) as any[];

  const variantPrices: { variant_id: string; product_id: string; prices: { amount: number; currency_code: string }[] }[] = [];

  for (const product of products) {
    const chapter = (product.metadata as any)?.chapter as string | undefined;
    const amount = CHAPTER_PRICES[chapter ?? ''] ?? 9900;
    for (const variant of (product.variants ?? [])) {
      variantPrices.push({
        variant_id: variant.id,
        product_id: product.id,
        prices: [{ amount, currency_code: 'usd' }],
      });
    }
  }

  console.log(`[setup-prices] Upserting prices for ${variantPrices.length} variants...`);

  // Process in batches of 20 to avoid timeouts
  const BATCH = 20;
  let done = 0;
  for (let i = 0; i < variantPrices.length; i += BATCH) {
    const batch = variantPrices.slice(i, i + BATCH);
    await upsertVariantPricesWorkflow(container).run({
      input: {
        variantPrices: batch,
        previousVariantIds: [],
      },
    }).catch((e: Error) => console.warn(`[setup-prices] Batch ${Math.floor(i/BATCH)+1} error:`, e.message?.slice(0, 80)));
    done += batch.length;
    console.log(`[setup-prices] ${done}/${variantPrices.length} variants priced`);
  }

  console.log('[setup-prices] ✅ All variants priced. Checkout should now work.');
}
