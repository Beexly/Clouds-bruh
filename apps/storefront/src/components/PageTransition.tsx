'use client';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

/**
 * A quiet fade between routes — reverent, never flashy.
 * Honors prefers-reduced-motion via globals.css (durations collapse to ~0).
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
