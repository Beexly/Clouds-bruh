import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import './globals.css';
import { CartProvider } from '../context/cart';
import { SiteHeader } from '../components/SiteHeader';
import { PageTransition } from '../components/PageTransition';
import { Shepherd } from '../components/Shepherd';
import { CommandPalette } from '../components/CommandPalette';
import { Footer } from '../components/Footer';
import { Analytics } from '../components/Analytics';
import { ConsentBanner } from '../components/ConsentBanner';
import { BRAND, EXPERIENCE, TAGLINE, DESCRIPTION } from '../lib/brand';

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

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://lumera.example';

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND,
    url: SITE,
    slogan: TAGLINE,
  };
  return (
    <html lang="en" className={`dark ${serif.variable} ${sans.variable}`}>
      <body className="min-h-screen bg-void font-sans text-neutral-100 antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }} />
        <a href="#main" className="skip-link">Skip to content</a>
        <CartProvider>
          <SiteHeader />
          <div id="main">
            <PageTransition>{children}</PageTransition>
          </div>
          <Footer />
          <Shepherd />
          <CommandPalette />
        </CartProvider>
        <ConsentBanner />
        <Analytics />
      </body>
    </html>
  );
}
