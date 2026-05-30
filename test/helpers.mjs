import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPaths } from '../src/lib/paths.mjs';

/** Fresh temp-dir paths so tests never touch the committed data/queue files. */
export async function tempPaths() {
  const dir = await mkdtemp(join(tmpdir(), 'eclipse-test-'));
  return createPaths(dir);
}

/** A product with every field complete — passes all substantive gates. */
export function completeProductInput(overrides = {}) {
  return {
    title: 'XIV Hoodie',
    description: 'A heavy, specific, deliberately constructed description well over forty characters.',
    category: 'tops',
    bulletBenefits: ['500GSM French terry', 'Set-in sleeves', 'Embroidered mark'],
    emotionalHooks: ['Heavy enough to feel like armor.'],
    specs: { gsm: '500', fiber: 'French terry' },
    variants: [{ color: 'Onyx', size: 'M', inventory: { onHand: 0, reserved: 0, restockThreshold: 6 } }],
    supplierId: 'sup_demo',
    pricing: { listMinor: 9800, floorMinor: 5000, currency: 'USD' },
    media: [
      { role: 'hero', url: 'a', approved: true },
      { role: 'angle', url: 'b', approved: true },
      { role: 'detail', url: 'c', approved: true },
    ],
    ...overrides,
  };
}
