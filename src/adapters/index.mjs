/**
 * Adapter selector. Returns MOCK implementations by default — fully offline, no
 * secrets, no network. Live adapters are imported lazily ONLY when ALTAR_LIVE=1,
 * and each falls back to its mock if the live module isn't present yet (Phases 2–4).
 */
export const isLive = process.env.ALTAR_LIVE === '1';

async function load(name) {
  if (isLive) {
    try {
      return await import(`./${name}.live.mjs`);
    } catch {
      /* live module not present yet — fall through to mock */
    }
  }
  return import(`./${name}.mock.mjs`);
}

export async function getAdapters() {
  const [claude, websearch, imagegen, github] = await Promise.all([
    load('claude'),
    load('websearch'),
    load('imagegen'),
    load('github'),
  ]);
  return { claude, websearch, imagegen, github, live: isLive };
}
