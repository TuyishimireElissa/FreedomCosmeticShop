import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ─── Warm Editorial semantic tokens ────────────────────────
        // These read the CSS variables in globals.css so colour has a
        // single source of truth. Prefer these over raw hex.
        fcs: {
          bg: 'var(--fcs-bg)',
          surface: 'var(--fcs-surface)',
          'surface-secondary': 'var(--fcs-surface-secondary)',
          text: 'var(--fcs-text)',
          'text-muted': 'var(--fcs-text-muted)',
          border: 'var(--fcs-border)',
          brand: 'var(--fcs-brand)',
          'brand-text': 'var(--fcs-brand-text)',
          'brand-hover': 'var(--fcs-brand-hover)',
          accent: 'var(--fcs-accent)',
          success: 'var(--fcs-success)',
          warning: 'var(--fcs-warning)',
          error: 'var(--fcs-error)',
          whatsapp: 'var(--fcs-whatsapp)',
          'whatsapp-hover': 'var(--fcs-whatsapp-hover)',
          // Umweto extension. brand-strong backs filled buttons: white on it
          // is 4.74:1 (AA), where plain brand is only 3.80:1.
          'brand-strong': 'var(--fcs-brand-strong)',
          'brand-strong-hover': 'var(--fcs-brand-strong-hover)',
          // BACKGROUND ONLY — these fail AA as text (2.95 / 1.95 / 1.90).
          sage: 'var(--fcs-sage)',
          wheat: 'var(--fcs-wheat)',
          sky: 'var(--fcs-sky)',
          umber: 'var(--fcs-umber)',
          // Warm Brutalism extension
          'surface-elevated': 'var(--fcs-surface-elevated)',
          'surface-muted': 'var(--fcs-surface-muted)',
          'border-subtle': 'var(--fcs-border-subtle)',
          urgent: 'var(--fcs-urgent)',
          info: 'var(--fcs-info)',
          'whatsapp-pill': 'var(--fcs-whatsapp-pill)',
          'whatsapp-pill-hover': 'var(--fcs-whatsapp-pill-hover)',
        },
        primary: {
          DEFAULT: '#B76E79',
          50: '#fdf4f5',
          100: '#fbe9ea',
          200: '#f7d3d6',
          300: '#f0adb3',
          400: '#e57d88',
          500: '#B76E79',
          600: '#a55d68',
          700: '#8a4a55',
          800: '#733f49',
          900: '#633742',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#1a1a1a',
          foreground: '#ffffff',
        },
        accent: {
          DEFAULT: '#FFD700',
          foreground: '#1a1a1a',
        },
        rwanda: {
          blue: '#20603D',
          yellow: '#FAD201',
          green: '#20603D',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        // Editorial voice. Georgia ships on every Android/iOS device, so
        // this costs 0 KB and cannot cause FOIT on a slow connection.
        display: ['Georgia', 'Times New Roman', 'serif'],
      },
      backgroundImage: {
        'fcs-sunrise': 'var(--fcs-gradient-sunrise)',
        'fcs-sunset': 'var(--fcs-gradient-sunset)',
        'fcs-botanical': 'var(--fcs-gradient-botanical)',
      },
      boxShadow: {
        'fcs-1': 'var(--fcs-shadow-1)',
        'fcs-2': 'var(--fcs-shadow-2)',
        'fcs-3': 'var(--fcs-shadow-3)',
        'fcs-4': 'var(--fcs-shadow-4)',
        'fcs-glow-rose': 'var(--fcs-glow-rose)',
        'fcs-glow-wa': 'var(--fcs-glow-wa)',
      },
      fontSize: {
        'xs-accessible': ['12px', { lineHeight: '1.5' }],
        'sm-accessible': ['14px', { lineHeight: '1.5' }],
        'base-accessible': ['16px', { lineHeight: '1.6' }],
        'mobile-label': ['12px', { lineHeight: '1.4' }],
        'mobile-body': ['14px', { lineHeight: '1.5' }],
        'mobile-content': ['16px', { lineHeight: '1.6' }],
        'mobile-heading': ['18px', { lineHeight: '1.3' }],
      },
      spacing: {
        touch: '44px',
        'touch-lg': '48px',
        'touch-xl': '56px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.3s ease-in',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      transitionTimingFunction: {
        // Warm Brutalism: snappier than --fcs-ease-silk, used for controls
        // that should feel mechanical rather than editorial.
        'fcs-snap': 'var(--fcs-transition-snap)',
      },
      borderRadius: {
        'fcs-sm': 'var(--fcs-radius-sm)',
        'fcs-md': 'var(--fcs-radius-md)',
        'fcs-lg': 'var(--fcs-radius-lg)',
        'fcs-xl': 'var(--fcs-radius-xl)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
}

export default config
