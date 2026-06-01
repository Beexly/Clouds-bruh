'use client';
import { motion, useReducedMotion } from 'framer-motion';
import { BRAND, TAGLINE, EXPERIENCE } from '../lib/brand';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * THE CORONA REVEAL — Lumera's signature opening (BRAND_GUIDELINES §6, and the 2026 "motion as brand
 * identity" pattern in docs/RESEARCH_2026.md). An arc of light widens into the corona ring, the
 * first-light point ignites at its edge, and the wordmark rises from the dark — then the ring stays
 * quietly alive. Full-viewport, cinematic, on Eclipse. Collapses to a calm static state under
 * `prefers-reduced-motion`.
 */
export function Hero() {
  const reduce = useReducedMotion();
  const RING = 'h-44 w-44 md:h-60 md:w-60';

  return (
    <section className="relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* luminous aura — Corona warmth bleeding into a Signal-violet penumbra */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[130vmin] w-[130vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(closest-side, rgba(233,216,166,0.12), rgba(110,91,214,0.05) 45%, transparent 70%)',
        }}
        initial={reduce ? false : { opacity: 0, scale: 0.85 }}
        animate={{ opacity: reduce ? 0.9 : [0, 1, 0.9], scale: reduce ? 1 : [0.85, 1.05, 1] }}
        transition={reduce ? undefined : { duration: 3.4, ease: EASE, times: [0, 0.6, 1] }}
      />

      {/* live indicator */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
        className="z-10 mb-10 flex items-center gap-2.5 text-micro uppercase tracking-[0.4em] text-neutral-500"
      >
        <span className="relative flex h-1.5 w-1.5">
          {!reduce && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E9D8A6] opacity-70" />
          )}
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#E9D8A6]" />
        </span>
        {EXPERIENCE} — Live
      </motion.div>

      {/* the corona reveal */}
      <div className="relative z-10 mb-3 flex items-center justify-center">
        <svg viewBox="0 0 220 220" className={RING} fill="none" aria-hidden>
          {/* the ever-present faint trace */}
          <circle cx="110" cy="110" r="92" stroke="#54545A" strokeOpacity="0.22" strokeWidth="1" />
          {/* the arc widening into the corona ring */}
          <motion.circle
            cx="110"
            cy="110"
            r="92"
            stroke="#E9D8A6"
            strokeWidth="2.5"
            strokeLinecap="round"
            transform="rotate(-90 110 110)"
            initial={reduce ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0.5 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={reduce ? undefined : { duration: 1.9, ease: EASE }}
          />
          {/* first-light point igniting at 12 o'clock */}
          <motion.circle
            cx="110"
            cy="18"
            r="4.5"
            fill="#F4EEDD"
            style={{ filter: 'drop-shadow(0 0 7px rgba(244,238,221,0.9))' }}
            initial={reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={reduce ? undefined : { duration: 0.5, delay: 1.8, ease: EASE }}
          />
        </svg>

        {/* a slow violet orbit — keeps the mark alive after the reveal */}
        {!reduce && (
          <motion.div
            aria-hidden
            className={`absolute ${RING}`}
            initial={{ rotate: 0, opacity: 0 }}
            animate={{ rotate: 360, opacity: 1 }}
            transition={{
              rotate: { duration: 52, ease: 'linear', repeat: Infinity },
              opacity: { duration: 1.2, delay: 2.1 },
            }}
          >
            <svg viewBox="0 0 220 220" className={RING} fill="none" aria-hidden>
              <circle
                cx="110"
                cy="110"
                r="92"
                stroke="#6E5BD6"
                strokeOpacity="0.2"
                strokeWidth="1"
                strokeDasharray="1.5 11"
                strokeLinecap="round"
              />
            </svg>
          </motion.div>
        )}
      </div>

      {/* wordmark — rises from the dark */}
      <div className="z-10 overflow-hidden pb-2">
        <motion.h1
          initial={reduce ? false : { y: '115%' }}
          animate={{ y: '0%' }}
          transition={{ duration: 1, delay: reduce ? 0 : 0.95, ease: EASE }}
          className="font-sans text-7xl font-medium lowercase leading-none tracking-[0.12em] text-[#F4EEDD] md:text-[9rem]"
        >
          {BRAND}
        </motion.h1>
      </div>

      <motion.p
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: reduce ? 0 : 1.5 }}
        className="z-10 mx-auto mt-7 max-w-md font-serif text-lg italic text-neutral-300 md:text-xl"
      >
        {TAGLINE}
      </motion.p>
      <motion.p
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: reduce ? 0 : 1.8 }}
        className="z-10 mt-3 text-micro uppercase tracking-[0.3em] text-neutral-600"
      >
        Every category. Every drop. In real time.
      </motion.p>

      {/* scroll cue */}
      <motion.div
        aria-hidden
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: reduce ? 0 : 2.4 }}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
      >
        <motion.div
          className="h-9 w-px bg-gradient-to-b from-[#E9D8A6]/60 to-transparent"
          style={{ transformOrigin: 'top' }}
          animate={reduce ? undefined : { scaleY: [0.4, 1, 0.4], opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
        />
      </motion.div>
    </section>
  );
}
