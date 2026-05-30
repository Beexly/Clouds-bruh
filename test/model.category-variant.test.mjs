import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProduct, createVariant } from '../src/model/product.mjs';
import { createCategory, buildTree, breadcrumb, descendantIds, defaultTaxonomy } from '../src/model/category.mjs';
import { BRAND } from '../src/brand.mjs';

test('variant supports a generic attributes map (luxury breadth)', () => {
  const v = createVariant({ attributes: { material: 'Lambskin', lining: 'Cashmere' } }, 'accessory');
  assert.deepEqual(v.attributes, { material: 'Lambskin', lining: 'Cashmere' });
  assert.equal(v.label, 'Lambskin / Cashmere');
  assert.ok(v.sku.startsWith('ECL-'));
});

test('legacy color/size still works and is folded into attributes (back-compat)', () => {
  const v = createVariant({ color: 'Onyx', size: 'M' }, 'tops');
  assert.equal(v.color, 'Onyx');
  assert.equal(v.size, 'M');
  assert.equal(v.attributes.color, 'Onyx');
  assert.equal(v.attributes.size, 'M');
  assert.equal(v.label, 'Onyx / M');
  assert.equal(v.sku, 'ECL-TOPS-ONY-M'); // identical SKU to pre-R2 — no churn
});

test('product carries a tenant seam and a categoryId', () => {
  const p = createProduct({ title: 'X', description: 'x'.repeat(50), category: 'accessory', categoryId: 'cat_demo' });
  assert.equal(p.tenantId, BRAND.tenant);
  assert.equal(p.tenantId, 'eclipse');
  assert.equal(p.categoryId, 'cat_demo');
});

test('category tree: build, breadcrumb, descendants', () => {
  const apparel = createCategory({ title: 'Apparel' });
  const tops = createCategory({ title: 'Tops', parentId: apparel.id });
  const tees = createCategory({ title: 'Tees', parentId: tops.id });
  const flat = [apparel, tops, tees];

  const tree = buildTree(flat);
  assert.equal(tree.length, 1);
  assert.equal(tree[0].children[0].children[0].title, 'Tees');

  const crumb = breadcrumb(flat, tees.id).map((c) => c.title);
  assert.deepEqual(crumb, ['Apparel', 'Tops', 'Tees']);

  const desc = descendantIds(flat, apparel.id);
  assert.equal(desc.length, 3); // apparel + tops + tees
  assert.ok(desc.includes(tees.id));
});

test('default taxonomy has roots and nested children', () => {
  const tax = defaultTaxonomy();
  assert.ok(tax.length >= 10);
  const roots = buildTree(tax);
  assert.ok(roots.length >= 3, 'Apparel / Accessories / Objects roots');
  assert.ok(roots.every((r) => r.children.length >= 1), 'each root has children');
});
