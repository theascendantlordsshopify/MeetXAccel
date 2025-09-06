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
        // Monkai Theme Color Palette
        monkai: {
          // Primary colors
          primary: {
            50: '#f8f4ff',
            100: '#f0e7ff',
            200: '#e4d3ff',
            300: '#d1b3ff',
            400: '#b885ff',
            500: '#9d4edd', // Main primary
            600: '#8b3fd1',
            700: '#7c3aed',
            800: '#6d28d9',
            900: '#5b21b6',
            950: '#4c1d95'
          },
          // Accent colors
          accent: {
            50: '#fff0f5',
            100: '#ffe3ec',
            200: '#ffccd9',
            300: '#ffa3b8',
            400: '#ff6b9d',
            500: '#f72585', // Main accent
            600: '#e91e63',
            700: '#c2185b',
            800: '#ad1457',
            900: '#880e4f',
            950: '#6a0b37'
          },
          // Background colors
          bg: {
            primary: '#0f0f0f',
            secondary: '#1a1a1a',
            tertiary: '#2a2a2a',
            card: '#1e1e1e',
            hover: '#2d2d2d'
          },
          // Text colors
          text: {
            primary: '#ffffff',
            secondary: '#b3b3b3',
            tertiary: '#808080',
            muted: '#666666'
          },
          // Border colors
          border: {
            primary: '#333333',
            secondary: '#404040',
            accent: '#9d4edd'
          },
          // Success, warning, error
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'Monaco', 'Consolas', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif']
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }]
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem'
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        glow: {
          '0%': { boxShadow: '0 0 5px #9d4edd' },
          '100%': { boxShadow: '0 0 20px #9d4edd, 0 0 30px #9d4edd' }
        }
      },
      backdropBlur: {
        xs: '2px'
      },
      boxShadow: {
        'monkai': '0 4px 14px 0 rgba(157, 78, 221, 0.15)',
        'monkai-lg': '0 10px 25px -3px rgba(157, 78, 221, 0.2)',
        'monkai-xl': '0 20px 25px -5px rgba(157, 78, 221, 0.25)'
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio')
  ],
}