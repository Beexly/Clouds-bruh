/**
 * Phase 6 — Commerce Completeness setup.
 * Run: pnpm --filter backend exec ../../scripts/setup-commerce.ts
 *
 * Creates: US region → payment provider → stock location → fulfillment set →
 * service zone → shipping profile → shipping option (free standard delivery).
 * Idempotent: skips any entity that already exists.
 */
import type { ExecArgs } from '@medusajs/framework/types';
import { Modules } from '@medusajs/framework/utils';
import { Modules as MedusaModules } from '@medusajs/framework/utils';
import {
  createRegionsWorkflow,
  createShippingOptionsWorkflow,
  createLocationFulfillmentSetWorkflow,
  createServiceZonesWorkflow,
  batchLinksWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from '@medusajs/core-flows';

export default async function setupCommerce({ container }: ExecArgs) {
  const regionModule = container.resolve(Modules.REGION) as any;
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT) as any;
  const pricingModule = container.resolve(Modules.PRICING) as any;
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION) as any;

  // ── 1. Region ─────────────────────────────────────────────────────────────
  const existingRegions = await regionModule.listRegions({}).catch(() => []);
  let regionId: string;
  if ((existingRegions as any[]).length > 0) {
    regionId = (existingRegions as any[])[0].id;
    console.log(`[setup] Region exists: ${regionId}`);
  } else {
    const { result: [region] } = await createRegionsWorkflow(container).run({
      input: {
        regions: [{
          name: 'United States',
          currency_code: 'usd',
          countries: ['us'],
          payment_providers: ['pp_system_default'],
        }],
      },
    });
    regionId = region.id;
    console.log(`[setup] Created region: ${regionId}`);
  }

  // ── 2. Stock location ──────────────────────────────────────────────────────
  const existingLocs = await stockLocationModule.listStockLocations({}).catch(() => []);
  let locationId: string;
  if ((existingLocs as any[]).length > 0) {
    locationId = (existingLocs as any[])[0].id;
    console.log(`[setup] Stock location exists: ${locationId}`);
  } else {
    const [loc] = await stockLocationModule.createStockLocations([{
      name: 'Alter XIV Fulfillment',
      address: { address_1: '100 Commerce Blvd', city: 'Los Angeles', country_code: 'US' },
    }]);
    locationId = loc.id;
    console.log(`[setup] Created stock location: ${locationId}`);
  }

  // ── 3. Fulfillment set ─────────────────────────────────────────────────────
  const existingFsets = await fulfillmentModule.listFulfillmentSets({}).catch(() => []);
  let fulfillmentSetId: string;
  if ((existingFsets as any[]).length > 0) {
    fulfillmentSetId = (existingFsets as any[])[0].id;
    console.log(`[setup] Fulfillment set exists: ${fulfillmentSetId}`);
  } else {
    await createLocationFulfillmentSetWorkflow(container).run({
      input: {
        location_id: locationId,
        fulfillment_set_data: {
          name: 'Drop-Ship Delivery',
          type: 'shipping',
        },
      },
    });
    const fsets = await fulfillmentModule.listFulfillmentSets({});
    fulfillmentSetId = (fsets as any[])[0].id;
    console.log(`[setup] Created fulfillment set: ${fulfillmentSetId}`);
  }

  // ── 4. Service zone ────────────────────────────────────────────────────────
  const allZones = await fulfillmentModule.listServiceZones({}).catch(() => []);
  let serviceZoneId: string;
  if ((allZones as any[]).length > 0) {
    serviceZoneId = (allZones as any[])[0].id;
    console.log(`[setup] Service zone exists: ${serviceZoneId}`);
  } else {
    const { result: [zone] } = await createServiceZonesWorkflow(container).run({
      input: {
        data: [{
          name: 'United States',
          fulfillment_set_id: fulfillmentSetId,
          geo_zones: [{ type: 'country', country_code: 'us' }],
        }],
      },
    });
    serviceZoneId = zone.id;
    console.log(`[setup] Created service zone: ${serviceZoneId}`);
  }

  // ── 4b. Link fulfillment provider to stock location ───────────────────────
  const existing_lfp = await fulfillmentModule.listFulfillmentSets({}).catch(() => []);
  const existingLinks = await (fulfillmentModule as any).listLocationFulfillmentProviders?.({ stock_location_id: locationId }).catch(() => null);
  if (!existingLinks || existingLinks === null) {
    // Use raw SQL if module method unavailable — direct link insert is safer here
    await batchLinksWorkflow(container).run({
      input: {
        create: [{
          [MedusaModules.STOCK_LOCATION]: { stock_location_id: locationId },
          [MedusaModules.FULFILLMENT]: { fulfillment_provider_id: 'manual_manual' },
        }],
        delete: [],
      },
    }).catch((e: Error) => console.warn('[setup] Link provider to location:', e.message?.slice(0, 80)));
    console.log(`[setup] Linked manual_manual provider to location ${locationId}`);
  } else {
    console.log('[setup] Provider-location link exists');
  }

  // ── 5. Shipping profile ────────────────────────────────────────────────────
  const existingProfiles = await fulfillmentModule.listShippingProfiles({}).catch(() => []);
  let shippingProfileId: string;
  if ((existingProfiles as any[]).length > 0) {
    shippingProfileId = (existingProfiles as any[])[0].id;
    console.log(`[setup] Shipping profile exists: ${shippingProfileId}`);
  } else {
    const [profile] = await fulfillmentModule.createShippingProfiles([{
      name: 'Default',
      type: 'default',
    }]);
    shippingProfileId = profile.id;
    console.log(`[setup] Created shipping profile: ${shippingProfileId}`);
  }

  // ── 6. Shipping option ─────────────────────────────────────────────────────
  const existingOptions = await fulfillmentModule.listShippingOptions({}).catch(() => []);
  if ((existingOptions as any[]).length > 0) {
    console.log(`[setup] Shipping option exists: ${(existingOptions as any[])[0].id}`);
  } else {
    const { result: [option] } = await createShippingOptionsWorkflow(container).run({
      input: [{
        name: 'Standard Delivery',
        service_zone_id: serviceZoneId,
        shipping_profile_id: shippingProfileId,
        provider_id: 'manual_manual',
        type: {
          label: 'Standard',
          description: 'Drop-ship delivery in 5–10 business days',
          code: 'standard',
        },
        price_type: 'flat',
        prices: [
          { amount: 0, currency_code: 'usd' },
        ],
      }],
    });
    console.log(`[setup] Created shipping option: ${option.id}`);
  }

  // ── 7. Link both sales channels to the stock location ─────────────────────
  const scModule = container.resolve(Modules.SALES_CHANNEL) as any;
  const allSalesChannels = await scModule.listSalesChannels({}).catch(() => []);
  const scIds: string[] = (allSalesChannels as any[]).map((sc: any) => sc.id);
  if (scIds.length > 0) {
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: locationId, add: scIds, remove: [] },
    }).catch((e: Error) => console.warn('[setup] SC-location link:', e.message?.slice(0, 80)));
    console.log(`[setup] Linked ${scIds.length} sales channel(s) to location`);
  }

  console.log('\n[setup] ✅ Commerce setup complete.');
  console.log('[setup] Region → payment provider → stock location → fulfillment → service zone → shipping option.');
  console.log('[setup] Checkout flow should now work end-to-end with pp_system_default (test mode).');
}
