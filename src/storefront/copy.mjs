import { pick } from '../lib/rng.mjs';

/**
 * Brand copy engine. The Altar XIV capsule (4 pieces) carries hand-written copy
 * from conversion/altar-xiv-conversion-system.md (Cycle 10). The Vault generator
 * writes gothic-luxe, specificity-forward, profanity-free copy for sourced items.
 */

export const ALTAR_XIV_CAPSULE = Object.freeze([
  {
    key: 'altar-tee',
    title: 'Altar Tee',
    subtitle: '400GSM Heavyweight Cotton',
    category: 'tops',
    description:
      'Cut heavy, printed deliberate, built for the person who carries conviction everywhere. 400GSM organic cotton, boxy dropped-shoulder cut, made for a five-year wear life.',
    bulletBenefits: [
      '400GSM organic ring-spun cotton — the weight you feel on contact',
      'Boxy, dropped-shoulder cut designed to layer or stand alone',
      'Screen-printed, not transferred — ink pressed into fabric to age well',
      'Pre-washed to resist shrink — what you order is what you wear',
    ],
    emotionalHooks: ['Worn. Not displayed.', 'Formed at the altar. Lived on the street.'],
    specs: { gsm: '400', fiber: 'Organic cotton', print: 'Water-based screen' },
  },
  {
    key: 'xiv-hoodie',
    title: 'XIV Hoodie',
    subtitle: '500GSM French Terry',
    category: 'tops',
    description:
      'XIV is a reference point, not decoration. Built from 500GSM French terry that holds structure wash after wash. Clean construction, specific meaning, no filler branding.',
    bulletBenefits: [
      '500GSM French terry — measurably heavier than fast-fashion fleece',
      'Set-in sleeves hold the shoulder across repeated wear',
      'Embroidered XIV — raised thread, permanent, correct scale',
      'Pre-washed — what arrives is what it remains',
    ],
    emotionalHooks: ['Heavy enough to feel like armor.', 'The ones who know will recognize you.'],
    specs: { gsm: '500', fiber: 'French terry', mark: 'Embroidered XIV' },
  },
  {
    key: 'remnant-cap',
    title: 'Remnant Cap',
    subtitle: 'Six-Panel Structured',
    category: 'accessory',
    description:
      'Structured six-panel built for daily wear with tonal, faith-forward embroidery. Buckram-lined front panels hold the crown without a frame. Low-profile, high-conviction.',
    bulletBenefits: [
      'Buckram-lined front panels — shape retained without storage',
      'Tonal embroidery — reads as texture before it reads as text',
      'Brass adjuster buckle — closes secure, never cheapens',
      'Cotton twill resists fraying at the brim edge',
    ],
    emotionalHooks: ['Worn by those who held the line.', 'One word. You know if it is yours.'],
    specs: { construction: 'Six-panel', lining: 'Buckram', hardware: 'Brass buckle' },
  },
  {
    key: 'consecrated-crewneck',
    title: 'Consecrated Crewneck',
    subtitle: '480GSM Garment-Dyed Fleece',
    category: 'tops',
    description:
      'Set apart by construction. 480GSM loopback fleece, garment-dyed post-construction so each piece lands slightly different. Structured outside, brushed inside.',
    bulletBenefits: [
      '480GSM loopback fleece — heavyweight without being suffocating',
      'Garment-dyed — subtle tonal variation, each piece unique',
      'Ribbed collar holds its round through repeated washes',
      'Preshrunk — what you order is what you keep',
    ],
    emotionalHooks: ['Each one different. Like the person who wears it.', 'Set apart. Now the wardrobe matches.'],
    specs: { gsm: '480', fiber: 'Loopback fleece', finish: 'Garment-dyed' },
  },
]);

const ORIGINS = ['Made in Portugal', 'Made in Italy', 'Made in Japan', 'Made in Los Angeles'];
const CARE = ['Cold wash, hang dry', 'Spot clean only', 'Dry clean recommended'];

/** Gothic-luxe copy for a sourced Vault concept. Deterministic given rng. */
export function vaultCopyFor({ name, category, specs = {}, rng }) {
  const origin = rng ? pick(rng, ORIGINS) : ORIGINS[0];
  const care = rng ? pick(rng, CARE) : CARE[0];
  const material = specs.material || 'Premium materials';
  const detail = specs.detail || 'Considered hardware';
  return {
    title: name,
    subtitle: material,
    description:
      `${name} — built for those who already know. ${material.toLowerCase().startsWith('made') ? material : material} with ${detail.toLowerCase()}. ` +
      `Dark, deliberate, and made to outlast the trend cycle. Specificity over volume, always.`,
    bulletBenefits: [
      `${material} — quality you register before any logo`,
      `${detail} — the detail most of the market skips`,
      `Considered ${category} silhouette — engineered to be worn, not just seen`,
      `${origin} in a controlled run — no oversupply, no markdowns`,
    ],
    emotionalHooks: ['Not for everyone. Exactly as intended.', 'Step into the dark.'],
    specs: { ...specs, origin, care },
  };
}

/** Colorways and sizes by category — used to build variants. */
export function colorwaysFor(category, rng) {
  const base = ['Onyx', 'Bone', 'Oxblood'];
  if (category === 'jewelry') return ['Gold', 'Silver'];
  if (category === 'footwear') return ['Onyx', 'Bone'];
  return rng ? shuffle(base, rng) : base;
}

export function sizesFor(category) {
  if (['tops', 'outerwear'].includes(category)) return ['S', 'M', 'L', 'XL'];
  if (category === 'bottoms') return ['28', '30', '32', '34'];
  if (category === 'footwear') return ['8', '9', '10', '11'];
  return ['OS'];
}

function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
