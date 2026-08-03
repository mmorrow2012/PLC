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
          accent: '#06b6d4',
          warning: '#f59e0b',
          ok: '#22c55e',
        },
      },
    },
  },
  plugins: [],
};
