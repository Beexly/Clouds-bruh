import { mediaId, slugify } from '../model/ids.mjs';

/**
 * Stand-in imagery. Returns placeholder MediaRefs pointing at committed SVGs so
 * product pages render without any real shoot. Real mode (Phase 3) swaps in the
 * image-gen MCP. Every ref is born `approved:false` — only a human approval (or,
 * later, an explicit imagery-approve step) makes imagery count toward the gate.
 */
export function generateImagery(name, roles = ['hero', 'angle', 'detail']) {
  const slug = slugify(name);
  return roles.map((role) => ({
    id: mediaId([slug, role]),
    role,
    url: `assets/placeholder/${role}.svg`,
    alt: `${name} — ${role} (placeholder, pending real shoot)`,
    provenance: 'placeholder',
    approved: false,
  }));
}
