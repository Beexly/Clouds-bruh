import { BRAND } from '../brand.mjs';
import { loadCatalog } from '../catalog/store.mjs';
import { projectStorefront } from './projection.mjs';
import { writeJson } from '../lib/jsonfile.mjs';
import { now } from '../lib/clock.mjs';

/** Build data/storefront.json — the public read model the static app.js consumes. */
export async function renderStorefront(paths) {
  const catalog = await loadCatalog(paths);
  const projection = projectStorefront(catalog);
  const data = {
    brand: {
      name: BRAND.name,
      network: BRAND.network,
      display: BRAND.display,
      tagline: BRAND.tagline,
      positioning: BRAND.positioning,
      palette: BRAND.palette,
      tiers: BRAND.tiers,
    },
    ...projection,
    generatedAt: now(),
  };
  await writeJson(paths.storefront, data);
  return data;
}
