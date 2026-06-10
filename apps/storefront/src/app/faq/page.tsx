import type { Metadata } from 'next';
import Link from 'next/link';
import { faqPage, jsonLdScript, type FaqItem } from '../../lib/jsonld';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Shipping, returns, payments, order tracking, drops, and rewards — answered.',
};

// One source for the rendered list AND the FAQPage schema, so they can never diverge.
// Every answer is grounded in the live policies (returns 30d, ship window, Product Truth, Lumens).
const FAQ: FaqItem[] = [
  {
    q: 'How long does shipping take?',
    a: 'Each product page and checkout show the expected delivery window for that item, since some pieces ship from vetted third-party suppliers. Most orders arrive within about 12 business days, and you’ll get an email with tracking the moment your order leaves the supplier.',
  },
  {
    q: 'How do I track my order?',
    a: 'Use the Track Order page with your order number and the email you used at checkout — no account required.',
  },
  {
    q: 'What is your return policy?',
    a: 'Unused items in original condition can be returned within 30 days of delivery, unless the product page marks an item as final sale, custom, personalized, or hygiene-sensitive. Damaged or incorrect items are made right at our cost.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'Major cards through our secure checkout, plus PayPal where available. Lumera never stores your full card number — payments are handled by the processor.',
  },
  {
    q: 'What are Lumens and Luminance?',
    a: 'Lumens are in-store credit you can earn and spend (1 Lumen = 1¢). Luminance is our loyalty program — earn on purchases and unlock member tiers and early access.',
  },
  {
    q: 'What is “Product Truth”?',
    a: 'On every product page we publish the supplier, region, expected ship time, and return window up front — so you know exactly what you’re buying before you buy it.',
  },
  {
    q: 'How do drops work?',
    a: 'Drops are limited releases — once a piece sells through, it may be gone. Watch the countdown and units-remaining on each drop, and join the Broadcast for first access.',
  },
  {
    q: 'Where do you ship?',
    a: 'Available destinations are shown at checkout once you enter your address.',
  },
  {
    q: 'How do I reach support?',
    a: 'Email hello@lumeralabel.com — Polaris, our concierge, and the team will help with sizing, orders, and returns.',
  },
];

export default function FaqPage() {
  return (
    <main className="min-h-screen bg-void bg-sacred-grain">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqPage(FAQ)) }} />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-micro uppercase text-neutral-600">Help</p>
        <h1 className="mt-2 font-serif text-4xl font-light text-neutral-100">Frequently asked</h1>

        <div className="mt-10 space-y-8">
          {FAQ.map((f) => (
            <div key={f.q} className="border-b border-white/[0.06] pb-6">
              <h2 className="font-serif text-lg text-foil">{f.q}</h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">{f.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-4 text-micro uppercase tracking-[0.18em]">
          <Link href="/track" className="text-altar-goldlight transition-colors hover:text-foil">Track order &rarr;</Link>
          <Link href="/returns" className="text-altar-goldlight transition-colors hover:text-foil">Start a return &rarr;</Link>
          <Link href="/legal/returns" className="text-neutral-500 transition-colors hover:text-foil">Full policy &rarr;</Link>
        </div>
      </div>
    </main>
  );
}
