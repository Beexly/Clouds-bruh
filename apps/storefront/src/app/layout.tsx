import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { CartProvider } from '../context/cart';
import { CustomerProvider } from '../context/customer';
import { WishlistProvider } from '../context/wishlist';
import { SiteHeader } from '../components/SiteHeader';
import { PageTransition } from '../components/PageTransition';
import { Shepherd } from '../components/Shepherd';
import { CommandPalette } from '../components/CommandPalette';
import { Footer } from '../components/Footer';
import { Analytics } from '../components/Analytics';
import { ConsentBanner } from '../components/ConsentBanner';
import { ServiceWorker } from '../components/ServiceWorker';
import { BRAND, EXPERIENCE, TAGLINE, DESCRIPTION } from '../lib/brand';
import { organization, webSite, jsonLdScript } from '../lib/jsonld';
import { SITE } from '../lib/site';

// Editorial serif for display accents; a quiet grotesque for the body.
// Self-hosted (next/font/local) so production builds never depend on a runtime
// Google Fonts fetch — reproducible, offline-capable, and faster cold builds.
const serif = localFont({
  src: [
    { path: './fonts/cormorant-garamond-300.woff2', weight: '300', style: 'normal' },
    { path: './fonts/cormorant-garamond-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/cormorant-garamond-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/cormorant-garamond-600.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-serif',
  display: 'swap',
});
const sans = localFont({
  src: [{ path: './fonts/inter-latin-variable.woff2', weight: '100 900', style: 'normal' }],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: `${BRAND} — ${EXPERIENCE}`, template: `%s — ${BRAND}` },
  description: DESCRIPTION,
  openGraph: {
    type: 'website',
    title: `${BRAND} — ${EXPERIENCE}`,
    description: TAGLINE,
    siteName: BRAND,
  },
  twitter: { card: 'summary_large_image', title: `${BRAND} — ${EXPERIENCE}` },
};

export const viewport: Viewport = {
  themeColor: '#0B0B0D',
  colorScheme: 'dark',
};

// Authoritative profile URLs for the Organization knowledge panel. Comma-separated env override
// keeps off-brand/placeholder handles out of production until the real accounts are wired.
const SAME_AS = (process.env.NEXT_PUBLIC_SOCIAL_LINKS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const org = organization({
    name: BRAND,
    url: SITE,
    slogan: TAGLINE,
    logo: '/icon.svg',
    sameAs: SAME_AS,
  });
  const site = webSite(SITE, BRAND, '/search', 'q');
  return (
    <html lang="en" className={`dark ${serif.variable} ${sans.variable}`}>
      <body className="min-h-screen bg-void font-sans text-neutral-100 antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(org) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(site) }} />
        <a href="#main" className="skip-link">Skip to content</a>
        <CustomerProvider>
          <CartProvider>
            <WishlistProvider>
              <SiteHeader />
              <div id="main">
                <PageTransition>{children}</PageTransition>
              </div>
              <Footer />
              <Shepherd />
              <CommandPalette />
            </WishlistProvider>
          </CartProvider>
        </CustomerProvider>
        <ConsentBanner />
        <Analytics />
        <ServiceWorker />
      </body>
    </html>
  );
}
