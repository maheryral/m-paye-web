/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // Ces classes composants sont construites dynamiquement (`btn-${size}`,
  // `btn-${variant}`) dans Button.tsx → Tailwind ne les détecte pas dans le
  // scan du contenu et les purgerait. On les force ici (padding + variantes).
  safelist: [
    'btn-sm', 'btn-md', 'btn-lg',
    'btn-primary', 'btn-secondary', 'btn-ghost', 'btn-danger', 'btn-success',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // === Surfaces — pilotées par variables CSS (clair par défaut = palette
        // mobile ; sombre via la classe .dark). Voir index.css. ===
        bg: {
          DEFAULT: 'rgb(var(--bg) / <alpha-value>)',          // page background
          surface: 'rgb(var(--bg-surface) / <alpha-value>)',  // card
          elevated: 'rgb(var(--bg-elevated) / <alpha-value>)',// card hover / inputs
          border: 'rgb(var(--bg-border) / <alpha-value>)',    // dividers
          subtle: 'rgb(var(--ink) / 0.05)',                   // hover faint
        },
        // === Brand — CSS variable, pilotée depuis super-admin → AppTheme ===
        // Variables stockées en canaux RGB (`r g b`, sans rgb()), ce qui permet
        // à Tailwind d'utiliser la syntaxe `/<alpha-value>` (ex: `bg-brand-500/20`).
        // Les shades 50-400 et 700-900 restent fixes (Tailwind 3 ne fait pas
        // d'auto-shading sur var()).
        brand: {
          50:  '#F0EFFE',
          100: '#E1E1FE',
          200: '#C7C5FC',
          300: '#A29EF8',
          400: '#7C75F2',
          500: 'rgb(var(--color-primary) / <alpha-value>)',
          600: 'rgb(var(--color-primary-dark) / <alpha-value>)',
          700: '#3E34B0',
          800: '#332B8C',
          900: '#221C5C',
        },
        // === Accent secondaire — pilotable aussi ===
        cyan: {
          400: '#22D3EE',
          500: 'rgb(var(--color-secondary) / <alpha-value>)',
          600: '#0891B2',
        },
        // === Status — pilotable ===
        success: {
          500: 'rgb(var(--color-success) / <alpha-value>)',
          400: '#34D399',
          bg:   'rgba(16, 185, 129, 0.12)',
        },
        warning: {
          500: 'rgb(var(--color-warning) / <alpha-value>)',
          400: '#FBBF24',
          bg:   'rgba(245, 158, 11, 0.12)',
        },
        danger: {
          500: 'rgb(var(--color-danger) / <alpha-value>)',
          400: '#FB7185',
          bg:   'rgba(244, 63, 94, 0.12)',
        },
        // === Texte — piloté par variables CSS (foncé en clair, blanc en sombre) ===
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          muted:   'rgb(var(--ink-muted) / <alpha-value>)',
          dim:     'rgb(var(--ink-dim) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        glow:        '0 10px 40px -10px rgba(37, 99, 235, 0.40)',
        'glow-soft': '0 6px 24px -6px rgba(37, 99, 235, 0.28)',
        card:        '0 1px 3px rgba(15,23,42,0.06), 0 8px 24px -12px rgba(15,23,42,0.10)',
        elevated:    '0 12px 40px -10px rgba(15,23,42,0.18)',
      },
      backgroundImage: {
        // Dégradés bleus identiques au mobile
        'gradient-brand':   'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
        'gradient-brand-soft': 'linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(30,64,175,0.12) 100%)',
        'gradient-balance': 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 60%, #1E3A8A 100%)',
        'gradient-cyan':    'linear-gradient(135deg, #0EA5E9 0%, #2563EB 100%)',
        'gradient-mesh': `
          radial-gradient(at 0% 0%, rgba(37, 99, 235, 0.12) 0px, transparent 50%),
          radial-gradient(at 100% 0%, rgba(59, 130, 246, 0.10) 0px, transparent 50%),
          radial-gradient(at 100% 100%, rgba(139, 92, 246, 0.08) 0px, transparent 50%)
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
