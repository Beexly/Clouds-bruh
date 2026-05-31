import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import './globals.css';
import { CartProvider } from '../context/cart';
import { SiteHeader } from '../components/SiteHeader';
import { PageTransition } from '../components/PageTransition';
import { Shepherd } from '../components/Shepherd';

// Editorial serif for the sacred voice; a quiet grotesque for the body.
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

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://alterxiv.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'ALTER XIV — The Broadcast', template: '%s — ALTER XIV' },
  description:
    'Faith-rooted drop culture. Sacred objects, sacred armor. The Lord will fight for you; you need only be still. — Exodus 14:14',
  openGraph: {
    type: 'website',
    title: 'ALTER XIV — The Broadcast',
    description: 'Sacred objects, sacred armor. A living broadcast of drops.',
    siteName: 'ALTER XIV',
  },
  twitter: { card: 'summary_large_image', title: 'ALTER XIV — The Broadcast' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ALTER XIV',
    url: SITE,
    slogan: 'The Lord will fight for you; you need only be still.',
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
          <Shepherd />
        </CartProvider>
      </body>
    </html>
  );
}
