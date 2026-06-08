import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
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

// Editorial serif for display accents; a quiet grotesque for the body.
const serif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-serif',
  display: 'swap',
});
const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://lumeralabel.com';

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
