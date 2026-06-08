import type { MetadataRoute } from 'next';
import { BRAND, EXPERIENCE, DESCRIPTION } from '../lib/brand';

/**
 * PWA manifest — installable, branded. The base `any` icon is the app mark; the maskable entries
 * (192/512) carry the safe-zone-padded mark so Android's adaptive icon mask renders cleanly on the
 * home screen instead of clipping the corona ring. SVG scales to every density, so one asset covers
 * both declared sizes.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND} — ${EXPERIENCE}`,
    short_name: BRAND,
    description: DESCRIPTION,
    start_url: '/',
    display: 'standalone',
    background_color: '#0B0B0D',
    theme_color: '#0B0B0D',
    categories: ['shopping', 'lifestyle'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-maskable.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'maskable' },
      { src: '/icon-maskable.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
