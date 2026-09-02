/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // "PCB substrate" base — deep blue-black, not pure black.
        base: {
          DEFAULT: '#0A0E17',
          soft: '#0D1220',
        },
        surface: {
          DEFAULT: '#121826',
          raised: '#1A2233',
          border: '#2A3348',
        },
        ink: {
          DEFAULT: '#E9ECF5',
          muted: '#8D96AC',
          faint: '#5C6478',
        },
        // Copper trace — the signature accent, warm amber (not terracotta).
        copper: {
          DEFAULT: '#E8A33D',
          bright: '#FFC069',
          dim: '#8A5F22',
        },
        // Signal blue — secondary accent, used for links/interactive states.
        signal: {
          DEFAULT: '#5B7FFF',
          bright: '#8AA0FF',
        },
        // Status teal — "live / open / active" indicator color.
        active: {
          DEFAULT: '#2DD4BF',
        },
        danger: '#F2545B',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'grid-fade':
          'linear-gradient(180deg, rgba(10,14,23,0) 0%, #0A0E17 100%)',
      },
      boxShadow: {
        trace: '0 0 0 1px rgba(232,163,61,0.25), 0 0 24px rgba(232,163,61,0.08)',
      },
      keyframes: {
        dash: {
          to: { strokeDashoffset: '0' },
        },
        pulseDot: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.35 },
        },
      },
      animation: {
        dash: 'dash 1.8s ease-out forwards',
        pulseDot: 'pulseDot 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
