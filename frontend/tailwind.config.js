/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        emerald: {
          DEFAULT: '#0B7A53',
          deep: '#073D2D',
          50: '#EAF8F1',
          100: '#CFEEDD',
          600: '#0B7A53',
          700: '#086342',
        },
        ink: {
          DEFAULT: '#14241C',
          soft: '#637069',
          faint: '#98A29C',
        },
        surface: {
          DEFAULT: '#F4F7F5',
          card: '#FFFFFF',
          line: '#E7ECE9',
        },
        amber: { DEFAULT: '#B7791F', bg: '#FBF3E2' },
        danger: { DEFAULT: '#C1443B', bg: '#FBEAE8' },
        slate: { DEFAULT: '#3E5C76', bg: '#EAF0F6' },
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif',
        ],
      },
      borderRadius: {
        card: '16px',
        btn: '10px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,36,28,0.04), 0 1px 8px rgba(20,36,28,0.04)',
        pop: '0 8px 24px rgba(7,61,45,0.12)',
      },
    },
  },
  plugins: [],
};
