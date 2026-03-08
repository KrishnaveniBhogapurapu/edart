import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#f7f8f4',
        foreground: '#1a1d1a',
        card: '#ffffff',
        border: '#d8dfd5',
        muted: '#5d655e',
        accent: '#146c54',
      },
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui'],
      },
      boxShadow: {
        soft: '0 8px 24px rgba(24, 38, 27, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
