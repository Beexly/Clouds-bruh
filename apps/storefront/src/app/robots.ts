import type { MetadataRoute } from 'next';
import { SITE } from '../lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Keep private + internal surfaces out of the index (the cockpit is the founder ops dashboard).
      disallow: ['/checkout', '/cart', '/cockpit', '/account', '/track', '/login', '/register', '/api'],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
