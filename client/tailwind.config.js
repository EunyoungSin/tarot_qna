/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1a1425',
        gold: '#c9a24b',
      },
      fontFamily: {
        display: ['"Noto Serif KR"', 'serif'],
      },
    },
  },
  plugins: [],
}
