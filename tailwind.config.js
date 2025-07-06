// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}", // Cerca in tutte le sottocartelle
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}