import { BRAND } from '../brand.mjs';

/**
 * Brand-consistent image prompt engineering for Eclipse (dark luxury × punk/gothic).
 * Pure + deterministic so prompts are reviewable and testable. These strings are
 * what the image-generation MCP receives; this module never calls it.
 */

const STYLE = [
  'editorial product photography',
  'dark luxury, punk-gothic mood',
  'matte black seamless background',
  'dramatic low-key lighting with a single warm rim light',
  'high detail, sharp focus, premium e-commerce quality',
  'no text, no watermark, no logos',
].join(', ');

const ROLE_FRAMING = {
  hero: 'centered hero shot, three-quarter angle, full product in frame',
  angle: 'alternate 45-degree angle showing depth and silhouette',
  detail: 'extreme close-up macro of material, stitching, and hardware',
  flatlay: 'top-down flat lay on textured stone surface',
  scale: 'product shown in-hand or on body for scale reference',
};

const ROLE_SIZE = {
  hero: '1024x1280',
  angle: '1024x1280',
  detail: '1024x1024',
  flatlay: '1024x1024',
  scale: '1024x1280',
};

/** Build the generation prompt for one product + role. */
export function buildImagePrompt(product, role = 'hero') {
  const specs = Object.entries(product.specs || {})
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
  const subject = [product.title, product.subtitle].filter(Boolean).join(', ');
  const framing = ROLE_FRAMING[role] || ROLE_FRAMING.hero;
  return [
    `${BRAND.name} ${product.category || 'product'}: ${subject}`,
    specs ? `materials — ${specs}` : '',
    framing,
    STYLE,
  ]
    .filter(Boolean)
    .join('. ');
}

/** Build a per-role request descriptor list for a product. */
export function imageRequestsFor(product, roles = ['hero', 'angle', 'detail']) {
  return roles.map((role) => ({
    role,
    size: ROLE_SIZE[role] || '1024x1280',
    prompt: buildImagePrompt(product, role),
  }));
}

export { ROLE_FRAMING, ROLE_SIZE };
