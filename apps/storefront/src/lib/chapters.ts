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

/** Display labels — relit off the Alter-XIV lexicon (esp. the faith-coded "Altar"). */
const LABEL: Record<string, string> = {
  stillness: 'Stillness',
  armor: 'Armor',
  signal: 'Signal',
  altar: 'Relic',
  relentless: 'Relentless',
};

export function chapterLabel(slug: string): string {
  return LABEL[slug] ?? (slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : '');
}
