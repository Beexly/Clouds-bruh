import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '../context/cart';
import { SiteHeader } from '../components/SiteHeader';

export const metadata: Metadata = {
  title: 'ALTER XIV — The Broadcast',
  description: 'Faith-rooted drop culture. Sacred objects, sacred armor. The Lord will fight for you.',
  openGraph: { type: 'website', title: 'ALTER XIV', description: 'The Broadcast — intelligent drop culture' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark bg-black">
      <body className="min-h-screen bg-black text-neutral-100 font-sans antialiased">
        <CartProvider>
          <SiteHeader />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
