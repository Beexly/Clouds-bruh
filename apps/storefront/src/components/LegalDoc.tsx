import type { ReactNode } from 'react';
import { BRAND } from '../lib/brand';

/** Shared shell for legal/policy pages: brand header, "last updated", and a template notice. */
export function LegalDoc({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-6 py-20">
      <p className="text-micro uppercase text-neutral-600">{BRAND} · Legal</p>
      <h1 className="mt-2 font-serif text-4xl font-light tracking-[0.04em] text-foil">{title}</h1>
      <p className="mt-2 text-micro uppercase text-neutral-700">Last updated {updated}</p>
      <div className="mt-6 rounded-sm border border-altar-gold/30 bg-altar-gold/[0.05] p-4 text-xs leading-relaxed text-neutral-300">
        ⚠️ <strong className="text-altar-goldlight">Template.</strong> Placeholder language for scaffolding only.
        Complete the bracketed fields and review with qualified counsel for your jurisdiction before launch.
      </div>
      <div className="mt-8 space-y-6 text-sm leading-relaxed text-neutral-300">{children}</div>
    </article>
  );
}

/** A titled section inside a LegalDoc. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-serif text-lg text-foil">{title}</h2>
      {children}
    </section>
  );
}
