import { BRAND } from '../brand.mjs';
import { readJson } from '../lib/jsonfile.mjs';
import { loadCatalog } from '../catalog/store.mjs';

/** Build the brand + policy + data context handed to every agent run. */
export async function buildContext(paths, opts = {}) {
  const suppliers = await readJson(paths.suppliers, []);
  const catalog = await loadCatalog(paths);
  return {
    brand: BRAND,
    suppliers,
    existingNames: (catalog.products || []).map((p) => p.title),
    catalog,
    seed: opts.seed ?? (Date.now() % 1_000_000_000),
  };
}
