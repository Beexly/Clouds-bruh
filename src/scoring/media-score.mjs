import { clamp } from '../lib/num.mjs';

const ROLE_POINTS = { hero: 30, angle: 20, detail: 15, scale: 15, flatlay: 10, video: 10 };

/** Imagery score from APPROVED media only. Distinct roles add their weight. */
export function mediaScore(media = []) {
  const seen = new Set();
  let s = 0;
  for (const m of media) {
    if (!m.approved) continue; // unapproved imagery never counts
    if (seen.has(m.role)) continue;
    seen.add(m.role);
    s += ROLE_POINTS[m.role] || 5;
  }
  return clamp(Math.round(s), 0, 100);
}

// Gate minimum: a hero plus at least one supporting angle (30 + 20+ = 50+; we require 60).
export const MEDIA_MIN = 60;
