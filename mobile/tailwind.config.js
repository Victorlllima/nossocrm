/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      },
      // Tokens da marca Max Lima — idênticos ao desktop
      colors: {
        primary: {
          50:  '#FDF8F0',
          100: '#F9ECDA',
          200: '#F3D9B5',
          300: '#ECC197',
          400: '#E5A970',
          500: '#D4934A',
          600: '#B87A35',
          700: '#9A6328',
          800: '#7D4D1E',
          900: '#5F3815',
        },
        dark: {
          bg:     '#191815',
          card:   '#322C25',
          border: '#4A4238',
          hover:  '#5A5248',
        },
      },
      // Safe-area + bottom nav helpers
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        'safe-top':    'env(safe-area-inset-top, 0px)',
        'nav-h':       '56px',
      },
      height: {
        'screen-safe': 'calc(100dvh - env(safe-area-inset-bottom, 0px))',
      },
    },
  },
  plugins: [],
};

export default config;
