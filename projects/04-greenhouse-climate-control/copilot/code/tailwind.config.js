/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        industrial: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
          accent: '#0284c7',
          alarm: '#dc2626',
          warning: '#d97706',
          ok: '#16a34a',
        },
      },
    },
  },
  plugins: [],
};
