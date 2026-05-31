'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { signal } from '../lib/signal';

const BASE = process.env.NEXT_PUBLIC_MEDUSA_URL || 'http://localhost:9000';
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';
const CHAPTERS = ['stillness', 'armor', 'signal', 'altar', 'relentless'] as const;

/** Cmd/Ctrl-K command palette — search products + chapters. Debounced, sacred, keyboard-first. */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Cmd/Ctrl-K + Esc.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else { setQ(''); setResults([]); }
  }, [open]);

  // Debounced search.
  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `${BASE}/store/products?q=${encodeURIComponent(q)}&limit=6&fields=id,title,handle,thumbnail,metadata`,
          { headers: { 'x-publishable-api-key': PK } }
        );
        const d = await res.json();
        setResults(d.products ?? []);
        signal('search', undefined, q, { surface: 'command_palette', results: (d.products ?? []).length });
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const chapterMatches = q.trim()
    ? CHAPTERS.filter((c) => c.includes(q.toLowerCase()))
    : CHAPTERS;

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      {/* trigger in the corner; the palette is also global via Cmd/K */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Search (Command K)"
        className="fixed bottom-6 left-6 z-40 hidden items-center gap-2 rounded-full border border-white/10 bg-obsidian/80 px-4 py-2 text-micro uppercase text-neutral-500 backdrop-blur transition hover:border-white/25 hover:text-neutral-300 md:flex"
      >
        Search <kbd className="rounded border border-white/15 px-1 text-[9px]">⌘K</kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-start justify-center bg-black/70 px-4 pt-[12vh] backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl overflow-hidden rounded-sm border border-white/10 bg-obsidian/95 backdrop-blur-xl"
            >
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search the Broadcast — objects, chapters…"
                aria-label="Search the Broadcast"
                className="w-full bg-transparent px-5 py-4 font-serif text-lg text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
              />
              <div className="max-h-[50vh] overflow-y-auto border-t border-white/10">
                {/* chapters */}
                <div className="px-3 py-3">
                  <p className="px-2 pb-2 text-micro uppercase text-neutral-600">Chapters</p>
                  <div className="flex flex-wrap gap-2 px-2">
                    {chapterMatches.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          signal('chapter_enter', c, undefined, { chapter: c, surface: 'command_palette' });
                          go(`/chapter/${c}`);
                        }}
                        className="rounded-full border border-white/10 px-3 py-1 text-micro uppercase text-neutral-400 transition hover:border-altar-gold/40 hover:text-altar-goldlight"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                {/* products */}
                {(loading || results.length > 0) && (
                  <div className="border-t border-white/5 px-3 py-3">
                    <p className="px-2 pb-2 text-micro uppercase text-neutral-600">
                      {loading ? 'Seeking…' : 'Objects'}
                    </p>
                    {results.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          signal('recommendation_click', p.id, undefined, { surface: 'command_palette' });
                          go(`/p/${p.handle}`);
                        }}
                        className="flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left transition hover:bg-white/[0.04]"
                      >
                        {p.thumbnail && (
                          <img src={p.thumbnail} alt="" className="h-10 w-8 rounded-sm object-cover" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-neutral-200">{p.title}</span>
                          {p.metadata?.chapter && (
                            <span className="text-micro uppercase text-neutral-600">{p.metadata.chapter}</span>
                          )}
                        </span>
                      </button>
                    ))}
                    {!loading && q.trim() && results.length === 0 && (
                      <p className="px-2 py-3 text-sm text-neutral-600">Nothing found. Be still.</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
