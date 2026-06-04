/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          700: '#15803d',
          800: '#166534',
          900: '#1a472a',
          950: '#0f2d1a',
        },
        gold: {
          300: '#fde68a',
          400: '#fbbf24',
          500: '#ffd700',
          600: '#d97706',
        },
      },
    },
  },
  plugins: [],
}
