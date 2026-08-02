/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        industrial: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          panel: '#182232',
          border: '#2a3b53',
          accent: '#06b6d4',
          warning: '#f59e0b',
          alarm: '#ef4444',
          success: '#10b981',
        }
      }
    },
  },
  plugins: [],
}