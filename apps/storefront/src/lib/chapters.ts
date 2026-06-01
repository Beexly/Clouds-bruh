/**
 * Lumera chapters — the cross-category curation overlay.
 *
 * Slugs are LOAD-BEARING (routes `/chapter/<slug>`, personalization keys, seed `metadata.chapter`,
 * and the `chapter-*` palette tokens) — they never change. Only the DISPLAY labels are relit, so the
 * brand vocabulary can evolve without a migration. One source of truth; components import from here
 * instead of re-declaring the array.
 */
export const CHAPTERS = ['stillness', 'armor', 'signal', 'altar', 'relentless'] as const;
export type Chapter = (typeof CHAPTERS)[number];

/**
 * Display labels — a cohesive astronomical "states of light" lexicon (Lumera = light), relit fully
 * off the Alter-XIV vocabulary and mapped to each chapter's mood. Slugs stay; change a name here and
 * it propagates everywhere (nav, tune chips, footer, command palette, rail tags, chapter pages).
 */
const LABEL: Record<string, string> = {
  stillness: 'Penumbra', // the calm half-light
  armor: 'Eclipse', // the shielding shadow — protection
  signal: 'Flare', // the burst — what comes next
  altar: 'Vesper', // the evening star — kept, without the faith coding
  relentless: 'Meridian', // the sun's apex — drive
};

export function chapterLabel(slug: string): string {
  return LABEL[slug] ?? (slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : '');
}
