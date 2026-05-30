import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        serif: ['Georgia', 'Times New Roman', 'serif'],
      },
      colors: {
        altar: {
          gold: '#C9A96E',
          cream: '#F0EAD6',
          obsidian: '#0A0A0A',
        },
      },
    },
  },
  plugins: [],
};

export default config;
