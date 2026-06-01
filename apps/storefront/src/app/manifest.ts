import type { MetadataRoute } from 'next';
import { BRAND, EXPERIENCE, DESCRIPTION } from '../lib/brand';

/** PWA manifest — installable, branded. Icons are CSS/SVG-free placeholders until assets land. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND} — ${EXPERIENCE}`,
    short_name: BRAND,
    description: DESCRIPTION,
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#0a0a0a',
    categories: ['shopping', 'lifestyle'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  };
}
