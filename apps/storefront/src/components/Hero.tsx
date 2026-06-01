'use client';
import { motion } from 'framer-motion';
import { BRAND, TAGLINE } from '../lib/brand';

/** The opening — quiet, premium, gold on void. The Broadcast, live. */
export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-10 pt-24 text-center">
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="mb-4 text-micro uppercase text-neutral-600"
      >
        The Broadcast — Live
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className="font-sans text-6xl font-medium lowercase tracking-[0.1em] text-foil md:text-8xl"
      >
        {BRAND}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.4 }}
        className="mx-auto mt-6 max-w-md font-serif text-lg italic text-neutral-400"
      >
        {TAGLINE}
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.6 }}
        className="mt-2 text-micro uppercase text-neutral-700"
      >
        Every category. Every drop. In real time.
      </motion.p>
    </section>
  );
}
