/**
 * Eclipse — the single source of truth for brand identity.
 *
 * The house brand lives inside the Galaxy Network (sibling to Galaxy Sports).
 * Change `name` / `key` here and the whole system rebrands — storefront, SKUs,
 * ops console, order numbers, copy. Nothing hardcodes the brand elsewhere.
 *
 * Altar XIV is retained as a FUTURE capsule (a sub-line we develop later); its
 * copy lives in conversion/altar-xiv-conversion-system.md and seeds the first
 * apparel capsule, but it is no longer the master brand.
 */
export const BRAND = Object.freeze({
  key: 'eclipse',
  name: 'Eclipse',
  network: 'Galaxy',
  display: 'Eclipse · Galaxy Network',
  skuPrefix: 'ECL',
  orderPrefix: 'ECL',
  tagline: 'Step into the dark.',
  positioning:
    'A curated luxury marketplace: the breadth and autonomous curation of the ' +
    'mega-retailers, the polish and price confidence of the luxury houses, the ' +
    'edge of streetwear — kept clean, dark, and deliberate.',

  voice: Object.freeze({
    profanity: false,
    traits: ['confident', 'exclusive', 'specific', 'unhurried', 'dark-luxe'],
    rules: [
      'No profanity, ever.',
      'Specificity is the proof — lead with materials, construction, numbers.',
      'No fabricated scarcity, no fake reviews, no padded MSRPs.',
      'Speak to those who already know. Never explain, never beg.',
    ],
  }),

  // Dark luxury / punk-gothic palette. Mirrored by public/styles/tokens.css.
  palette: Object.freeze({
    void: '#0A0A0D', // page base — near-black
    surface: '#14141A', // raised surfaces
    surfaceHi: '#1E1E27',
    ink: '#F4F4F6', // primary text — bone
    muted: '#9A9AA5',
    line: '#2A2A33',
    corona: '#E9C46A', // primary accent — the warm ring of an eclipse (gold)
    plasma: '#6C4BF4', // secondary — cosmic violet
    oxblood: '#7A1E2B', // punk accent / danger
    signal: '#3FB6A8', // success / in-stock
  }),

  type: Object.freeze({
    display: "'Cormorant Garamond', 'Times New Roman', serif", // gothic-luxe display
    body: "system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    mono: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace",
  }),

  // Tiered house structure (the plan's House line + Vault).
  tiers: Object.freeze({
    house: 'Eclipse House', // signature, permanent, luxury
    vault: 'The Vault', // broad, autonomously-sourced, curation-gated
  }),

  // Brand designs developed within Eclipse. Altar XIV is the first, deferred capsule.
  capsules: Object.freeze([
    Object.freeze({
      key: 'altar-xiv',
      name: 'Altar XIV',
      status: 'future',
      note: 'Gothic-luxury apparel capsule. Copy: conversion/altar-xiv-conversion-system.md',
    }),
  ]),
});

export default BRAND;
