/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      colors: {
        // Neon Palettes
        neon: {
          pink: '#ff007f',    // Bright Neon Pink
          cyan: '#00f0ff',    // Electric Cyber Cyan
          green: '#39ff14',   // Radioactive Neon Green
          purple: '#d000ff',  // Deep Electric Purple
          orange: '#ff5f00',  // Hot Neon Orange
        },
        // Override standard colors to map directly to high-intensity neon equivalents
        red: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#ff4da6', 
          500: '#ff007f', // All red-500 components become Neon Pink
          600: '#d9006c', // All red-600 components become Deep Neon Pink
          700: '#b30059',
          800: '#8c0046',
          900: '#660033',
        },
        pink: {
          500: '#d000ff', // Pink-500 maps to Neon Purple
          600: '#a600cc',
        },
        emerald: {
          400: '#75ff5c',
          500: '#39ff14', // All emerald-500 maps to Radioactive Neon Green
          600: '#2bd60c',
          700: '#1fa307',
        },
        cyan: {
          400: '#5cffff',
          500: '#00f0ff', // All cyan-500 maps to Electric Cyber Cyan
          600: '#00c4d1',
          700: '#0097a1',
        },
        slate: {
          900: '#03050a', // Rich, pure obsidian backdrops
          950: '#010204',
        }
      }
    },
  },
  plugins: [],
}
