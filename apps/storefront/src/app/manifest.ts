import type { MetadataRoute } from 'next';

/** PWA manifest — installable, branded. Icons are CSS/SVG-free placeholders until assets land. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ALTER XIV — The Broadcast',
    short_name: 'ALTER XIV',
    description: 'Faith-rooted drop culture. Sacred objects, sacred armor.',
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
