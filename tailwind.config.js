/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Couleurs reproduites de l'app mobile (ThemeContext)
        primary: {
          DEFAULT: '#2563eb',
          dark: '#1d4ed8',
          light: '#3b82f6',
        },
        // Dark theme (par défaut comme dans l'app mobile)
        bg: {
          DEFAULT: '#0f172a',
          card: '#1e293b',
          border: '#334155',
        },
        // Light theme
        bgl: {
          DEFAULT: '#f8fafc',
          card: '#ffffff',
          border: '#e2e8f0',
        },
        accent: {
          violet: '#a78bfa',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow-blue': '0 10px 30px -10px rgba(30, 58, 138, 0.5)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
        'gradient-banner': 'linear-gradient(135deg, #3b82f6 0%, #1e40af 50%, #1e3a8a 100%)',
        'gradient-button': 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
      },
    },
  },
  plugins: [],
};
