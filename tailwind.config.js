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
        background: {
          DEFAULT: '#121214',
          surface: '#18181C',
          card: '#222228',
          cardHover: '#2A2A32',
          subtle: '#2E2E38'
        },
        accent: {
          DEFAULT: '#10B981', // Warm Emerald
          hover: '#059669',
          light: '#34D399',
          subtle: 'rgba(16, 185, 129, 0.12)',
          glow: 'rgba(16, 185, 129, 0.25)',
        },
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          subtle: 'rgba(255, 255, 255, 0.04)',
          hover: 'rgba(255, 255, 255, 0.15)',
        },
        text: {
          primary: '#F3F4F6',
          secondary: '#9CA3AF',
          muted: '#6B7280',
          emerald: '#10B981',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
        'player': '0 -4px 24px 0 rgba(0, 0, 0, 0.6)',
        'card': '0 2px 12px 0 rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
