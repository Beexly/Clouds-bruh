import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ALTER XIV — The Broadcast',
  description: 'Drop-culture luxury. The Lord will fight for you; you need only to be still. — Exodus 14:14',
  openGraph: {
    title: 'ALTER XIV',
    description: 'The Broadcast. Five chapters. Live drops.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black text-neutral-100 antialiased">{children}</body>
    </html>
  );
}
