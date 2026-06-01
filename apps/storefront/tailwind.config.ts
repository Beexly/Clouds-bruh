import type { Config } from 'tailwindcss';

/**
 * Lumera design system — desaturated, status-optimal "dark luminous editorial luxury."
 * Tokens, not one-off classes: a single scale for color, type, space, motion. See docs/BRAND_GUIDELINES.md.
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
        // Lumera palette — v2, desaturated / status-optimal. See docs/BRAND_GUIDELINES.md §4.
        eclipse: '#0B0B0D', // base
        corona: '#E9D8A6', // primary accent (premium/editorial)
        firstlight: '#F4EEDD', // light / text on eclipse
        signal: '#6E5BD6', // system accent (functional UI) — kept desaturated
        umbra: '#54545A', // neutral
        // Back-compat aliases → remapped to the Lumera palette so existing components inherit it.
        obsidian: '#0B0B0D',
        void: '#0B0B0D',
        altar: {
          gold: '#E9D8A6', // → Corona
          goldlight: '#F4EEDD', // → First Light
          cream: '#F4EEDD', // → First Light
          obsidian: '#0B0B0D', // → Eclipse
        },
        chapter: {
          stillness: '#8DA9B8',
          armor: '#C9A96E',
          signal: '#B5546E',
          altar: '#9C8CC4',
          relentless: '#C2502E',
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
          'radial-gradient(circle at 50% 0%, rgba(233,216,166,0.06), transparent 60%)',
        'altar-veil':
          'linear-gradient(180deg, rgba(11,11,13,0) 0%, rgba(11,11,13,0.65) 100%)',
        'gold-foil':
          'linear-gradient(135deg, #E9D8A6 0%, #F4EEDD 35%, #c9b886 55%, #F4EEDD 75%, #E9D8A6 100%)',
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
