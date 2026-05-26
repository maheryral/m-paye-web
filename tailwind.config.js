/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // === Surfaces (dark mode par défaut, Revolut-like) ===
        bg: {
          DEFAULT: '#0A0E1A',       // page background
          surface: '#12172A',       // card
          elevated: '#1A2138',      // card hover / inputs
          border: '#262F4A',        // dividers
          subtle: 'rgba(255,255,255,0.04)', // hover faint
        },
        // === Brand violet/indigo (gradient palette) ===
        brand: {
          50:  '#F0EFFE',
          100: '#E1E1FE',
          200: '#C7C5FC',
          300: '#A29EF8',
          400: '#7C75F2',
          500: '#5B52E8',
          600: '#4A40D4',
          700: '#3E34B0',
          800: '#332B8C',
          900: '#221C5C',
        },
        // === Accent secondaire (cyan) ===
        cyan: {
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
        },
        // === Status ===
        success: {
          500: '#10B981',
          400: '#34D399',
          bg:   'rgba(16, 185, 129, 0.12)',
        },
        warning: {
          500: '#F59E0B',
          400: '#FBBF24',
          bg:   'rgba(245, 158, 11, 0.12)',
        },
        danger: {
          500: '#F43F5E',
          400: '#FB7185',
          bg:   'rgba(244, 63, 94, 0.12)',
        },
        // === Text on dark surfaces ===
        ink: {
          DEFAULT: '#FFFFFF',
          muted:   '#9BA1B0',
          dim:     '#5F6679',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        glow:        '0 10px 40px -10px rgba(91, 82, 232, 0.45)',
        'glow-soft': '0 6px 24px -6px rgba(91, 82, 232, 0.30)',
        card:        '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 20px -8px rgba(0,0,0,0.4)',
        elevated:    '0 12px 40px -10px rgba(0,0,0,0.6)',
      },
      backgroundImage: {
        'gradient-brand':   'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #A855F7 100%)',
        'gradient-brand-soft': 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(168,85,247,0.18) 100%)',
        'gradient-balance': 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #DB2777 100%)',
        'gradient-cyan':    'linear-gradient(135deg, #0891B2 0%, #06B6D4 100%)',
        'gradient-mesh': `
          radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.20) 0px, transparent 50%),
          radial-gradient(at 100% 0%, rgba(217, 70, 239, 0.18) 0px, transparent 50%),
          radial-gradient(at 100% 100%, rgba(14, 165, 233, 0.15) 0px, transparent 50%)
        `,
      },
      animation: {
        'fade-in':   'fadeIn 0.18s ease-out',
        'slide-in':  'slideInUp 0.22s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideInUp: {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
