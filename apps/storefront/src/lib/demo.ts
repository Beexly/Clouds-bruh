/**
 * DEMO MODE — a static catalog so the storefront renders a full, browsable experience with NO
 * backend (e.g. a $0 Vercel preview to share). Enabled by NEXT_PUBLIC_DEMO_MODE=1. In demo mode the
 * server data functions short-circuit to this data instead of fetching Medusa. Checkout/payment is
 * intentionally inert in this mode (that needs the real backend + Stripe). Products mirror the seed
 * fixtures; imagery lives in /public/demo/<handle>.png.
 */
export const DEMO =
  process.env.NEXT_PUBLIC_DEMO_MODE === '1' ||
  // Zero-config safety net: with no backend URL configured (e.g. a fresh Vercel deploy), fall back to
  // the static demo catalog instead of an empty/broken store. Set NEXT_PUBLIC_DEMO_MODE=0 to force the
  // real backend, or NEXT_PUBLIC_MEDUSA_URL to a live backend to leave demo mode automatically.
  (process.env.NEXT_PUBLIC_DEMO_MODE !== '0' && !process.env.NEXT_PUBLIC_MEDUSA_URL);

export interface DemoProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  thumbnail?: string;
  chapter: string;
  price: number; // cents
  rating: number;
  reviews_count: number;
  units_remaining?: number;
  badge?: string;
}

export const DEMO_PRODUCTS: DemoProduct[] = [
  { id: 'demo_armor_jacket', title: 'Armor Field Jacket', handle: 'armor-field-jacket', chapter: 'armor', price: 7900, rating: 4.8, reviews_count: 24, units_remaining: 9, badge: 'Editor’s pick', description: 'A weatherproof field jacket built for those who carry weight. Matte technical shell, structured collar, quiet hardware.' },
  { id: 'demo_armor_vest', title: 'Armor Puffer Vest', handle: 'armor-puffer-vest', chapter: 'armor', price: 6400, rating: 4.6, reviews_count: 22, units_remaining: 14, description: 'Insulated, structured, unbothered. A matte quilted vest that layers over everything and disappears into your rotation.' },
  { id: 'demo_still_journal', title: 'Stillness Linen Journal', handle: 'stillness-linen-journal', chapter: 'stillness', price: 2400, rating: 4.7, reviews_count: 18, units_remaining: 30, description: 'Linen-wrapped, thread-bound, quiet. For contemplation and the practice of writing things down.' },
  { id: 'demo_still_wrap', title: 'Stillness Yoga Wrap', handle: 'stillness-yoga-wrap', chapter: 'stillness', price: 4200, rating: 4.8, reviews_count: 15, units_remaining: 20, description: 'A softly draped wrap in muted stone. Movement, rest, and the calm before.' },
  { id: 'demo_signal_charger', title: 'Signal Wireless Charger', handle: 'signal-wireless-charger', chapter: 'signal', price: 3900, rating: 4.6, reviews_count: 31, units_remaining: 25, badge: 'New', description: 'Technology as devotion. A matte charging pad with a single amber breath of light. Tuned to frequency.' },
  { id: 'demo_signal_cable', title: 'Signal Cable Kit', handle: 'signal-cable-kit', chapter: 'signal', price: 1900, rating: 4.5, reviews_count: 36, units_remaining: 40, description: 'Braided, graphite, built to outlast the device. The quiet infrastructure of a connected life.' },
  { id: 'demo_altar_incense', title: 'Altar Brass Incense Holder', handle: 'altar-brass-incense-holder', chapter: 'altar', price: 3200, rating: 4.9, reviews_count: 17, units_remaining: 8, badge: 'Almost gone', description: 'Sculptural aged brass. The space where intention becomes ritual. A single wisp, a single breath.' },
  { id: 'demo_altar_tray', title: 'Altar Stone Tray', handle: 'altar-stone-tray', chapter: 'altar', price: 2700, rating: 4.7, reviews_count: 11, units_remaining: 12, description: 'Carved volcanic stone, matte and cool to the touch. Hold your small sacred objects.' },
  { id: 'demo_rel_shoe', title: 'Relentless Training Shoe', handle: 'relentless-training-shoe', chapter: 'relentless', price: 8800, rating: 4.5, reviews_count: 29, units_remaining: 6, badge: 'Almost gone', description: 'The grind is worship. Dark knit upper, responsive plate, built for the devoted.' },
  { id: 'demo_rel_short', title: 'Relentless Gym Short', handle: 'relentless-gym-short', chapter: 'relentless', price: 3400, rating: 4.4, reviews_count: 21, units_remaining: 18, description: 'Matte technical shorts that move when you move. Performance for the relentless.' },
];

/** Shape a demo product like a Medusa store product (so existing components render unchanged). */
export function toMedusaShape(p: DemoProduct) {
  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    description: p.description,
    thumbnail: p.thumbnail ?? `/demo/${p.handle}.webp`,
    metadata: {
      chapter: p.chapter,
      rating: p.rating,
      reviews_count: p.reviews_count,
      units_remaining: p.units_remaining,
      badge: p.badge,
    },
    images: [{ url: `/demo/${p.handle}.webp` }],
    variants: [
      { id: `${p.id}_v`, title: 'Standard', calculated_price: { calculated_amount: p.price, currency_code: 'usd' } },
    ],
  };
}

const byId = Object.fromEntries(DEMO_PRODUCTS.map((p) => [p.id, toMedusaShape(p)]));
const byHandle = Object.fromEntries(DEMO_PRODUCTS.map((p) => [p.handle, toMedusaShape(p)]));

export function demoProductsByIds(ids: string[]) {
  return ids.map((id) => byId[id]).filter(Boolean);
}
export function demoProductByHandle(handle: string) {
  return byHandle[handle] ?? null;
}
export function demoProductsByChapter(chapter: string) {
  return DEMO_PRODUCTS.filter((p) => p.chapter === chapter).map(toMedusaShape);
}
export function demoAllProducts() {
  return DEMO_PRODUCTS.map(toMedusaShape);
}

/** A personalized-looking Broadcast for the homepage (block order + product ids per rail). */
export function demoBroadcast() {
  return {
    visitor_id: 'demo',
    block_order: ['live_drops', 'trending_in_chapter', 'complete_the_set', 'worn_together'],
    blocks: {
      live_drops: [],
      trending_in_chapter: ['demo_armor_jacket', 'demo_rel_shoe', 'demo_signal_charger', 'demo_altar_incense'],
      complete_the_set: ['demo_armor_vest', 'demo_still_wrap', 'demo_rel_short', 'demo_signal_cable'],
      worn_together: ['demo_still_journal', 'demo_altar_tray', 'demo_armor_jacket', 'demo_signal_charger'],
    },
  };
}

/** Simple demo search over title/chapter/description. */
export function demoSearch(q: string) {
  const needle = (q || '').toLowerCase().trim();
  if (!needle) return demoAllProducts();
  return DEMO_PRODUCTS.filter(
    (p) => p.title.toLowerCase().includes(needle) || p.chapter.includes(needle) || p.description.toLowerCase().includes(needle),
  ).map((p) => ({ ...toMedusaShape(p), reason: `matches “${q}”` }));
}
