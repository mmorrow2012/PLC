/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        industrial: {
          950: '#020617',
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
          accent: '#0ea5e9',
          basin: '#06b6d4',
          sludge: '#a16207',
          ok: '#22c55e',
          alarm: '#ef4444'
        }
      }
    }
  },
  plugins: []
};
