import { collectionId as makeId, slugify } from './ids.mjs';
import { now } from '../lib/clock.mjs';

/**
 * Category taxonomy (R2). A self-referential tree (`parentId`) that organizes
 * the catalog for marketplace breadth — distinct from curated `collection`s
 * (drops/merchandising). A product references a leaf via `product.categoryId`.
 *
 * Dependency-free; pure helpers build the tree and breadcrumbs from a flat list.
 */
export function createCategory(input = {}) {
  const title = input.title || 'Category';
  const slug = input.slug || slugify(title);
  return {
    id: input.id || 'cat_' + makeId([slug, input.parentId || 'root']).slice(4),
    slug,
    title,
    parentId: input.parentId || null,
    description: input.description,
    createdAt: input.createdAt || now(),
  };
}

/** Build a nested tree ({...category, children:[]}) from a flat category list. */
export function buildTree(categories = []) {
  const byId = new Map(categories.map((c) => [c.id, { ...c, children: [] }]));
  const roots = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) byId.get(node.parentId).children.push(node);
    else roots.push(node);
  }
  return roots;
}

/** Root → node breadcrumb trail for a category id. */
export function breadcrumb(categories = [], id) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const trail = [];
  let cur = byId.get(id);
  let guard = 0;
  while (cur && guard++ < 100) {
    trail.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : null;
  }
  return trail;
}

/** All descendant ids of a category (inclusive) — for "everything under X". */
export function descendantIds(categories = [], id) {
  const childrenOf = new Map();
  for (const c of categories) {
    if (!childrenOf.has(c.parentId)) childrenOf.set(c.parentId, []);
    childrenOf.get(c.parentId).push(c.id);
  }
  const out = [];
  const stack = [id];
  let guard = 0;
  while (stack.length && guard++ < 10000) {
    const cur = stack.pop();
    out.push(cur);
    for (const child of childrenOf.get(cur) || []) stack.push(child);
  }
  return out;
}

/**
 * The Eclipse default taxonomy — mirrors the concept-library categories with a
 * luxury two-level structure. Seeded so the storefront has a real category tree.
 */
export function defaultTaxonomy() {
  const mk = (title, parentId) => createCategory({ title, parentId });
  const apparel = mk('Apparel');
  const accessories = mk('Accessories');
  const objects = mk('Objects');
  return [
    apparel,
    mk('Outerwear', apparel.id),
    mk('Tops', apparel.id),
    mk('Bottoms', apparel.id),
    mk('Footwear', apparel.id),
    accessories,
    mk('Bags', accessories.id),
    mk('Jewelry', accessories.id),
    mk('Eyewear', accessories.id),
    objects,
    mk('Home', objects.id),
    mk('Fragrance', objects.id),
  ];
}
