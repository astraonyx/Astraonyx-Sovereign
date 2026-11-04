/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#070709',
          900: '#0b0c10',
          800: '#13141c',
          700: '#1c1e2a',
        },
        polaris: {
          primary: '#6366f1',
          cyan: '#06b6d4',
          gold: '#eab308',
          purple: '#a855f7',
        }
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'orbit': 'spin 20s linear infinite',
      }
    },
  },
  plugins: [],
}
