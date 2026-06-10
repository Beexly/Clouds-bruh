import type { Metadata } from 'next';
import { TrackForm } from '../../components/TrackForm';

export const metadata: Metadata = { title: 'Track Your Order', robots: { index: false, follow: true } };

export default function TrackPage() {
  return (
    <main className="min-h-screen bg-void bg-sacred-grain">
      <div className="mx-auto max-w-xl px-6 py-16">
        <p className="text-micro uppercase text-neutral-600">Order Status</p>
        <h1 className="mt-2 font-serif text-3xl font-light text-neutral-100">Track your order</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-500">
          Enter your order number and the email you used at checkout. No account needed.
        </p>
        <div className="mt-8">
          <TrackForm />
        </div>
      </div>
    </main>
  );
}
