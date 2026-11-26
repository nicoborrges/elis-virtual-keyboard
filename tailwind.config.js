/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./estudio.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Paleta "Acme" — extraída do pitch deck (docs/Acme_Pitch_Deck.pptx)
      colors: {
        void: '#0A0908',
        // Cinzas quentes de pedra (substituem slate)
        ink: {
          50: '#F7F5F1',
          100: '#EEEAE3',
          200: '#DDD8CF',
          300: '#C9C3B9',
          400: '#A9A399',
          500: '#8F8A81',
          600: '#5A554D',
          700: '#3A3631',
          800: '#2A2723',
          900: '#1A1816',
          950: '#0E0D0B',
        },
        // Ouro envelhecido — magia/escrita, foco e ação primária
        gold: {
          50: '#FBF6EA',
          100: '#F5E9CC',
          200: '#ECD7A3',
          300: '#E3C482',
          400: '#D8AE5E',
          500: '#C4973F',
          600: '#A67B2E',
          700: '#7E5D24',
          800: '#56401C',
          900: '#3A2B14',
          950: '#1F170B',
        },
        // Verde-sálvia — vida restaurada, estado "tocando"/conjurado
        vida: {
          50: '#EEF7F3',
          100: '#D6EDE3',
          200: '#B4DCCB',
          300: '#8FC4AE',
          400: '#72B399',
          500: '#579A7F',
          600: '#427C66',
          700: '#346251',
          800: '#294D41',
          900: '#1F3B32',
          950: '#0F211B',
        },
        // Vinho do manto — perigo/apagar, mão de apoio
        wine: {
          300: '#D79A94',
          400: '#B8615C',
          500: '#8E3B3A',
          600: '#6E2A2C',
          700: '#55201F',
          800: '#3F1819',
          900: '#2A1011',
          950: '#1A0A0B',
        },
      },
      fontFamily: {
        elis: ['ELiS', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Cinzel', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        slotRise: {
          '0%': { opacity: '0', transform: 'translateY(18px) scale(0.85)' },
          '70%': { opacity: '1', transform: 'translateY(-3px) scale(1.06)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        wordPop: {
          '0%': { transform: 'scale(0.95)', opacity: '0.6' },
          '50%': { transform: 'scale(1.04)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
      },
      animation: {
        'slot-rise': 'slotRise 0.32s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'word-pop': 'wordPop 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'pulse-subtle': 'pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
