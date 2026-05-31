import type { Config } from 'tailwindcss';

/**
 * ALTER XIV design system — "dark sacred editorial luxury."
 * Tokens, not one-off classes: a single scale for color, type, space, motion.
 */
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // Wired to next/font CSS variables in layout.tsx.
        serif: ['var(--font-serif)', 'Georgia', 'Times New Roman', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // The sacred palette.
        obsidian: '#070707',
        void: '#000000',
        altar: {
          gold: '#C9A96E',
          goldlight: '#E4CFA1',
          cream: '#F0EAD6',
          obsidian: '#0A0A0A',
        },
        chapter: {
          stillness: '#8DA9B8', // cold dawn blue
          armor: '#C9A96E',     // forged gold
          signal: '#B5546E',    // ember rose
          altar: '#9C8CC4',     // vespers violet
          relentless: '#C2502E', // war iron
        },
      },
      letterSpacing: {
        sacred: '0.42em',
        wide: '0.28em',
      },
      fontSize: {
        micro: ['9px', { lineHeight: '1.2', letterSpacing: '0.32em' }],
        label: ['11px', { lineHeight: '1.4', letterSpacing: '0.28em' }],
      },
      backgroundImage: {
        // Subtle sacred textures (CSS-only; no asset deps).
        'sacred-grain':
          'radial-gradient(circle at 50% 0%, rgba(201,169,110,0.06), transparent 60%)',
        'altar-veil':
          'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.65) 100%)',
        'gold-foil':
          'linear-gradient(135deg, #C9A96E 0%, #E4CFA1 35%, #9c844f 55%, #E4CFA1 75%, #C9A96E 100%)',
      },
      transitionTimingFunction: {
        sacred: 'cubic-bezier(0.22, 1, 0.36, 1)', // slow, reverent ease-out
      },
      transitionDuration: {
        reverent: '700ms',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-scarce': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.22,1,0.36,1) both',
        shimmer: 'shimmer 1.8s linear infinite',
        'pulse-scarce': 'pulse-scarce 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
