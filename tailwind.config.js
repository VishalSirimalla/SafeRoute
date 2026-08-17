/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        deep: '#040d08',
        panel: '#0f1c17',
        primary: '#4edea3',
        accent: '#10b981',
        coral: '#f39aa2',
        danger: '#f26a7e',
        muted: '#b3c4bb',
        glass: 'rgba(15,28,23,0.8)',
      },
      boxShadow: {
        glow: '0 0 30px rgba(78, 222, 163, 0.25)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Segoe UI"', 'sans-serif'],
      },
      backgroundImage: {
        grid: 'linear-gradient(rgba(148,163,184,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.07) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};
