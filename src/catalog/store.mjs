import { readJson, writeJson } from '../lib/jsonfile.mjs';
import { now } from '../lib/clock.mjs';

export async function loadCatalog(paths) {
  return readJson(paths.catalog, { products: [], updatedAt: null });
}

export async function saveCatalog(paths, catalog) {
  catalog.updatedAt = now();
  await writeJson(paths.catalog, catalog);
  return catalog;
}

export async function upsertProduct(paths, product) {
  const catalog = await loadCatalog(paths);
  const i = catalog.products.findIndex((p) => p.id === product.id);
  if (i >= 0) catalog.products[i] = product;
  else catalog.products.push(product);
  await saveCatalog(paths, catalog);
  return product;
}

export async function getProduct(paths, id) {
  const catalog = await loadCatalog(paths);
  return catalog.products.find((p) => p.id === id) || null;
}

export async function getProductByCandidate(paths, candidateId) {
  const catalog = await loadCatalog(paths);
  return catalog.products.find((p) => p.origin?.candidateId === candidateId) || null;
}
