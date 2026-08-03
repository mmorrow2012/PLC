/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        industrial: {
          50: '#f4f6f8',
          100: '#e5e9ee',
          500: '#4b647d',
          800: '#1b2430',
          900: '#0f1722',
        },
      },
    },
  },
  plugins: [],
};
