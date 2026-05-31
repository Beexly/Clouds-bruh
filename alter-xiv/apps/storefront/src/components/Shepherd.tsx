'use client';
import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { signal } from '../lib/signal';

const BASE = process.env.NEXT_PUBLIC_MEDUSA_URL || 'http://localhost:9000';
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';

type Msg = { role: 'user' | 'assistant'; content: string };

/** The Shepherd — conversational store. Advisory only; never checks out for you. */
export function Shepherd() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: 'Be still. I am the Shepherd — ask me about a chapter, a drop, or what to wear into the week.' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setBusy(true);
    signal('search', undefined, text, { surface: 'shepherd' });
    try {
      const res = await fetch(`${BASE}/store/shepherd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-publishable-api-key': PK },
        body: JSON.stringify({ messages: next.slice(-10) }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: 'assistant', content: data.reply ?? 'Be still — I will return shortly.' }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'The signal is faint. Try once more.' }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* summon */}
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open) signal('page_view', undefined, undefined, { surface: 'shepherd_open' });
        }}
        aria-label="Speak with the Shepherd"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-altar-gold/40 bg-obsidian/90 text-foil shadow-lg backdrop-blur transition-transform duration-300 hover:scale-105"
      >
        <span className="font-serif text-2xl leading-none">✦</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-24 right-6 z-50 flex h-[28rem] w-[22rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-sm border border-white/10 bg-obsidian/95 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="text-label uppercase text-altar-goldlight">The Shepherd</span>
              <button onClick={() => setOpen(false)} className="text-neutral-500 hover:text-neutral-200">✕</button>
            </div>
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                  <span
                    className={`inline-block max-w-[85%] rounded-sm px-3 py-2 text-sm ${
                      m.role === 'user'
                        ? 'bg-altar-gold/15 text-neutral-100'
                        : 'bg-white/[0.04] font-serif italic text-neutral-300'
                    }`}
                  >
                    {m.content}
                  </span>
                </div>
              ))}
              {busy && <p className="text-micro uppercase text-neutral-600">the shepherd is listening…</p>}
            </div>
            <div className="flex items-center gap-2 border-t border-white/10 p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Ask the Shepherd…"
                className="flex-1 bg-transparent text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
              />
              <button
                onClick={send}
                disabled={busy}
                className="text-micro uppercase text-altar-goldlight disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
