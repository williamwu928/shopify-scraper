/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        shopify: {
          50: '#f0f7ff',
          100: '#e0efff',
          200: '#bcdfff',
          300: '#85c7ff',
          400: '#45a3ff',
          500: '#1681fe',
          600: '#0560fe',
          700: '#0b4cd9',
          800: '#1341af',
          900: '#17388a',
          950: '#0b1e4d',
        },
      },
    },
  },
  plugins: [],
}
